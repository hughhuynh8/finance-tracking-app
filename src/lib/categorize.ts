// Best-effort transaction categorization via a local Ollama model.
//
// Mirrors the price-fetching convention (`priceFor`): this never throws. If
// Ollama isn't running, the model misbehaves, or anything else goes wrong, every
// item falls back to UNCATEGORIZED so an import always succeeds. Categories are
// constrained to the canonical lists in `src/lib/categories.ts`; anything the
// model returns that isn't on the list is treated as uncategorized.

import {
  INCOME_CATEGORIES,
  EXPENSE_CATEGORIES,
  type TransactionType,
} from "@/lib/categories";

export const UNCATEGORIZED = "Uncategorized";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3";

export type CategorizeItem = {
  description: string;
  type: TransactionType;
};

function categoriesFor(type: TransactionType): readonly string[] {
  return type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

// Deterministic merchant rules, checked before falling back to the LLM. Keep
// rules high-confidence — anything genuinely ambiguous (e.g. plain "AMAZON",
// which is both shopping and Prime) is deliberately omitted so the model can
// judge it. First match wins, so order matters (specific before catch-all).
type Rule = { re: RegExp; category: string };

const EXPENSE_RULES: Rule[] = [
  // Groceries
  { re: /\b(COLES|WOOLWORTHS|ALDI|IGA|FOODWORKS|COSTCO|REDDY EXPRESS)\b/, category: "Groceries" },
  // Transportation — fuel, tolls, transit
  { re: /\b(BP|SHELL|CALTEX|AMPOL|7-ELEVEN|UNITED PETROLEUM|LINKT|MYKI|UBER|DIDI|SMARTE CARTE|PARKING|COPP)\b/, category: "Transportation" },
  // Travel — airlines and booking sites print trailing ref codes with no word
  // boundary (e.g. "JETSTARBJL1VV"), so these match on a prefix only.
  { re: /\b(JETSTAR|VIETJET|QANTAS|VIRGIN AUSTRALIA|TRIP\.COM|TRAVELOKA|AGODA|BOOKING\.COM|EXPEDIA)/, category: "Transportation" },
  // Utilities — power, water, mobile, internet
  { re: /\b(RED ENERGY|AGL|ORIGIN ENERGY|ENERGY AUSTRALIA|SE WATER|SOUTH EAST WATER|YARRA VALLEY WATER|AMAYSIM|TANGERINE|TELSTRA|OPTUS|VODAFONE|BELONG)\b/, category: "Utilities" },
  // Subscriptions — streaming, software, recurring digital
  { re: /\b(ANTHROPIC|CLAUDE|KINDLE|NETFLIX|SPOTIFY|DISNEY|YOUTUBE|LIGHTROOM|ADOBE|GOOGLE|APPLE\.COM|MICROSOFT|OPENAI|AMAZON PRIME|VIBER)\b/, category: "Subscriptions" },
  // Health — pharmacy, insurance, medical
  { re: /\b(CHEMIST WAREHOUSE|CWH|PHARMACY|PRICELINE|BUPA|MEDIBANK|DENTAL|MEDICAL|TERRY WHITE)\b/, category: "Health" },
  // Entertainment — leisure venues, sport, recreation
  // GOLF often has no leading boundary in merchant names ("…BRDRGOLF"), so it
  // matches as a suffix; the rest keep word boundaries.
  { re: /(GOLF\b|\b(WATER SKI|BOWL|CINEMA|HOYTS|VILLAGE CINEMA|LEISURE|STRIKE & ARCHIE|THE BATHS)\b)/, category: "Entertainment" },
  // Dining Out — fast food, cafes, restaurants. "SQ *" / "SMP*" are Square/
  // SmartPay terminals, used almost entirely by food vendors on a personal card.
  { re: /\b(MCDONALD|KFC|HUNGRY JACK|SUBWAY|STARBUCKS|GRILL|GRILLD|NANDO|DOMINO|PIZZA|BURGER|SUSHI|CAFE|KAFE|COFFEE|DONUT|RESTAURANT|BEER GARDE|BAR\b)/, category: "Dining Out" },
  { re: /\b(SQ|SMP)\s*\*/, category: "Dining Out" },
  // General retail / household / online — the catch-all "Miscellaneous", matching
  // how the model itself tends to classify these. Kept last so specifics win.
  { re: /\b(AMAZON|IKEA|BUNNINGS|KMART|TARGET|BIG W|OFFICEWORKS|HARVEY NORMAN|JB HI-FI|TK MAXX|KOGAN|SHOPBACK|CATCH\.COM|BUDGET DIRECT)\b/, category: "Miscellaneous" },
];

// Income lines are mostly the user's own card payments/transfers plus the credit
// side of travel reversals, so a couple of rules cover the bulk.
const INCOME_RULES: Rule[] = [
  // Credits from travel vendors are refunds/reversals.
  { re: /\b(JETSTAR|VIETJET|QANTAS|TRIP\.COM|TRAVELOKA|AGODA|EXPEDIA|KOGAN|BUPA)/, category: "Refunds" },
  // Account transfers in (e.g. paying the card from a linked account).
  { re: /\bTRANSFER\b.*\bFROM\b/, category: "Other" },
];

// Try to assign a category from the deterministic rules. Returns null when no
// rule matches (the caller then defers to the LLM).
export function keywordCategory(
  description: string,
  type: TransactionType
): string | null {
  const rules = type === "INCOME" ? INCOME_RULES : EXPENSE_RULES;
  const haystack = description.toUpperCase();
  for (const rule of rules) {
    if (rule.re.test(haystack)) return rule.category;
  }
  return null;
}

function buildPrompt(items: CategorizeItem[]): string {
  const lines = items.map((it, i) => {
    const options = categoriesFor(it.type).join(", ");
    const desc = it.description || "(no description)";
    return `${i}. [${it.type}] "${desc}" — choose one of: ${options}`;
  });
  return (
    `You are a bank-transaction categorizer. For each numbered transaction, pick ` +
    `the single best category from ONLY the options listed for that line. ` +
    `If unsure, use "${UNCATEGORIZED}".\n\n` +
    `Transactions:\n${lines.join("\n")}\n\n` +
    `Reply with ONLY a JSON object of the form {"categories": ["...", "..."]} ` +
    `where the array has exactly ${items.length} entries, in order.`
  );
}

// Validate the model's answer for one item against its allowed categories.
function normalize(value: unknown, type: TransactionType): string {
  if (typeof value !== "string") return UNCATEGORIZED;
  const match = categoriesFor(type).find(
    (c) => c.toLowerCase() === value.trim().toLowerCase()
  );
  return match ?? UNCATEGORIZED;
}

// Process at most this many rows per Ollama call. Keeps each prompt well inside
// llama3's context window (so results stay aligned) and lets a single bad chunk
// fail to "Uncategorized" without sinking the whole import.
const CHUNK_SIZE = 20;

/**
 * Categorize a batch of transactions. A deterministic keyword pre-pass handles
 * obvious merchants instantly; only the rows it can't classify are sent to the
 * LLM (in bounded chunks). Results are aligned 1:1 with `items`. Always
 * resolves, never rejects.
 */
export async function categorizeBatch(
  items: CategorizeItem[]
): Promise<string[]> {
  const result: (string | null)[] = items.map((it) =>
    keywordCategory(it.description, it.type)
  );

  // Gather the rows the keyword pass couldn't place, preserving their indices.
  const pending: { index: number; item: CategorizeItem }[] = [];
  result.forEach((cat, i) => {
    if (cat === null) pending.push({ index: i, item: items[i] });
  });

  for (let i = 0; i < pending.length; i += CHUNK_SIZE) {
    const slice = pending.slice(i, i + CHUNK_SIZE);
    const cats = await categorizeChunk(slice.map((p) => p.item));
    slice.forEach((p, j) => {
      result[p.index] = cats[j];
    });
  }

  return result.map((cat) => cat ?? UNCATEGORIZED);
}

// One Ollama call for a single chunk. Returns categories aligned 1:1 with
// `items`; any failure maps every entry in the chunk to UNCATEGORIZED.
async function categorizeChunk(items: CategorizeItem[]): Promise<string[]> {
  if (items.length === 0) return [];

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        format: "json",
        options: { temperature: 0 },
        messages: [{ role: "user", content: buildPrompt(items) }],
      }),
    });

    if (!res.ok) return items.map(() => UNCATEGORIZED);

    const data = (await res.json()) as { message?: { content?: string } };
    const content = data.message?.content ?? "{}";
    const parsed = JSON.parse(content) as { categories?: unknown };
    const categories = Array.isArray(parsed.categories)
      ? parsed.categories
      : [];

    return items.map((it, i) => normalize(categories[i], it.type));
  } catch {
    return items.map(() => UNCATEGORIZED);
  }
}