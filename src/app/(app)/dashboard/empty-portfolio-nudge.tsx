import Link from "next/link";
import { ScanText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Substitui o grid de KPIs (que mostraria tudo zerado) na primeira vez —
// aproveita o momento de maior intenção (login) pra guiar direto pra ação
// que mais importa: cadastrar a primeira apólice via IA.
export function EmptyPortfolioNudge() {
  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center sm:py-12">
        <span className="flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <ScanText className="size-6" />
        </span>
        <div className="max-w-sm space-y-1">
          <h2 className="font-heading text-lg font-medium">Cadastre sua primeira apólice</h2>
          <p className="text-sm text-muted-foreground">
            Envie o PDF ou tire uma foto da apólice — o Vitto lê o documento, identifica o
            cliente e preenche tudo sozinho. Você só confere antes de salvar.
          </p>
        </div>
        <Button asChild size="lg" className="mt-1">
          <Link href="/documents">Enviar apólice agora</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
