"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { deletePortfolioItem } from "@/app/portfolio/actions";
import { Button } from "@/components/ui/button";

export function DeleteHoldingButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      try {
        await deletePortfolioItem(id);
        toast.success("Holding deleted.");
      } catch {
        toast.error("Failed to delete holding.");
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onDelete}
      disabled={pending}
      aria-label="Delete holding"
    >
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
