"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import {
  previewImport,
  commitImport,
  type ImportRow,
} from "@/app/transactions/actions";
import { categoriesFor } from "@/lib/categories";
import { UNCATEGORIZED } from "@/lib/categorize";
import { formatCurrency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Build the category options for a row's type, plus the Uncategorized fallback
// (which isn't part of the canonical lists used by the manual form).
function optionsFor(type: ImportRow["type"]): string[] {
  return [...categoriesFor(type), UNCATEGORIZED];
}

export function ImportStatementDialog() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [previewing, startPreview] = useTransition();
  const [committing, startCommit] = useTransition();

  // Step 1: parse + categorize the uploaded file, then move to the review step.
  function handlePreview(formData: FormData) {
    startPreview(async () => {
      const result = await previewImport({}, formData);
      if (result.error || !result.rows) {
        toast.error(result.error ?? "Could not read the file.");
        return;
      }
      setRows(result.rows);
      setSkipped(result.skipped ?? 0);
    });
  }

  function reset() {
    setRows(null);
    setSkipped(0);
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  function updateCategory(index: number, category: string) {
    setRows((prev) =>
      prev
        ? prev.map((r, i) => (i === index ? { ...r, category } : r))
        : prev
    );
  }

  function handleCommit() {
    if (!rows) return;
    startCommit(async () => {
      const result = await commitImport(rows);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      const dupMsg =
        result.duplicates && result.duplicates > 0
          ? ` (${result.duplicates} duplicate${
              result.duplicates === 1 ? "" : "s"
            } skipped)`
          : "";
      toast.success(`Imported ${result.imported} transaction(s)${dupMsg}.`);
      handleOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger
        render={
          <Button variant="outline">
            <Upload className="h-4 w-4" />
            Import CSV
          </Button>
        }
      />
      <DialogContent
        className={rows ? "sm:max-w-3xl" : "sm:max-w-md"}
      >
        {!rows ? (
          // --- Step 1: upload ---
          <form action={handlePreview} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Import bank statement</DialogTitle>
              <DialogDescription>
                Upload a CSV export from your bank. Categories are suggested
                automatically and you can review them before saving.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label htmlFor="file">CSV file</Label>
              <Input
                id="file"
                name="file"
                type="file"
                accept=".csv,text/csv"
                required
              />
            </div>

            <DialogFooter>
              <Button type="submit" disabled={previewing}>
                {previewing ? "Reading & categorizing…" : "Continue"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          // --- Step 2: review ---
          <div className="space-y-4">
            <DialogHeader>
              <DialogTitle>Review {rows.length} transaction(s)</DialogTitle>
              <DialogDescription>
                Adjust any AI-suggested categories, then import.
                {skipped > 0 && ` ${skipped} unrecognized row(s) were skipped.`}
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[50vh] overflow-y-auto rounded-md border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted/50 text-left text-muted-foreground">
                  <tr>
                    <th className="p-2 font-medium">Date</th>
                    <th className="p-2 font-medium">Description</th>
                    <th className="p-2 font-medium">Type</th>
                    <th className="p-2 text-right font-medium">Amount</th>
                    <th className="p-2 font-medium">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t">
                      <td className="whitespace-nowrap p-2">{r.date}</td>
                      <td className="max-w-[16rem] truncate p-2 text-muted-foreground">
                        {r.description || "—"}
                      </td>
                      <td className="p-2">
                        <span
                          className={
                            r.type === "INCOME"
                              ? "text-green-600 dark:text-green-500"
                              : "text-red-600 dark:text-red-500"
                          }
                        >
                          {r.type === "INCOME" ? "Income" : "Expense"}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-2 text-right tabular-nums">
                        {r.type === "EXPENSE" ? "-" : "+"}
                        {formatCurrency(r.amount)}
                      </td>
                      <td className="p-2">
                        <Select
                          value={r.category}
                          onValueChange={(v) =>
                            updateCategory(i, String(v ?? ""))
                          }
                        >
                          <SelectTrigger className="h-8 w-full min-w-[10rem]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {optionsFor(r.type).map((c) => (
                              <SelectItem key={c} value={c}>
                                {c}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={reset} disabled={committing}>
                Back
              </Button>
              <Button onClick={handleCommit} disabled={committing}>
                {committing ? "Importing…" : `Import ${rows.length}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
