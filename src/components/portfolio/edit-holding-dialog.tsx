"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateHolding, type ActionResult } from "@/app/portfolio/actions";
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

export function EditHoldingDialog({
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
    updateHolding,
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Holding updated.");
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Edit holding">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-sm">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <DialogHeader>
            <DialogTitle>Edit Holding — {ticker}</DialogTitle>
            <DialogDescription>
              Update the ticker symbol or number of shares.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor={`ticker-${id}`}>Ticker Symbol</Label>
            <Input
              id={`ticker-${id}`}
              name="ticker"
              defaultValue={ticker}
              autoCapitalize="characters"
              className="uppercase"
              onChange={(e) => {
                e.currentTarget.value = e.currentTarget.value.toUpperCase();
              }}
              required
            />
          </div>

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
