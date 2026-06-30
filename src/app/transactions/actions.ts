"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { TRANSACTION_TYPES, type TransactionType } from "@/lib/categories";
import { parseStatement } from "@/lib/csv";
import { categorizeBatch } from "@/lib/categorize";

export type ActionResult = { ok?: boolean; error?: string };

// A row staged for import: parsed from the CSV and pre-categorized by the
// model, but not yet saved. The dialog lets the user edit `category` before
// committing.
export type ImportRow = {
  date: string; // ISO "YYYY-MM-DD"
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
};

export type PreviewResult = ActionResult & {
  rows?: ImportRow[];
  skipped?: number;
};

export type CommitResult = ActionResult & {
  imported?: number;
  duplicates?: number;
};

// Format as a local "YYYY-MM-DD" day. Using local parts (not toISOString, which
// is UTC) keeps import dates from shifting a day for non-UTC users, and matches
// how the manual add flow builds dates from "YYYY-MM-DDT00:00:00".
function toIsoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

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

// Step 1 of import: parse the uploaded CSV and ask the local model to suggest a
// category for each row. Nothing is saved here — the result is returned for the
// user to review and edit. Designed for `useActionState`.
export async function previewImport(
  _prev: PreviewResult,
  formData: FormData
): Promise<PreviewResult> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please choose a CSV file." };
  }

  const text = await file.text();
  const { rows: parsed, skipped, error } = parseStatement(text);
  if (error) return { error };
  if (parsed.length === 0) {
    return { error: "No usable transactions were found in the file." };
  }

  const categories = await categorizeBatch(
    parsed.map((r) => ({ description: r.description, type: r.type }))
  );

  const rows: ImportRow[] = parsed.map((r, i) => ({
    date: toIsoDay(r.date),
    description: r.description,
    amount: r.amount,
    type: r.type,
    category: categories[i],
  }));

  return { ok: true, rows, skipped };
}

// Step 2 of import: persist the reviewed rows. Skips rows that duplicate an
// existing transaction (same day, type, amount, and description) so re-importing
// the same statement is safe.
export async function commitImport(rows: ImportRow[]): Promise<CommitResult> {
  const clean = rows.filter(
    (r) =>
      TRANSACTION_TYPES.includes(r.type) &&
      Number.isFinite(r.amount) &&
      r.amount > 0 &&
      r.category.trim() !== ""
  );
  if (clean.length === 0) {
    return { error: "There are no valid rows to import." };
  }

  const existing = await prisma.transaction.findMany({
    select: { type: true, amount: true, date: true, description: true },
  });
  const seen = new Set(
    existing.map(
      (t) =>
        `${t.type}|${t.amount}|${toIsoDay(t.date)}|${t.description ?? ""}`
    )
  );

  const toCreate: {
    type: string;
    amount: number;
    date: Date;
    category: string;
    description: string | null;
  }[] = [];

  for (const r of clean) {
    const description = r.description.trim();
    const key = `${r.type}|${r.amount}|${r.date}|${description}`;
    if (seen.has(key)) continue;
    seen.add(key); // also dedupe within the same import batch
    toCreate.push({
      type: r.type,
      amount: r.amount,
      date: new Date(`${r.date}T00:00:00`),
      category: r.category.trim(),
      description: description || null,
    });
  }

  if (toCreate.length > 0) {
    await prisma.transaction.createMany({ data: toCreate });
    revalidatePath("/transactions");
    revalidatePath("/");
  }

  return {
    ok: true,
    imported: toCreate.length,
    duplicates: clean.length - toCreate.length,
  };
}

export async function deleteTransaction(id: string): Promise<void> {
  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/transactions");
  revalidatePath("/");
}
