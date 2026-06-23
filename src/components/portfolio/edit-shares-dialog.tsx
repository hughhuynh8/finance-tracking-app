"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateShares, type ActionResult } from "@/app/portfolio/actions";
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

export function EditSharesDialog({
  id,
  ticker,
  shares,
}: {
  id: string;
  ticker: string;
  shares: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateShares,
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Shares updated.");
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Edit shares">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <DialogHeader>
            <DialogTitle>Edit Shares — {ticker}</DialogTitle>
            <DialogDescription>
              Update the number of shares you own.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`shares-${id}`}>Number of Shares</Label>
            <Input
              id={`shares-${id}`}
              name="shares"
              type="number"
              step="any"
              min="0"
              defaultValue={shares}
              required
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
