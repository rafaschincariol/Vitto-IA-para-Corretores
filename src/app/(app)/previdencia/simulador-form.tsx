"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, PiggyBank, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfoTooltip } from "@/components/info-tooltip";
import { PrefillNote } from "@/components/prefill-note";
import { calculatePrevidencia, formatCurrency } from "@/lib/previdencia/calculator";
import type { PlanType, TaxRegime } from "@/lib/previdencia/types";
import {
  savePrevidenciaSimulacao,
  createProspectFromPrevidenciaSimulacao,
  deletePrevidenciaSimulacao,
} from "./actions";
import { PrevidenciaCharts } from "./previdencia-charts";
import { ComparisonTable } from "./comparison-table";
import { ExportPrevidenciaPdfButton } from "./export-previdencia-pdf-button";
import type { PrevidenciaSimulacao } from "@/lib/types";
import type { ClientFinancialProfile } from "@/lib/data/client-financial-profile";

const PLAN_LABELS: Record<PlanType, string> = { pgbl: "PGBL", vgbl: "VGBL" };
const REGIME_LABELS: Record<TaxRegime, string> = { regressivo: "Regressivo", progressivo: "Progressivo" };

export function SimuladorForm({
  simulacao,
  clientId,
  clientName,
  prefill,
  advisorName,
}: {
  simulacao?: PrevidenciaSimulacao;
  clientId?: string | null;
  clientName?: string | null;
  prefill?: ClientFinancialProfile;
  advisorName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(simulacao?.client_name ?? clientName ?? "");
  const [monthlyContribution, setMonthlyContribution] = useState(simulacao?.monthly_contribution ?? 0);
  const [existingBalance, setExistingBalance] = useState(
    simulacao?.existing_balance ?? prefill?.currentInvestments?.value ?? 0
  );
  const [yearsToRetirement, setYearsToRetirement] = useState(simulacao?.years_to_retirement ?? 20);
  const [annualReturnRate, setAnnualReturnRate] = useState(simulacao?.annual_return_rate ?? 6);
  const [annualTaxableIncome, setAnnualTaxableIncome] = useState(
    simulacao?.annual_taxable_income ?? (prefill?.monthlyIncome ? prefill.monthlyIncome.value * 12 : 0)
  );
  const [filesCompleteDeclaration, setFilesCompleteDeclaration] = useState(
    simulacao?.files_complete_declaration ?? true
  );
  const [planType, setPlanType] = useState<PlanType>(simulacao?.plan_type ?? "pgbl");
  const [taxRegime, setTaxRegime] = useState<TaxRegime>(simulacao?.tax_regime ?? "regressivo");
  const [notes, setNotes] = useState(simulacao?.notes ?? "");

  const result = useMemo(
    () =>
      calculatePrevidencia({
        monthlyContribution,
        existingBalance,
        yearsToRetirement,
        annualReturnRate,
        annualTaxableIncome,
        filesCompleteDeclaration,
        planType,
        taxRegime,
      }),
    [
      monthlyContribution,
      existingBalance,
      yearsToRetirement,
      annualReturnRate,
      annualTaxableIncome,
      filesCompleteDeclaration,
      planType,
      taxRegime,
    ]
  );

  const hasResult = monthlyContribution > 0 && yearsToRetirement > 0;

  function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome do titular.");
      return;
    }
    if (monthlyContribution <= 0) {
      toast.error("Informe o valor do aporte mensal.");
      return;
    }
    startTransition(async () => {
      const res = await savePrevidenciaSimulacao({
        id: simulacao?.id,
        client_id: clientId ?? simulacao?.client_id ?? null,
        client_name: name.trim(),
        monthly_contribution: monthlyContribution,
        existing_balance: existingBalance,
        years_to_retirement: yearsToRetirement,
        annual_return_rate: annualReturnRate,
        annual_taxable_income: annualTaxableIncome,
        files_complete_declaration: filesCompleteDeclaration,
        plan_type: planType,
        tax_regime: taxRegime,
        notes: notes.trim() || null,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Simulação salva.");
      if (!simulacao && res.id) router.push(`/previdencia/${res.id}`);
      else router.refresh();
    });
  }

  function handleCreateOpportunity() {
    if (!simulacao) {
      toast.error("Salve a simulação antes de criar a oportunidade.");
      return;
    }
    startTransition(async () => {
      const res = await createProspectFromPrevidenciaSimulacao(simulacao.id);
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
      const res = await deletePrevidenciaSimulacao(simulacao.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      router.push("/previdencia");
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da previdência</CardTitle>
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
                placeholder="Ex: Marina Torres"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_contribution">Aporte mensal (R$)</Label>
              <Input
                id="monthly_contribution"
                type="number"
                min={0}
                value={monthlyContribution || ""}
                onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
                placeholder="Ex: 1000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="existing_balance" className="flex items-center gap-1.5">
                Saldo já acumulado (R$)
                <InfoTooltip>0 se é um plano novo. Se o cliente já tem saldo em previdência, informe aqui.</InfoTooltip>
              </Label>
              <Input
                id="existing_balance"
                type="number"
                min={0}
                value={existingBalance || ""}
                onChange={(e) => setExistingBalance(Number(e.target.value) || 0)}
                placeholder="0"
              />
              {!simulacao && prefill?.currentInvestments && <PrefillNote field={prefill.currentInvestments} />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="years_to_retirement">Anos até o resgate</Label>
              <Input
                id="years_to_retirement"
                type="number"
                min={1}
                max={80}
                value={yearsToRetirement || ""}
                onChange={(e) => setYearsToRetirement(Number(e.target.value) || 1)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual_return_rate" className="flex items-center gap-1.5">
                Rentabilidade anual esperada (%)
                <InfoTooltip>
                  Estimativa de retorno do fundo de previdência escolhido, líquida de taxa de administração.
                </InfoTooltip>
              </Label>
              <Input
                id="annual_return_rate"
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={annualReturnRate || ""}
                onChange={(e) => setAnnualReturnRate(Number(e.target.value) || 0)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="annual_taxable_income" className="flex items-center gap-1.5">
                Renda bruta tributável anual (R$)
                <InfoTooltip>
                  Usada pra calcular o teto de 12% de dedução do PGBL e a economia de IR — só entra na declaração
                  completa do IRPF.
                </InfoTooltip>
              </Label>
              <Input
                id="annual_taxable_income"
                type="number"
                min={0}
                value={annualTaxableIncome || ""}
                onChange={(e) => setAnnualTaxableIncome(Number(e.target.value) || 0)}
                placeholder="Ex: 120000"
              />
              {!simulacao && prefill?.monthlyIncome && <PrefillNote field={prefill.monthlyIncome} />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="files_complete_declaration" className="flex items-center gap-1.5">
                Declaração do IRPF
                <InfoTooltip>
                  A dedução do PGBL só vale pra quem faz a declaração completa (não o desconto simplificado).
                </InfoTooltip>
              </Label>
              <Select
                value={filesCompleteDeclaration ? "sim" : "nao"}
                onValueChange={(v) => setFilesCompleteDeclaration(v === "sim")}
              >
                <SelectTrigger id="files_complete_declaration" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sim">Faz declaração completa</SelectItem>
                  <SelectItem value="nao">Desconto simplificado / isento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="plan_type" className="flex items-center gap-1.5">
                Plano
                <InfoTooltip>
                  PGBL: contribuição dedutível do IR hoje, mas todo o resgate é tributado. VGBL: sem dedução, mas só
                  os ganhos são tributados no resgate.
                </InfoTooltip>
              </Label>
              <Select value={planType} onValueChange={(v) => setPlanType(v as PlanType)}>
                <SelectTrigger id="plan_type" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(PLAN_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_regime" className="flex items-center gap-1.5">
                Regime de tributação
                <InfoTooltip>
                  Regressivo: alíquota cai de 35% a 10% com o tempo — melhor pra horizonte longo. Progressivo: tabela
                  do IRPF normal — melhor pra quem terá baixa renda tributável no ano do resgate.
                </InfoTooltip>
              </Label>
              <Select value={taxRegime} onValueChange={(v) => setTaxRegime(v as TaxRegime)}>
                <SelectTrigger id="tax_regime" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(REGIME_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                  <PiggyBank className="size-3.5" />
                  Saldo projetado em {yearsToRetirement} ano{yearsToRetirement === 1 ? "" : "s"}
                </p>
                <p className="text-5xl font-bold tracking-tight">{formatCurrency(result.futureValue)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {formatCurrency(result.totalContributed)} aportados, {formatCurrency(result.totalGain)} de ganho.
                  Líquido estimado no resgate ({PLAN_LABELS[planType]} · {REGIME_LABELS[taxRegime]}):{" "}
                  <span className="font-medium text-foreground">{formatCurrency(result.selected.netProceeds)}</span>.
                </p>
                {planType === "pgbl" && result.pgblAnnualTaxSavings > 0 && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    Além disso, a dedução do PGBL economiza {formatCurrency(result.pgblAnnualTaxSavings)} de IR na
                    declaração deste ano (sobre {formatCurrency(result.pgblDeductibleAnnualContribution)}{" "}
                    dedutíveis).
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={handleCreateOpportunity} disabled={pending}>
                  Criar oportunidade no funil
                  <ArrowRight className="size-4" />
                </Button>
                <Button type="button" variant="outline" onClick={handleSave} disabled={pending}>
                  {pending ? "Salvando..." : simulacao ? "Salvar alterações" : "Salvar simulação"}
                </Button>
                {simulacao && (
                  <ExportPrevidenciaPdfButton
                    simulacao={{ ...simulacao, client_name: name }}
                    advisorName={advisorName}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Estimativa educativa a partir da rentabilidade e das tabelas de IR informadas — não substitui o
                extrato oficial da seguradora nem orientação de um contador.
              </p>
            </CardContent>
          </Card>

          <PrevidenciaCharts timeline={result.timeline} />

          <ComparisonTable comparison={result.comparison} selectedPlan={planType} selectedRegime={taxRegime} />

          <div className="space-y-2">
            <Label htmlFor="notes">Observações / parecer técnico</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente prioriza liquidez em 5 anos, avaliar regime progressivo."
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
          Informe o aporte mensal e o horizonte pra ver o resultado.{" "}
          <Link href="/previdencia" className="underline underline-offset-2">
            Voltar pro histórico
          </Link>
        </p>
      )}
    </div>
  );
}
