import { Calculator } from "lucide-react";

// Diagrama ilustrativo do menu de simuladores — não é um print real do
// produto, mesmo espírito do HeroMockup (hero-mockup.tsx). Cada simulador
// entra aqui como um item da lista: quando um novo simulador for lançado,
// basta adicionar uma linha em SIMULATORS.
const SIMULATORS = [
  { name: "Sucessão patrimonial", output: "R$ 850 mil sugeridos" },
  { name: "Proteção previdenciária (INSS)", output: "R$ 610 mil sugeridos" },
];

export function SimulatorsMenuMockup() {
  return (
    <div className="rounded-2xl border bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="space-y-2">
        {SIMULATORS.map((sim) => (
          <div
            key={sim.name}
            className="flex items-center justify-between gap-3 rounded-lg border bg-muted/40 px-3 py-2.5"
          >
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-md bg-background ring-1 ring-foreground/10">
                <Calculator className="size-3.5 text-muted-foreground" />
              </div>
              <span className="truncate text-xs font-medium">{sim.name}</span>
            </div>
            <span className="shrink-0 rounded-md bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
              {sim.output}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
