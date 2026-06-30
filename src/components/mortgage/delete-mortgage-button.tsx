"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteMortgage } from "@/app/mortgage/actions";
import { Button } from "@/components/ui/button";

export function DeleteMortgageButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      try {
        await deleteMortgage(id);
        toast.success("Loan deleted.");
      } catch {
        toast.error("Failed to delete loan.");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onDelete}
      disabled={pending}
      aria-label="Delete loan"
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
