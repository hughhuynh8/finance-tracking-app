"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { updateOffset, type ActionResult } from "@/app/mortgage/actions";
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

export function EditOffsetDialog({
  id,
  offsetBalance,
}: {
  id: string;
  offsetBalance: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(
    updateOffset,
    initialState
  );

  useEffect(() => {
    if (state.ok) {
      toast.success("Offset balance updated.");
      setOpen(false);
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="ghost" size="icon" aria-label="Edit offset balance">
            <Pencil className="h-4 w-4" />
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="id" value={id} />
          <DialogHeader>
            <DialogTitle>Update Offset Balance</DialogTitle>
            <DialogDescription>
              Interest accrues only on the loan balance above the offset account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="offsetBalance">Offset Account Balance</Label>
            {/* Remount when the saved value changes so Base UI applies the new
                default to a fresh field instead of warning about a changed
                default on an already-initialized uncontrolled input. */}
            <Input
              key={offsetBalance}
              id="offsetBalance"
              name="offsetBalance"
              type="number"
              step="any"
              min="0"
              defaultValue={offsetBalance}
              placeholder="0"
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
