"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TRANSACTION_TYPES, type TransactionType } from "@/lib/categories";

export type ActionResult = { ok?: boolean; error?: string };

export async function addTransaction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const type = String(formData.get("type") ?? "");
  const amountRaw = String(formData.get("amount") ?? "");
  const dateRaw = String(formData.get("date") ?? "");
  const category = String(formData.get("category") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!TRANSACTION_TYPES.includes(type as TransactionType)) {
    return { error: "Please select a valid type." };
  }
  const amount = Number(amountRaw);
  if (!Number.isFinite(amount) || amount <= 0) {
    return { error: "Amount must be a positive number." };
  }
  if (!category) {
    return { error: "Please select a category." };
  }

  // dateRaw is "YYYY-MM-DD" from the date input; default to now if empty.
  const date = dateRaw ? new Date(`${dateRaw}T00:00:00`) : new Date();
  if (Number.isNaN(date.getTime())) {
    return { error: "Please enter a valid date." };
  }

  await prisma.transaction.create({
    data: {
      type,
      amount,
      date,
      category,
      description: description || null,
    },
  });

  revalidatePath("/transactions");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteTransaction(id: string): Promise<void> {
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/transactions");
  revalidatePath("/");
}
