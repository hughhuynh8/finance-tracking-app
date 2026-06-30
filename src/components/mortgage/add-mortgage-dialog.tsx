"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addMortgage, type ActionResult } from "@/app/mortgage/actions";
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

const initialState: ActionResult = {};

export function AddMortgageDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addMortgage,
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Loan added.");
      setOpen(false);
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
            Add Loan
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add Home Loan</DialogTitle>
            <DialogDescription>
              Record a mortgage to track repayments and project its payoff date.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="name">Loan Name</Label>
            <Input id="name" name="name" placeholder="CBA Home Loan" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="principal">Loan Amount</Label>
            <Input
              id="principal"
              name="principal"
              type="number"
              step="any"
              min="0"
              placeholder="420000"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interestRate">Interest Rate (% p.a.)</Label>
            <Input
              id="interestRate"
              name="interestRate"
              type="number"
              step="any"
              min="0"
              placeholder="6.14"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="monthlyRepayment">Scheduled Monthly Repayment</Label>
            <Input
              id="monthlyRepayment"
              name="monthlyRepayment"
              type="number"
              step="any"
              min="0"
              placeholder="2560"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="offsetBalance">Offset Account Balance (optional)</Label>
            <Input
              id="offsetBalance"
              name="offsetBalance"
              type="number"
              step="any"
              min="0"
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start Date (opening balance)</Label>
            <Input id="startDate" name="startDate" type="date" required />
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
