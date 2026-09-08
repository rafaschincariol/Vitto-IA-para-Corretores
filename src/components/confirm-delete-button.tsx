"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ConfirmDeleteButton({
  id,
  label,
  action,
}: {
  id: string;
  label: string;
  action: (id: string) => Promise<{ error: string | null }>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label={`Excluir ${label}`}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Excluir este ${label}? Esta ação não pode ser desfeita.`)) return;
        startTransition(async () => {
          const result = await action(id);
          if (result.error) toast.error(result.error);
        });
      }}
    >
      <Trash2 className="size-4 text-destructive" />
    </Button>
  );
}
