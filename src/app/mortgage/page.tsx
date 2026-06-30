import { getMortgages } from "@/app/mortgage/actions";
import { formatCurrency, formatDate } from "@/lib/format";
import { formatMonths } from "@/lib/mortgage";
import { AddMortgageDialog } from "@/components/mortgage/add-mortgage-dialog";
import { AddRepaymentDialog } from "@/components/mortgage/add-repayment-dialog";
import { EditOffsetDialog } from "@/components/mortgage/edit-offset-dialog";
import { DeleteMortgageButton } from "@/components/mortgage/delete-mortgage-button";
import { DeleteRepaymentButton } from "@/components/mortgage/delete-repayment-button";
import { BalanceChart } from "@/components/mortgage/balance-chart";
import {
  Card,
  CardContent,
  CardDescription,
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

// A labelled figure used in the per-loan summary strip.
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

export default async function MortgagePage() {
  const mortgages = await getMortgages();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Home Loans</h1>
        <AddMortgageDialog />
      </div>

      {mortgages.length === 0 ? (
        <div className="rounded-md border p-12 text-center text-muted-foreground">
          No home loans yet. Add one to start tracking repayments.
        </div>
      ) : (
        mortgages.map((m) => {
          const a = m.amortization;
          return (
            <Card key={m.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{m.name}</CardTitle>
                    <CardDescription>
                      {formatCurrency(m.principal)} at {m.interestRate}% p.a. ·{" "}
                      {formatCurrency(m.monthlyRepayment)}/mo · offset{" "}
                      {formatCurrency(m.offsetBalance)} · opened{" "}
                      {formatDate(m.startDate)}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-1">
                    <EditOffsetDialog
                      id={m.id}
                      offsetBalance={m.offsetBalance}
                    />
                    <DeleteMortgageButton id={m.id} />
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <Stat
                    label="Current Balance"
                    value={formatCurrency(a.currentBalance)}
                  />
                  <Stat
                    label="Est. Payoff Date"
                    value={
                      a.paidOff
                        ? "Paid off"
                        : a.neverPaysOff
                          ? "Never"
                          : a.payoffDate
                            ? formatDate(a.payoffDate)
                            : "—"
                    }
                  />
                  <Stat
                    label="Time Remaining"
                    value={
                      a.paidOff
                        ? "0 mo"
                        : a.neverPaysOff || a.monthsRemaining === null
                          ? "—"
                          : formatMonths(a.monthsRemaining)
                    }
                  />
                  <Stat
                    label="Interest Remaining"
                    value={
                      a.neverPaysOff
                        ? "—"
                        : formatCurrency(a.totalInterestRemaining)
                    }
                  />
                </dl>

                {a.neverPaysOff && (
                  <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                    The scheduled repayment doesn&apos;t cover the monthly
                    interest, so the balance never reduces. Increase the monthly
                    repayment to see a payoff projection.
                  </p>
                )}

                <BalanceChart actual={a.actual} projected={a.projected} />

                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Repayments</h3>
                  <AddRepaymentDialog mortgageId={m.id} mortgageName={m.name} />
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {m.repayments.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={3}
                            className="h-20 text-center text-muted-foreground"
                          >
                            No repayments logged yet.
                          </TableCell>
                        </TableRow>
                      ) : (
                        // Newest first for display; the math already sorted by date.
                        [...m.repayments]
                          .sort((x, y) => y.date.getTime() - x.date.getTime())
                          .map((r) => (
                            <TableRow key={r.id}>
                              <TableCell>{formatDate(r.date)}</TableCell>
                              <TableCell className="text-right tabular-nums">
                                {formatCurrency(r.amount)}
                              </TableCell>
                              <TableCell>
                                <div className="flex justify-end">
                                  <DeleteRepaymentButton id={r.id} />
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
