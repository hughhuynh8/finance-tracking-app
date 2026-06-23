"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addTransaction, type ActionResult } from "@/app/transactions/actions";
import { categoriesFor, type TransactionType } from "@/lib/categories";
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

const initialState: ActionResult = {};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AddTransactionDialog() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<TransactionType>("EXPENSE");
  const [state, formAction, pending] = useActionState(
    addTransaction,
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Transaction added.");
      setOpen(false);
      setType("EXPENSE");
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button>
            <Plus className="h-4 w-4" />
            Add Transaction
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Record a new income or expense entry.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select
              name="type"
              value={type}
              onValueChange={(v) => setType(v as TransactionType)}
            >
              <SelectTrigger id="type" className="w-full">
                <SelectValue>
                  {(v: string) => (v === "INCOME" ? "Income" : "Expense")}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INCOME">Income</SelectItem>
                <SelectItem value="EXPENSE">Expense</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" defaultValue={today()} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            {/* key forces a fresh Select (and clears prior value) when type changes */}
            <Select key={type} name="category">
              <SelectTrigger id="category" className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categoriesFor(type).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              name="description"
              placeholder="e.g. Monthly rent"
            />
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
