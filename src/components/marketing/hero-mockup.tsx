import { FileText, Sparkles, CheckCircle2 } from "lucide-react";

// Diagrama ilustrativo do fluxo de extração — não é um print real do produto.
export function HeroMockup() {
  return (
    <div className="relative rounded-2xl border bg-card p-4 ring-1 ring-foreground/10 sm:p-6">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <div className="flex w-full items-center gap-3 rounded-xl border bg-muted/40 p-4 sm:w-auto">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10">
            <FileText className="size-5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">apolice_maria_silva.pdf</p>
            <p className="text-xs text-muted-foreground">Enviado agora</p>
          </div>
        </div>

        <div className="flex size-9 shrink-0 rotate-90 items-center justify-center rounded-full bg-primary text-primary-foreground sm:rotate-0">
          <Sparkles className="size-4" />
        </div>

        <div className="w-full rounded-xl border bg-background p-4 sm:w-auto sm:min-w-70">
          <div className="mb-3 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <CheckCircle2 className="size-3.5 text-foreground" />
            Extraído automaticamente
          </div>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Cliente</dt>
              <dd className="font-medium">Maria da Silva</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">CPF</dt>
              <dd className="font-medium">111.444.777-35</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Seguradora</dt>
              <dd className="font-medium">Porto Seguro</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Vencimento</dt>
              <dd className="font-medium">14/03/2027</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
