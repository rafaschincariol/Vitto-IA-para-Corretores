"use client";

import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

// Ícone de ajuda pra colar ao lado de um Label — usado nos campos que exigem
// alguma explicação (jargão técnico, premissa assumida, fórmula por trás do
// número). type="button" evita que ele dispare submit dentro de formulários.
export function InfoTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-3.5 shrink-0 items-center justify-center text-muted-foreground outline-none hover:text-foreground focus-visible:text-foreground"
          aria-label="Mais informações"
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent>{children}</TooltipContent>
    </Tooltip>
  );
}
