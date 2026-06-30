"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { computeAmortization, type Amortization } from "@/lib/mortgage";

export type ActionResult = { ok?: boolean; error?: string };

export type MortgageWithAmortization = {
  id: string;
  name: string;
  principal: number;
  interestRate: number;
  monthlyRepayment: number;
  startDate: Date;
  repayments: { id: string; date: Date; amount: number }[];
  amortization: Amortization;
};

// Parse a date-only "YYYY-MM-DD" form value into a local midnight Date. Matches
// the rest of the app, which stores day-granular dates at local 00:00.
function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function addMortgage(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const principal = Number(formData.get("principal"));
  const interestRate = Number(formData.get("interestRate"));
  const monthlyRepayment = Number(formData.get("monthlyRepayment"));
  const startDate = parseDay(String(formData.get("startDate") ?? ""));

  if (!name) return { error: "Loan name is required." };
  if (!Number.isFinite(principal) || principal <= 0) {
    return { error: "Loan amount must be a positive number." };
  }
  if (!Number.isFinite(interestRate) || interestRate < 0) {
    return { error: "Interest rate must be a non-negative number." };
  }
  if (!Number.isFinite(monthlyRepayment) || monthlyRepayment <= 0) {
    return { error: "Monthly repayment must be a positive number." };
  }
  if (!startDate) return { error: "A valid start date is required." };

  await prisma.mortgage.create({
    data: { name, principal, interestRate, monthlyRepayment, startDate },
  });

  revalidatePath("/mortgage");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteMortgage(id: string): Promise<void> {
  // Repayments cascade-delete via the schema relation.
  await prisma.mortgage.delete({ where: { id } });
  revalidatePath("/mortgage");
  revalidatePath("/");
}

export async function addRepayment(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const mortgageId = String(formData.get("mortgageId") ?? "");
  const amount = Number(formData.get("amount"));
  const date = parseDay(String(formData.get("date") ?? ""));

  if (!mortgageId) return { error: "Missing loan id." };
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Repayment amount must be a positive number." };
  }
  if (!date) return { error: "A valid repayment date is required." };

  await prisma.mortgageRepayment.create({
    data: { mortgageId, amount, date },
  });

  revalidatePath("/mortgage");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteRepayment(id: string): Promise<void> {
  await prisma.mortgageRepayment.delete({ where: { id } });
  revalidatePath("/mortgage");
  revalidatePath("/");
}

// Loads every mortgage with its repayments and the derived amortization curve /
// payoff projection, ready for the page to render.
export async function getMortgages(): Promise<MortgageWithAmortization[]> {
  const mortgages = await prisma.mortgage.findMany({
    orderBy: { createdAt: "asc" },
    include: { repayments: { orderBy: { date: "asc" } } },
  });

  return mortgages.map((m) => ({
    id: m.id,
    name: m.name,
    principal: m.principal,
    interestRate: m.interestRate,
    monthlyRepayment: m.monthlyRepayment,
    startDate: m.startDate,
    repayments: m.repayments.map((r) => ({
      id: r.id,
      date: r.date,
      amount: r.amount,
    })),
    amortization: computeAmortization({
      principal: m.principal,
      interestRate: m.interestRate,
      monthlyRepayment: m.monthlyRepayment,
      startDate: m.startDate,
      repayments: m.repayments.map((r) => ({ date: r.date, amount: r.amount })),
    }),
  }));
}
