import { getPortfolioWithPrices } from "@/app/portfolio/actions";
import { formatCurrency } from "@/lib/format";
import { AddHoldingDialog } from "@/components/portfolio/add-holding-dialog";
import { EditHoldingDialog } from "@/components/portfolio/edit-holding-dialog";
import { DeleteHoldingButton } from "@/components/portfolio/delete-holding-button";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Live prices are fetched per request; never prerender statically.
export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const rows = await getPortfolioWithPrices();
  const total = rows.reduce((sum, r) => sum + r.totalValue, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">
          Stock Portfolio
        </h1>
        <AddHoldingDialog />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ticker</TableHead>
              <TableHead className="text-right">Shares Owned</TableHead>
              <TableHead className="text-right">Current Price</TableHead>
              <TableHead className="text-right">Total Value</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-24 text-center text-muted-foreground"
                >
                  No holdings yet. Add your first one.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.ticker}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.shares}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {r.priceUnavailable ? (
                      <span className="text-muted-foreground">N/A</span>
                    ) : (
                      formatCurrency(r.currentPrice)
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrency(r.totalValue)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <EditHoldingDialog
                        id={r.id}
                        ticker={r.ticker}
                        shares={r.shares}
                      />
                      <DeleteHoldingButton id={r.id} />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow>
                <TableCell colSpan={3}>Total Portfolio Value</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">
                  {formatCurrency(total)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
