"use client";

import { useActionState, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { addPortfolioItem, type ActionResult } from "@/app/portfolio/actions";
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

export function AddHoldingDialog() {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    addPortfolioItem,
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Holding added.");
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
            Add Holding
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-4">
          <DialogHeader>
            <DialogTitle>Add Holding</DialogTitle>
            <DialogDescription>
              Add a stock position to your portfolio.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="ticker">Ticker Symbol</Label>
            <Input
              id="ticker"
              name="ticker"
              placeholder="AAPL"
              autoCapitalize="characters"
              className="uppercase"
              onChange={(e) => {
                e.currentTarget.value = e.currentTarget.value.toUpperCase();
              }}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="shares">Number of Shares</Label>
            <Input
              id="shares"
              name="shares"
              type="number"
              step="any"
              min="0"
              placeholder="10"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="averagePrice">Average Price (optional)</Label>
            <Input
              id="averagePrice"
              name="averagePrice"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
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
