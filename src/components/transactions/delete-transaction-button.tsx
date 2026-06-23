"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deleteTransaction } from "@/app/transactions/actions";
import { Button } from "@/components/ui/button";

export function DeleteTransactionButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      try {
        await deleteTransaction(id);
        toast.success("Transaction deleted.");
      } catch {
        toast.error("Failed to delete transaction.");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onDelete}
      disabled={pending}
      aria-label="Delete transaction"
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
