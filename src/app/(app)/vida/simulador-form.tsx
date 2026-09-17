"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ArrowRight, ShieldCheck, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { calculateVidaNeed, formatCurrency } from "@/lib/vida/calculator";
import { DEFAULT_DEPENDENCY_YEARS, DEFAULT_FINAL_COSTS, DEFAULT_REAL_RETURN_RATE } from "@/lib/vida/constants";
import type { Child, Debt } from "@/lib/vida/types";
import { saveVidaSimulacao, createProspectFromVidaSimulacao, deleteVidaSimulacao } from "./actions";
import { VidaCharts } from "./vida-charts";
import type { VidaSimulacao } from "@/lib/types";

function newDebt(): Debt {
  return { id: Math.random().toString(36).slice(2, 10), description: "", balance: 0, payoffYears: 10 };
}

function newChild(): Child {
  return { id: Math.random().toString(36).slice(2, 10), name: "", currentAge: 0, collegeAnnualCost: 0 };
}

export function SimuladorForm({
  simulacao,
  clientId,
  clientName,
}: {
  simulacao?: VidaSimulacao;
  clientId?: string | null;
  clientName?: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(simulacao?.client_name ?? clientName ?? "");
  const [monthlyIncome, setMonthlyIncome] = useState(simulacao?.monthly_income ?? 0);
  const [dependencyYears, setDependencyYears] = useState(simulacao?.dependency_years ?? DEFAULT_DEPENDENCY_YEARS);
  const [debts, setDebts] = useState<Debt[]>(simulacao?.debts ?? []);
  const [children, setChildren] = useState<Child[]>(simulacao?.children ?? []);
  const [currentInvestments, setCurrentInvestments] = useState(simulacao?.current_investments ?? 0);
  const [monthlyContribution, setMonthlyContribution] = useState(simulacao?.monthly_contribution ?? 0);
  const [existingInsurance, setExistingInsurance] = useState(simulacao?.existing_insurance ?? 0);
  const [realReturnRate, setRealReturnRate] = useState(simulacao?.real_return_rate ?? DEFAULT_REAL_RETURN_RATE);
  const [finalCosts, setFinalCosts] = useState(simulacao?.final_costs ?? DEFAULT_FINAL_COSTS);
  const [notes, setNotes] = useState(simulacao?.notes ?? "");

  const validDebts = useMemo(() => debts.filter((d) => d.description.trim() && d.balance > 0), [debts]);
  const validChildren = useMemo(() => children.filter((c) => c.name.trim()), [children]);

  const result = useMemo(
    () =>
      calculateVidaNeed({
        monthlyIncome,
        dependencyYears,
        debts: validDebts,
        children: validChildren,
        currentInvestments,
        monthlyContribution,
        existingInsurance,
        realReturnRate,
        finalCosts,
      }),
    [
      monthlyIncome,
      dependencyYears,
      validDebts,
      validChildren,
      currentInvestments,
      monthlyContribution,
      existingInsurance,
      realReturnRate,
      finalCosts,
    ]
  );

  const hasResult = monthlyIncome > 0;

  function updateDebt(id: string, patch: Partial<Debt>) {
    setDebts((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)));
  }

  function updateChild(id: string, patch: Partial<Child>) {
    setChildren((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome do titular.");
      return;
    }
    if (monthlyIncome <= 0) {
      toast.error("Informe a renda mensal.");
      return;
    }
    startTransition(async () => {
      const res = await saveVidaSimulacao({
        id: simulacao?.id,
        client_id: clientId ?? simulacao?.client_id ?? null,
        client_name: name.trim(),
        monthly_income: monthlyIncome,
        dependency_years: dependencyYears,
        debts: validDebts,
        children: validChildren,
        current_investments: currentInvestments,
        monthly_contribution: monthlyContribution,
        existing_insurance: existingInsurance,
        real_return_rate: realReturnRate,
        final_costs: finalCosts,
        notes: notes.trim() || null,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Simulação salva.");
      if (!simulacao && res.id) router.push(`/vida/${res.id}`);
      else router.refresh();
    });
  }

  function handleCreateOpportunity() {
    if (!simulacao) {
      toast.error("Salve a simulação antes de criar a oportunidade.");
      return;
    }
    startTransition(async () => {
      const res = await createProspectFromVidaSimulacao(simulacao.id);
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
      const res = await deleteVidaSimulacao(simulacao.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      router.push("/vida");
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
              <Label htmlFor="monthly_income">Renda mensal (R$)</Label>
              <Input
                id="monthly_income"
                type="number"
                min={0}
                value={monthlyIncome || ""}
                onChange={(e) => setMonthlyIncome(Number(e.target.value) || 0)}
                placeholder="Ex: 8000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dependency_years">Anos de dependência da família</Label>
              <Input
                id="dependency_years"
                type="number"
                min={1}
                max={40}
                value={dependencyYears || ""}
                onChange={(e) => setDependencyYears(Number(e.target.value) || 1)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Dívidas (financiamentos, empréstimos)</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setDebts((prev) => [...prev, newDebt()])}>
                <Plus className="size-4" />
                Adicionar dívida
              </Button>
            </div>
            <div className="space-y-2">
              {debts.map((debt) => (
                <div key={debt.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Descrição (ex: Financiamento do imóvel)"
                    value={debt.description}
                    onChange={(e) => updateDebt(debt.id, { description: e.target.value })}
                    className="sm:flex-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Saldo devedor (R$)"
                    value={debt.balance || ""}
                    onChange={(e) => updateDebt(debt.id, { balance: Number(e.target.value) || 0 })}
                    className="sm:w-44"
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Anos até quitar"
                    value={debt.payoffYears || ""}
                    onChange={(e) => updateDebt(debt.id, { payoffYears: Number(e.target.value) || 0 })}
                    className="sm:w-36"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover dívida"
                    onClick={() => setDebts((prev) => prev.filter((d) => d.id !== debt.id))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {debts.length === 0 && <p className="text-xs text-muted-foreground">Nenhuma dívida adicionada.</p>}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Filhos</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => setChildren((prev) => [...prev, newChild()])}>
                <Plus className="size-4" />
                Adicionar filho
              </Button>
            </div>
            <div className="space-y-2">
              {children.map((child) => (
                <div key={child.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Nome"
                    value={child.name}
                    onChange={(e) => updateChild(child.id, { name: e.target.value })}
                    className="sm:flex-1"
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Idade"
                    value={child.currentAge || ""}
                    onChange={(e) => updateChild(child.id, { currentAge: Number(e.target.value) || 0 })}
                    className="sm:w-24"
                  />
                  <Input
                    type="number"
                    min={0}
                    placeholder="Faculdade (R$/ano, 0 = sem plano)"
                    value={child.collegeAnnualCost || ""}
                    onChange={(e) => updateChild(child.id, { collegeAnnualCost: Number(e.target.value) || 0 })}
                    className="sm:w-56"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover filho"
                    onClick={() => setChildren((prev) => prev.filter((c) => c.id !== child.id))}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
              {children.length === 0 && <p className="text-xs text-muted-foreground">Nenhum filho adicionado.</p>}
            </div>
            <p className="text-xs text-muted-foreground">
              Faculdade considera início aos 18 anos e duração de 5 anos, pra estimar quanto ainda falta pagar.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="current_investments">Patrimônio já investido (R$)</Label>
              <Input
                id="current_investments"
                type="number"
                min={0}
                value={currentInvestments || ""}
                onChange={(e) => setCurrentInvestments(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_contribution">Aporte mensal atual (R$)</Label>
              <Input
                id="monthly_contribution"
                type="number"
                min={0}
                value={monthlyContribution || ""}
                onChange={(e) => setMonthlyContribution(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="existing_insurance">Seguro de vida já contratado (R$)</Label>
              <Input
                id="existing_insurance"
                type="number"
                min={0}
                value={existingInsurance || ""}
                onChange={(e) => setExistingInsurance(Number(e.target.value) || 0)}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="real_return_rate">Rentabilidade real assumida (% ao ano)</Label>
              <Input
                id="real_return_rate"
                type="number"
                min={0}
                max={30}
                step={0.1}
                value={realReturnRate * 100 || ""}
                onChange={(e) => setRealReturnRate((Number(e.target.value) || 0) / 100)}
              />
              <p className="text-xs text-muted-foreground">Parâmetro editável — nunca uma promessa de rentabilidade.</p>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="final_costs">Custos finais (funeral, documentação, inventário simplificado)</Label>
              <Input
                id="final_costs"
                type="number"
                min={0}
                value={finalCosts || ""}
                onChange={(e) => setFinalCosts(Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {hasResult && (
        <>
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="space-y-1 pt-6">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                <AlertTriangle className="size-3.5" />
                Necessidade total de proteção
              </p>
              <p className="text-4xl font-bold tracking-tight text-destructive">{formatCurrency(result.totalNeed)}</p>
              <p className="text-sm text-muted-foreground">
                Dívidas ({formatCurrency(result.totalDebts)}) + renda × {dependencyYears} anos + faculdade dos filhos
                ({formatCurrency(result.totalCollegeCost)}) + custos finais ({formatCurrency(finalCosts)}) — antes de
                considerar o que a família já tem.
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
                  Necessidade total ({formatCurrency(result.totalNeed)}) − patrimônio já investido (
                  {formatCurrency(currentInvestments)}) − seguro já contratado ({formatCurrency(existingInsurance)}).
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
                Estimativa educativa — não substitui análise individual. A rentabilidade usada na projeção é uma
                premissa ajustável, nunca uma promessa.
              </p>
            </CardContent>
          </Card>

          <VidaCharts timeline={result.timeline} />

          <div className="space-y-2">
            <Label htmlFor="notes">Observações / parecer técnico</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Cliente pretende quitar o financiamento em 8 anos, não nos 10 padrão."
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
          Informe a renda mensal pra ver o resultado.{" "}
          <Link href="/vida" className="underline underline-offset-2">
            Voltar pro histórico
          </Link>
        </p>
      )}
    </div>
  );
}
