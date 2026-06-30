"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addRepayment, type ActionResult } from "@/app/mortgage/actions";
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

export function AddRepaymentDialog({
  mortgageId,
  mortgageName,
}: {
  mortgageId: string;
  mortgageName: string;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addRepayment,
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Repayment recorded.");
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <Plus className="h-4 w-4" />
            Add Repayment
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="mortgageId" value={mortgageId} />
          <DialogHeader>
            <DialogTitle>Record Repayment</DialogTitle>
            <DialogDescription>
              Log a repayment against {mortgageName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              name="amount"
              type="number"
              step="any"
              min="0"
              placeholder="2560"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required />
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
