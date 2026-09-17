"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfoTooltip } from "@/components/info-tooltip";
import { calculatePrestamista, formatCurrency } from "@/lib/prestamista/calculator";
import type { AmortizationSystem } from "@/lib/prestamista/types";
import { savePrestamistaSimulacao, createProspectFromPrestamistaSimulacao, deletePrestamistaSimulacao } from "./actions";
import { PrestamistaCharts } from "./prestamista-charts";
import { AmortizationComparison } from "./amortization-comparison";
import type { PrestamistaSimulacao } from "@/lib/types";

const AMORTIZATION_LABELS: Record<AmortizationSystem, string> = {
  sac: "SAC",
  price: "Price",
};

export function SimuladorForm({
  simulacao,
  clientId,
  clientName,
}: {
  simulacao?: PrestamistaSimulacao;
  clientId?: string | null;
  clientName?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(simulacao?.client_name ?? clientName ?? "");
  const [financedAmount, setFinancedAmount] = useState(simulacao?.financed_amount ?? 0);
  const [annualInterestRate, setAnnualInterestRate] = useState(simulacao?.annual_interest_rate ?? 10);
  const [termYears, setTermYears] = useState(simulacao?.term_years ?? 30);
  const [amortizationSystem, setAmortizationSystem] = useState<AmortizationSystem>(
    simulacao?.amortization_system ?? "sac"
  );
  const [yearsElapsed, setYearsElapsed] = useState(simulacao?.years_elapsed ?? 0);
  const [notes, setNotes] = useState(simulacao?.notes ?? "");

  const result = useMemo(
    () => calculatePrestamista({ financedAmount, annualInterestRate, termYears, amortizationSystem, yearsElapsed }),
    [financedAmount, annualInterestRate, termYears, amortizationSystem, yearsElapsed]
  );

  const hasResult = financedAmount > 0 && termYears > 0;

  function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome do titular.");
      return;
    }
    if (financedAmount <= 0) {
      toast.error("Informe o valor financiado.");
      return;
    }
    if (yearsElapsed >= termYears) {
      toast.error("Anos já pagos não pode ser maior ou igual ao prazo total.");
      return;
    }
    startTransition(async () => {
      const res = await savePrestamistaSimulacao({
        id: simulacao?.id,
        client_id: clientId ?? simulacao?.client_id ?? null,
        client_name: name.trim(),
        financed_amount: financedAmount,
        annual_interest_rate: annualInterestRate,
        term_years: termYears,
        amortization_system: amortizationSystem,
        years_elapsed: yearsElapsed,
        notes: notes.trim() || null,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Simulação salva.");
      if (!simulacao && res.id) router.push(`/prestamista/${res.id}`);
      else router.refresh();
    });
  }

  function handleCreateOpportunity() {
    if (!simulacao) {
      toast.error("Salve a simulação antes de criar a oportunidade.");
      return;
    }
    startTransition(async () => {
      const res = await createProspectFromPrestamistaSimulacao(simulacao.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Oportunidade criada no funil.");
      router.push("/pipeline");
    });
  }

  function handleDelete() {
    if (!simulacao) return;
    if (!window.confirm("Excluir esta simulação?")) return;
    startTransition(async () => {
      const res = await deletePrestamistaSimulacao(simulacao.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      router.push("/prestamista");
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados do financiamento</CardTitle>
          <CardDescription>
            {clientId ? "Vinculada ao cliente cadastrado abaixo." : "Pode simular antes mesmo de cadastrar o cliente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="client_name">Nome do titular</Label>
              <Input
                id="client_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!clientId}
                placeholder="Ex: João Silveira"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="financed_amount">Valor financiado (R$)</Label>
              <Input
                id="financed_amount"
                type="number"
                min={0}
                value={financedAmount || ""}
                onChange={(e) => setFinancedAmount(Number(e.target.value) || 0)}
                placeholder="Ex: 400000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual_interest_rate">Taxa de juros anual (%)</Label>
              <Input
                id="annual_interest_rate"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={annualInterestRate || ""}
                onChange={(e) => setAnnualInterestRate(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="term_years">Prazo total (anos)</Label>
              <Input
                id="term_years"
                type="number"
                min={1}
                max={50}
                value={termYears || ""}
                onChange={(e) => setTermYears(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amortization_system" className="flex items-center gap-1.5">
                Sistema de amortização
                <InfoTooltip>
                  SAC: parcela decrescente, amortização do principal fixa — o saldo devedor cai de forma linear.
                  Price: parcela fixa, mas amortização crescente — o saldo devedor cai mais devagar no início.
                </InfoTooltip>
              </Label>
              <Select value={amortizationSystem} onValueChange={(v) => setAmortizationSystem(v as AmortizationSystem)}>
                <SelectTrigger id="amortization_system" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(AMORTIZATION_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="years_elapsed" className="flex items-center gap-1.5">
                Anos já pagos
                <InfoTooltip>
                  0 se é um financiamento novo. Se o cliente já vem pagando há alguns anos, informe aqui pra calcular
                  o saldo devedor real de hoje, não o valor financiado original.
                </InfoTooltip>
              </Label>
              <Input
                id="years_elapsed"
                type="number"
                min={0}
                max={Math.max(0, termYears - 1)}
                step={0.5}
                value={yearsElapsed || ""}
                onChange={(e) => setYearsElapsed(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {hasResult && (
        <>
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-4 pt-6">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  <ShieldCheck className="size-3.5" />
                  Capital de seguro prestamista sugerido
                </p>
                <p className="text-5xl font-bold tracking-tight">{formatCurrency(result.suggestedCoverage)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  É o saldo devedor de hoje ({formatCurrency(financedAmount)} financiados
                  {yearsElapsed > 0 ? `, ${yearsElapsed} ano(s) já pagos` : ""}). Diferente de um seguro de vida com
                  capital fixo, a cobertura ideal aqui cai junto com a dívida — se o cliente contratar um capital
                  fixo hoje, vai ficar sobre-segurado daqui a alguns anos.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleCreateOpportunity} disabled={pending}>
                  Criar oportunidade no funil
                  <ArrowRight className="size-4" />
                </Button>
                <Button type="button" variant="outline" onClick={handleSave} disabled={pending}>
                  {pending ? "Salvando..." : simulacao ? "Salvar alterações" : "Salvar simulação"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Estimativa educativa a partir da taxa e do sistema informados — não substitui o extrato oficial do
                financiamento. Parcela atual: {formatCurrency(result.currentInstallment)}.
              </p>
            </CardContent>
          </Card>

          <PrestamistaCharts timeline={result.timeline} />

          <AmortizationComparison comparison={result.comparison} selected={amortizationSystem} />

          <div className="space-y-2">
            <Label htmlFor="notes">Observações / parecer técnico</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente já tem MIP pela financeira, avaliar substituir por apólice independente."
            />
          </div>

          {simulacao && (
            <div>
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                <Trash2 className="size-4" />
                Excluir simulação
              </Button>
            </div>
          )}
        </>
      )}

      {!hasResult && (
        <p className="text-sm text-muted-foreground">
          Informe o valor financiado e o prazo pra ver o resultado.{" "}
          <Link href="/prestamista" className="underline underline-offset-2">
            Voltar pro histórico
          </Link>
        </p>
      )}
    </div>
  );
}
