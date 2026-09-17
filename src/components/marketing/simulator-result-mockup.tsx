import { ArrowRight, TrendingUp } from "lucide-react";

// Diagrama ilustrativo do fluxo simulador → funil — não é um print real do
// produto, mesmo espírito do HeroMockup (hero-mockup.tsx). Propositalmente
// genérico (não nomeia um simulador específico) pra continuar valendo à
// medida que novos simuladores forem lançados.
export function SimulatorResultMockup() {
  return (
    <div className="relative rounded-2xl border bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <div className="w-full rounded-xl border bg-muted/40 p-4 sm:w-auto sm:min-w-48">
          <p className="mb-2 text-xs font-medium text-muted-foreground">Dados do cliente</p>
          <dl className="space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-muted-foreground">Renda mensal</dt>
              <dd className="font-medium">R$ 12.000</dd>
            </div>
            <div className="flex items-center justify-between gap-2">
              <dt className="text-xs text-muted-foreground">Dependentes</dt>
              <dd className="font-medium">2</dd>
            </div>
          </dl>
        </div>

        <ArrowRight className="size-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />

        <div className="w-full rounded-xl border bg-background p-4 text-center sm:w-auto sm:min-w-44">
          <p className="text-xs text-muted-foreground">Cobertura sugerida</p>
          <p className="mt-1 font-heading text-2xl font-semibold tracking-tight">R$ 850 mil</p>
        </div>

        <ArrowRight className="size-4 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />

        <div className="flex w-full items-center gap-2 rounded-xl bg-primary px-4 py-3 text-primary-foreground sm:w-auto">
          <TrendingUp className="size-4 shrink-0" />
          <span className="text-sm font-medium">Criar oportunidade no funil</span>
        </div>
      </div>
    </div>
  );
}
