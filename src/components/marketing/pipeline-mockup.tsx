// Diagrama ilustrativo do funil de vendas — não é um print real do produto,
// mesmo espírito do HeroMockup (hero-mockup.tsx).
const COLUMNS = [
  { name: "Prospect", cards: ["Ana Ribeiro", "Marcos Melo"] },
  { name: "Proposta Enviada", cards: ["Fábio Souza"] },
  { name: "Ganho", cards: ["Carla Nunes"], won: true },
];

export function PipelineMockup() {
  return (
    <div className="relative rounded-2xl border bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
      <div className="grid grid-cols-3 gap-3">
        {COLUMNS.map((column) => (
          <div key={column.name} className="rounded-lg border bg-muted/40 p-2">
            <p className="truncate px-1 text-xs font-medium text-muted-foreground">{column.name}</p>
            <div className="mt-2 space-y-1.5">
              {column.cards.map((name) => (
                <div
                  key={name}
                  className={`truncate rounded-md border bg-background px-2 py-1.5 text-xs font-medium shadow-sm ${
                    column.won ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-400" : ""
                  }`}
                >
                  {name}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
