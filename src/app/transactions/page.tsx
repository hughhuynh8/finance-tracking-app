import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/format";
import { AddTransactionDialog } from "@/components/transactions/add-transaction-dialog";
import { DeleteTransactionButton } from "@/components/transactions/delete-transaction-button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default async function TransactionsPage() {
  const transactions = await prisma.transaction.findMany({
    orderBy: { date: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Income &amp; Expenses
        </h1>
        <AddTransactionDialog />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  No transactions yet. Add your first one.
                </TableCell>
              </TableRow>
            ) : (
              transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell>{formatDate(t.date)}</TableCell>
                  <TableCell>
                    <span
                      className={
                        t.type === "INCOME"
                          ? "text-green-600 dark:text-green-500"
                          : "text-red-600 dark:text-red-500"
                      }
                    >
                      {t.type === "INCOME" ? "Income" : "Expense"}
                    </span>
                  </TableCell>
                  <TableCell>{t.category}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.description ?? "—"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.type === "EXPENSE" ? "-" : "+"}
                    {formatCurrency(t.amount)}
                  </TableCell>
                  <TableCell className="text-right">
                    <DeleteTransactionButton id={t.id} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
