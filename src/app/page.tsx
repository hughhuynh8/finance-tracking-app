import Link from "next/link";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  LineChart,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPortfolioWithPrices } from "@/app/portfolio/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Aggregates live prices and the current month; never prerender statically.
export const dynamic = "force-dynamic";

async function getMonthlyTotal(type: "INCOME" | "EXPENSE", from: Date, to: Date) {
  const result = await prisma.transaction.aggregate({
    _sum: { amount: true },
    where: { type, date: { gte: from, lt: to } },
  });
  return result._sum.amount ?? 0;
}

export default async function DashboardPage() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [income, expenses, portfolio, recent] = await Promise.all([
    getMonthlyTotal("INCOME", monthStart, monthEnd),
    getMonthlyTotal("EXPENSE", monthStart, monthEnd),
    getPortfolioWithPrices(),
    prisma.transaction.findMany({ orderBy: { date: "desc" }, take: 5 }),
  ]);

  const net = income - expenses;
  const portfolioValue = portfolio.reduce((sum, r) => sum + r.totalValue, 0);

  const cards = [
    {
      title: "Total Income (This Month)",
      value: formatCurrency(income),
      icon: ArrowUpCircle,
      tone: "text-green-600 dark:text-green-500",
    },
    {
      title: "Total Expenses (This Month)",
      value: formatCurrency(expenses),
      icon: ArrowDownCircle,
      tone: "text-red-600 dark:text-red-500",
    },
    {
      title: "Net Cash Flow",
      value: formatCurrency(net),
      icon: Wallet,
      tone:
        net >= 0
          ? "text-green-600 dark:text-green-500"
          : "text-red-600 dark:text-red-500",
    },
    {
      title: "Total Portfolio Value",
      value: formatCurrency(portfolioValue),
      icon: LineChart,
      tone: "text-foreground",
    },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ title, value, icon: Icon, tone }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className={`h-4 w-4 ${tone}`} />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-semibold tabular-nums ${tone}`}>
                {value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">
            Recent Activity
          </h2>
          <Link
            href="/transactions"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            View all
          </Link>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recent.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="h-24 text-center text-muted-foreground"
                  >
                    No transactions yet.
                  </TableCell>
                </TableRow>
              ) : (
                recent.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{formatDate(t.date)}</TableCell>
                    <TableCell>{t.category}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.description ?? "—"}
                    </TableCell>
                    <TableCell
                      className={`text-right tabular-nums ${
                        t.type === "INCOME"
                          ? "text-green-600 dark:text-green-500"
                          : "text-red-600 dark:text-red-500"
                      }`}
                    >
                      {t.type === "EXPENSE" ? "-" : "+"}
                      {formatCurrency(t.amount)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
