"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import YahooFinance from "yahoo-finance2";
import { prisma } from "@/lib/prisma";

// yahoo-finance2 v3 requires an instance (the singleton API was removed).
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export type ActionResult = { ok?: boolean; error?: string };

export type PortfolioRow = {
  id: string;
  ticker: string;
  shares: number;
  averagePrice: number | null;
  currentPrice: number;
  totalValue: number;
  priceUnavailable: boolean;
};

/** Returns the latest regular-market price, or null if it can't be resolved. */
async function priceFor(ticker: string): Promise<number | null> {
  try {
    const quote = (await yahooFinance.quote(ticker)) as {
      regularMarketPrice?: number;
    } | null;
    const price = quote?.regularMarketPrice;
    if (typeof price === "number" && Number.isFinite(price)) return price;
  } catch {
    // Invalid ticker or network/API failure.
  }
  return null;
}

/** Best-effort "did you mean" suggestion for an unrecognized symbol. */
async function suggestSymbol(query: string): Promise<string | undefined> {
  try {
    const res = (await yahooFinance.search(query)) as {
      quotes?: Array<{ symbol?: string; isYahooFinance?: boolean }>;
    };
    return res.quotes?.find((q) => q.isYahooFinance && q.symbol)?.symbol;
  } catch {
    return undefined;
  }
}

/** Validates a symbol has a live price; otherwise returns a helpful error. */
async function validateTicker(ticker: string): Promise<ActionResult> {
  if ((await priceFor(ticker)) !== null) return { ok: true };
  const suggestion = await suggestSymbol(ticker);
  return {
    error: suggestion
      ? `No price found for ${ticker}. Did you mean ${suggestion}? (Non-US tickers need an exchange suffix, e.g. NDQ.AX.)`
      : `No price found for ${ticker}. Check the symbol — non-US tickers need an exchange suffix, e.g. NDQ.AX.`,
  };
}

export async function addPortfolioItem(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const ticker = String(formData.get("ticker") ?? "")
    .trim()
    .toUpperCase();
  const shares = Number(formData.get("shares"));
  const averagePriceRaw = String(formData.get("averagePrice") ?? "").trim();

  if (!ticker) return { error: "Ticker is required." };
  if (!Number.isFinite(shares) || shares <= 0) {
    return { error: "Shares must be a positive number." };
  }
  let averagePrice: number | null = null;
  if (averagePriceRaw) {
    const parsed = Number(averagePriceRaw);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { error: "Average price must be a non-negative number." };
    }
    averagePrice = parsed;
  }

  const valid = await validateTicker(ticker);
  if (valid.error) return valid;

  try {
    await prisma.portfolioItem.create({
      data: { ticker, shares, averagePrice },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { error: `${ticker} is already in your portfolio.` };
    }
    throw e;
  }

  revalidatePath("/portfolio");
  revalidatePath("/");
  return { ok: true };
}

export async function updateHolding(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const ticker = String(formData.get("ticker") ?? "")
    .trim()
    .toUpperCase();
  const shares = Number(formData.get("shares"));

  if (!id) return { error: "Missing holding id." };
  if (!ticker) return { error: "Ticker is required." };
  if (!Number.isFinite(shares) || shares <= 0) {
    return { error: "Shares must be a positive number." };
  }

  const valid = await validateTicker(ticker);
  if (valid.error) return valid;

  try {
    await prisma.portfolioItem.update({
      where: { id },
      data: { ticker, shares },
    });
  } catch (e) {
    if (
      e instanceof Prisma.PrismaClientKnownRequestError &&
      e.code === "P2002"
    ) {
      return { error: `${ticker} is already in your portfolio.` };
    }
    throw e;
  }

  revalidatePath("/portfolio");
  revalidatePath("/");
  return { ok: true };
}

export async function deletePortfolioItem(id: string): Promise<void> {
  await prisma.portfolioItem.delete({ where: { id } });
  revalidatePath("/portfolio");
  revalidatePath("/");
}

/**
 * Fetches every holding and enriches it with the latest regular-market price.
 * Invalid tickers (or any fetch failure) gracefully resolve to a $0 price
 * instead of crashing the page.
 */
export async function getPortfolioWithPrices(): Promise<PortfolioRow[]> {
  const items = await prisma.portfolioItem.findMany({
    orderBy: { ticker: "asc" },
  });

  return Promise.all(
    items.map(async (item) => {
      const price = await priceFor(item.ticker);
      const currentPrice = price ?? 0;

      return {
        id: item.id,
        ticker: item.ticker,
        shares: item.shares,
        averagePrice: item.averagePrice,
        currentPrice,
        totalValue: item.shares * currentPrice,
        priceUnavailable: price === null,
      };
    })
  );
}
