import Link from "next/link";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

// Mesma linguagem visual do AssistantQuickAsk do Dashboard — reforça que a
// IA está disponível também nas páginas de Clientes e Apólices, no
// momento em que ela mais ajuda: lista vazia, prestes a cadastrar na mão.
export function AiImportNudge({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-lg border bg-gradient-to-br from-primary/5 to-transparent p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Sparkles className="size-4.5" />
        </span>
        <p className="text-sm">{message}</p>
      </div>
      <Button asChild size="sm" variant="outline" className="shrink-0">
        <Link href="/documents">Enviar apólices</Link>
      </Button>
    </div>
  );
}
