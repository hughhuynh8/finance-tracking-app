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

export async function updateShares(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const id = String(formData.get("id") ?? "");
  const shares = Number(formData.get("shares"));

  if (!id) return { error: "Missing holding id." };
  if (!Number.isFinite(shares) || shares <= 0) {
    return { error: "Shares must be a positive number." };
  }

  await prisma.portfolioItem.update({ where: { id }, data: { shares } });

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
      let currentPrice = 0;
      let priceUnavailable = true;
      try {
        const quote = (await yahooFinance.quote(item.ticker)) as {
          regularMarketPrice?: number;
        } | null;
        const price = quote?.regularMarketPrice;
        if (typeof price === "number" && Number.isFinite(price)) {
          currentPrice = price;
          priceUnavailable = false;
        }
      } catch {
        // Invalid ticker or network/API failure -> leave price at 0.
      }

      return {
        id: item.id,
        ticker: item.ticker,
        shares: item.shares,
        averagePrice: item.averagePrice,
        currentPrice,
        totalValue: item.shares * currentPrice,
        priceUnavailable,
      };
    })
  );
}
