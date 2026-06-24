// Default transaction categories (spec §4)

export const INCOME_CATEGORIES = [
  "Salary",
  "Freelance",
  "Dividends",
  "Investments",
  "Refunds",
  "Other",
] as const;

export const EXPENSE_CATEGORIES = [
  "Rent/Mortgage",
  "Groceries",
  "Dining Out",
  "Subscriptions",
  "Utilities",
  "Transportation",
  "Health",
  "Entertainment",
  "Miscellaneous",
] as const;

export const TRANSACTION_TYPES = ["INCOME", "EXPENSE"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export function categoriesFor(type: TransactionType): readonly string[] {
  return type === "INCOME" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}
