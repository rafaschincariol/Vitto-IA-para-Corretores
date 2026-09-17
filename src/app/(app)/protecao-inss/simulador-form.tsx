"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ShieldCheck, AlertTriangle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { InfoTooltip } from "@/components/info-tooltip";
import { PrefillNote } from "@/components/prefill-note";
import { InssBreakdown } from "./inss-breakdown";
import { calculateInssGap, formatCurrency } from "@/lib/protecao-inss/calculator";
import { DEFAULT_DEPENDENCY_YEARS, INSS_CEILING_2026 } from "@/lib/protecao-inss/constants";
import {
  saveProtecaoInssSimulacao,
  createProspectFromInssSimulacao,
  deleteProtecaoInssSimulacao,
} from "./actions";
import type { ProtecaoInssSimulacao } from "@/lib/types";
import type { ClientFinancialProfile } from "@/lib/data/client-financial-profile";

export function SimuladorForm({
  simulacao,
  clientId,
  clientName,
  prefill,
}: {
  simulacao?: ProtecaoInssSimulacao;
  clientId?: string | null;
  clientName?: string | null;
  prefill?: ClientFinancialProfile;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(simulacao?.client_name ?? clientName ?? "");
  const [contributionSalary, setContributionSalary] = useState(simulacao?.contribution_salary ?? 0);
  const [dependentsCount, setDependentsCount] = useState(simulacao?.dependents_count ?? 0);
  const [familyMonthlyIncome, setFamilyMonthlyIncome] = useState(
    simulacao?.family_monthly_income ?? prefill?.familyMonthlyIncome?.value ?? 0
  );
  const [dependencyYears, setDependencyYears] = useState(simulacao?.dependency_years ?? DEFAULT_DEPENDENCY_YEARS);
  const [existingInsurance, setExistingInsurance] = useState(
    simulacao?.existing_insurance ?? prefill?.existingInsurance?.value ?? 0
  );
  const [notes, setNotes] = useState(simulacao?.notes ?? "");

  const result = useMemo(
    () => calculateInssGap({ contributionSalary, dependentsCount, familyMonthlyIncome, dependencyYears, existingInsurance }),
    [contributionSalary, dependentsCount, familyMonthlyIncome, dependencyYears, existingInsurance]
  );

  const hasResult = familyMonthlyIncome > 0;

  function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome do titular.");
      return;
    }
    if (familyMonthlyIncome <= 0) {
      toast.error("Informe a renda familiar atual.");
      return;
    }
    startTransition(async () => {
      const res = await saveProtecaoInssSimulacao({
        id: simulacao?.id,
        client_id: clientId ?? simulacao?.client_id ?? null,
        client_name: name.trim(),
        contribution_salary: contributionSalary,
        dependents_count: dependentsCount,
        family_monthly_income: familyMonthlyIncome,
        dependency_years: dependencyYears,
        existing_insurance: existingInsurance,
        notes: notes.trim() || null,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Simulação salva.");
      if (!simulacao && res.id) router.push(`/protecao-inss/${res.id}`);
      else router.refresh();
    });
  }

  function handleCreateOpportunity() {
    if (!simulacao) {
      toast.error("Salve a simulação antes de criar a oportunidade.");
      return;
    }
    startTransition(async () => {
      const res = await createProspectFromInssSimulacao(simulacao.id);
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
      const res = await deleteProtecaoInssSimulacao(simulacao.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      router.push("/protecao-inss");
    });
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Dados da simulação</CardTitle>
          <CardDescription>
            {clientId ? "Vinculada ao cliente cadastrado abaixo." : "Pode simular antes mesmo de cadastrar o cliente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="client_name">Nome do titular / família</Label>
              <Input
                id="client_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={!!clientId}
                placeholder="Ex: Família Silveira"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contribution_salary" className="flex items-center gap-1.5">
                Salário de contribuição ao INSS (R$/mês)
                <InfoTooltip>
                  Base usada pra estimar o benefício do INSS. Se o cliente não souber o valor exato de contribuição,
                  use o salário bruto como aproximação — o valor é sempre capado no teto do INSS.
                </InfoTooltip>
              </Label>
              <Input
                id="contribution_salary"
                type="number"
                min={0}
                value={contributionSalary || ""}
                onChange={(e) => setContributionSalary(Number(e.target.value) || 0)}
                placeholder="Ex: 5000"
              />
              <p className="text-xs text-muted-foreground">Capado no teto do INSS ({formatCurrency(INSS_CEILING_2026)}).</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dependents_count" className="flex items-center gap-1.5">
                Dependentes habilitados
                <InfoTooltip>
                  Cônjuge/companheiro(a), filhos menores de 21 anos (ou inválidos/com deficiência) e outros
                  dependentes já habilitados junto ao INSS. Cada um soma 10% na pensão por morte, até 100%.
                </InfoTooltip>
              </Label>
              <Input
                id="dependents_count"
                type="number"
                min={0}
                max={10}
                value={dependentsCount || ""}
                onChange={(e) => setDependentsCount(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="family_monthly_income">Renda familiar total atual (R$/mês)</Label>
              <Input
                id="family_monthly_income"
                type="number"
                min={0}
                value={familyMonthlyIncome || ""}
                onChange={(e) => setFamilyMonthlyIncome(Number(e.target.value) || 0)}
                placeholder="Some a renda de todos que sustentam a casa hoje"
              />
              {!simulacao && prefill?.familyMonthlyIncome && <PrefillNote field={prefill.familyMonthlyIncome} />}
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="existing_insurance" className="flex items-center gap-1.5">
                Seguro de vida já contratado (R$)
                <InfoTooltip>
                  Capital de seguros de vida que o cliente já tem hoje — é descontado do capital sugerido, pra não
                  recomendar proteção duplicada.
                </InfoTooltip>
              </Label>
              <Input
                id="existing_insurance"
                type="number"
                min={0}
                value={existingInsurance || ""}
                onChange={(e) => setExistingInsurance(Number(e.target.value) || 0)}
                placeholder="0"
              />
              {!simulacao && prefill?.existingInsurance && <PrefillNote field={prefill.existingInsurance} />}
            </div>
          </div>
        </CardContent>
      </Card>

      {hasResult && (
        <>
          {/* O problema primeiro: o buraco entre a renda de hoje e o que o
              INSS pagaria — mesma lógica de ordenação problem-first do
              simulador de sucessão. */}
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="space-y-1 pt-6">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                <AlertTriangle className="size-3.5" />
                Se faltar hoje, é isso que sobra pra família por mês
              </p>
              <p className="text-4xl font-bold tracking-tight text-destructive">{formatCurrency(result.monthlyGap)}</p>
              <p className="text-sm text-muted-foreground">
                Renda da família hoje: {formatCurrency(familyMonthlyIncome)} — pensão por morte estimada do INSS:{" "}
                {formatCurrency(result.estimatedPension)} ({(result.pensionFraction * 100).toFixed(0)}% do benefício,
                com {dependentsCount} dependente{dependentsCount === 1 ? "" : "s"}).
              </p>
            </CardContent>
          </Card>

          <InssBreakdown
            result={result}
            contributionSalary={contributionSalary}
            dependentsCount={dependentsCount}
            familyMonthlyIncome={familyMonthlyIncome}
          />

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="dependency_years" className="flex shrink-0 items-center gap-1.5">
                  Por quantos anos a família dependeria dessa renda
                  <InfoTooltip>
                    Horizonte usado pra transformar o gap mensal num capital único — não é o prazo de uma apólice,
                    é só até quando a proteção do INSS deixaria de fazer falta (filhos crescerem, cônjuge se
                    recolocar no mercado etc.).
                  </InfoTooltip>
                </Label>
                <span className="text-sm font-semibold">{dependencyYears} anos</span>
              </div>
              <input
                id="dependency_years"
                type="range"
                min={1}
                max={40}
                value={dependencyYears}
                onChange={(e) => setDependencyYears(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Normalmente até o filho mais novo se formar ou a família reconstruir independência financeira.
              </p>
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-4 pt-6">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  <ShieldCheck className="size-3.5" />
                  Capital de seguro de vida sugerido
                </p>
                <p className="text-5xl font-bold tracking-tight">{formatCurrency(result.suggestedCoverage)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Gap mensal ({formatCurrency(result.monthlyGap)}) × 12 × {dependencyYears} anos
                  {existingInsurance > 0 ? ` − proteção já contratada (${formatCurrency(existingInsurance)})` : ""}. O
                  INSS ajuda, mas não substitui a renda da família sozinho — esse é o valor que fecha a diferença.
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
                Estimativa educativa — não substitui análise individual previdenciária. A regra de pensão por morte e
                o teto do INSS são revisados anualmente; confirme o valor vigente antes de propor ao cliente.
              </p>
            </CardContent>
          </Card>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações / parecer técnico</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente já tem seguro de vida de R$ 200 mil pela empresa — considerar na proposta."
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
          Informe a renda familiar atual pra ver o resultado.{" "}
          <Link href="/protecao-inss" className="underline underline-offset-2">
            Voltar pro histórico
          </Link>
        </p>
      )}
    </div>
  );
}
