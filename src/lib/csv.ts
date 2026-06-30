// Best-effort bank-statement CSV parsing.
//
// Banks export wildly different CSV shapes, so we auto-detect the relevant
// columns by header name and support both conventions for the amount:
//   1. a single signed "Amount" column (negative = money out), or
//   2. separate Debit/Credit (a.k.a. Withdrawal/Deposit) columns.
// Parsing is forgiving: rows that can't be understood are skipped rather than
// throwing, so a single odd line never breaks an import.

import type { TransactionType } from "@/lib/categories";

export type ParsedRow = {
  date: Date;
  description: string;
  amount: number; // always positive; sign is captured by `type`
  type: TransactionType;
};

// --- Low-level CSV tokenizer (handles quoted fields, escaped quotes, CRLF) ---
function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++; // skip the escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      // Commit the row on a line break; swallow the \n of a \r\n pair.
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  // Trailing field/row with no terminating newline.
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

function findColumn(headers: string[], pattern: RegExp): number {
  return headers.findIndex((h) => pattern.test(h));
}

// Parse common bank date formats: ISO (YYYY-MM-DD) and day-first DD/MM/YYYY
// (the dominant non-US convention). Returns null if unrecognized.
function parseDate(raw: string): Date | null {
  const s = raw.trim();
  if (!s) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) {
    const d = new Date(`${iso[1]}-${iso[2]}-${iso[3]}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const dmy = /^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})/.exec(s);
  if (dmy) {
    const [, day, month, rawYear] = dmy;
    const year = rawYear.length === 2 ? `20${rawYear}` : rawYear;
    const d = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(d.getTime()) ? null : d;
  }

  const fallback = new Date(s);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

// Strip currency symbols, thousands separators, and parenthesised negatives
// ("(45.20)" → -45.20) before parsing.
function parseAmount(raw: string): number | null {
  let s = raw.trim();
  if (!s) return null;
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  s = s.replace(/[^0-9.\-]/g, "");
  if (s === "" || s === "-") return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return negative ? -Math.abs(n) : n;
}

export type ParseResult = {
  rows: ParsedRow[];
  skipped: number;
  error?: string;
};

export function parseStatement(text: string): ParseResult {
  const table = parseCsvRows(text);
  if (table.length < 2) {
    return { rows: [], skipped: 0, error: "No data rows found in the file." };
  }

  const headers = table[0].map((h) => h.trim());
  const dateCol = findColumn(headers, /date/i);
  // Note: no bare "transaction" token here — it would wrongly match columns
  // like "Transaction Date" / "Transaction Type" before the real description.
  const descCol = findColumn(
    headers,
    /description|memo|details|narration|payee|reference/i
  );
  const amountCol = findColumn(headers, /^amount|amount$/i);
  const debitCol = findColumn(headers, /debit|withdrawal|paid out|money out/i);
  const creditCol = findColumn(headers, /credit|deposit|paid in|money in/i);

  if (dateCol === -1) {
    return { rows: [], skipped: 0, error: "Could not find a Date column." };
  }
  if (amountCol === -1 && debitCol === -1 && creditCol === -1) {
    return {
      rows: [],
      skipped: 0,
      error: "Could not find an Amount, Debit, or Credit column.",
    };
  }

  const rows: ParsedRow[] = [];
  let skipped = 0;

  for (let i = 1; i < table.length; i++) {
    const cells = table[i];
    const date = parseDate(cells[dateCol] ?? "");
    if (!date) {
      skipped++;
      continue;
    }
    // Collapse the runs of padding banks insert into narration fields
    // ("KICKS MELBOURNE          MELBOURNE    VI" → single spaces) for cleaner
    // display and better categorization.
    const description =
      descCol !== -1
        ? (cells[descCol] ?? "").trim().replace(/\s+/g, " ")
        : "";

    let signed: number | null = null;
    if (amountCol !== -1) {
      signed = parseAmount(cells[amountCol] ?? "");
    } else {
      const debit = debitCol !== -1 ? parseAmount(cells[debitCol] ?? "") : null;
      const credit =
        creditCol !== -1 ? parseAmount(cells[creditCol] ?? "") : null;
      if (debit && debit !== 0) signed = -Math.abs(debit);
      else if (credit && credit !== 0) signed = Math.abs(credit);
    }

    if (signed === null || signed === 0) {
      skipped++;
      continue;
    }

    rows.push({
      date,
      description,
      amount: Math.abs(signed),
      type: signed < 0 ? "EXPENSE" : "INCOME",
    });
  }

  return { rows, skipped };
}
