"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteRepayment } from "@/app/mortgage/actions";
import { Button } from "@/components/ui/button";

export function DeleteRepaymentButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      try {
        await deleteRepayment(id);
        toast.success("Repayment deleted.");
      } catch {
        toast.error("Failed to delete repayment.");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onDelete}
      disabled={pending}
      aria-label="Delete repayment"
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
