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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { InfoTooltip } from "@/components/info-tooltip";
import { PrefillNote } from "@/components/prefill-note";
import { calculateSuccessionCosts, formatCurrency } from "@/lib/sucessao/calculator";
import { AssetType, MARITAL_REGIME_LABELS, type Asset, type MaritalRegime } from "@/lib/sucessao/types";
import { saveSucessaoSimulacao, createProspectFromSimulacao, deleteSucessaoSimulacao } from "./actions";
import { ExportSucessaoPdfButton } from "./export-sucessao-pdf-button";
import { ImportAssetsButton } from "./import-assets-button";
import { SucessaoCharts } from "./sucessao-charts";
import type { SucessaoSimulacao } from "@/lib/types";
import type { ClientFinancialProfile } from "@/lib/data/client-financial-profile";

function newAsset(): Asset {
  return { id: Math.random().toString(36).slice(2, 10), description: "", type: AssetType.REAL_ESTATE, value: 0 };
}

export function SimuladorForm({
  simulacao,
  clientId,
  clientName,
  advisorName,
  prefill,
}: {
  simulacao?: SucessaoSimulacao;
  clientId?: string | null;
  clientName?: string | null;
  advisorName: string;
  prefill?: ClientFinancialProfile;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [assets, setAssets] = useState<Asset[]>(simulacao?.assets?.length ? simulacao.assets : [newAsset()]);
  const [maritalRegime, setMaritalRegime] = useState<MaritalRegime>(simulacao?.marital_regime ?? "solteiro");
  const [existingProtection, setExistingProtection] = useState(
    simulacao?.existing_protection ?? prefill?.existingInsurance?.value ?? 0
  );
  const [monthlyMaintenance, setMonthlyMaintenance] = useState(simulacao?.monthly_maintenance ?? 0);
  const [customDuration, setCustomDuration] = useState(simulacao?.custom_duration_months ?? 36);
  const [scenario, setScenario] = useState<"min" | "max">(simulacao?.scenario ?? "max");
  const [notes, setNotes] = useState(simulacao?.notes ?? "");
  const [name, setName] = useState(simulacao?.client_name ?? clientName ?? "");

  const validAssets = useMemo(() => assets.filter((a) => a.description.trim() && a.value > 0), [assets]);

  const result = useMemo(
    () =>
      calculateSuccessionCosts({
        assets: validAssets,
        maritalRegime,
        existingProtection,
        monthlyMaintenance,
      }),
    [validAssets, maritalRegime, existingProtection, monthlyMaintenance]
  );

  const baseProcessCosts = result.totals[scenario] - result.maintenance[scenario === "min" ? "low" : "high"];
  const liquidityGoal = baseProcessCosts + monthlyMaintenance * customDuration;
  const suggestedCoverage = Math.max(0, liquidityGoal - existingProtection);

  const hasResult = validAssets.length > 0;

  function updateAsset(id: string, patch: Partial<Asset>) {
    setAssets((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)));
  }

  function handleImportedAssets(imported: Asset[]) {
    setAssets((prev) => {
      const meaningful = prev.filter((a) => a.description.trim() || a.value > 0);
      return [...meaningful, ...imported];
    });
  }

  function handleSave() {
    if (!name.trim()) {
      toast.error("Informe o nome do titular.");
      return;
    }
    if (validAssets.length === 0) {
      toast.error("Adicione ao menos um bem com descrição e valor.");
      return;
    }
    startTransition(async () => {
      const res = await saveSucessaoSimulacao({
        id: simulacao?.id,
        client_id: clientId ?? simulacao?.client_id ?? null,
        client_name: name.trim(),
        assets: validAssets,
        marital_regime: maritalRegime,
        existing_protection: existingProtection,
        monthly_maintenance: monthlyMaintenance,
        custom_duration_months: customDuration,
        scenario,
        notes: notes.trim() || null,
      });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Simulação salva.");
      if (!simulacao && res.id) router.push(`/sucessao/${res.id}`);
      else router.refresh();
    });
  }

  function handleCreateOpportunity() {
    if (!simulacao) {
      toast.error("Salve a simulação antes de criar a oportunidade.");
      return;
    }
    startTransition(async () => {
      const res = await createProspectFromSimulacao(simulacao.id);
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
      const res = await deleteSucessaoSimulacao(simulacao.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      router.push("/sucessao");
    });
  }

  return (
    <div className="space-y-6">
      {/* Dados de entrada — só o corretor precisa olhar essa parte */}
      <Card>
        <CardHeader>
          <CardTitle>Dados da simulação</CardTitle>
          <CardDescription>
            {clientId ? "Vinculada ao cliente cadastrado abaixo." : "Pode simular antes mesmo de cadastrar o cliente."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
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
              <Label className="flex items-center gap-1.5">
                Estado civil / regime de bens
                <InfoTooltip>
                  Casado(a) em comunhão parcial ou universal: metade do patrimônio comum já é do cônjuge sobrevivente
                  (meação) e não entra na base de cálculo do ITCMD — só a parte do falecido é tributada. Separação
                  total não reduz a base.
                </InfoTooltip>
              </Label>
              <Select value={maritalRegime} onValueChange={(v) => setMaritalRegime(v as MaritalRegime)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MARITAL_REGIME_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>Bens do patrimônio</Label>
              <div className="flex gap-2">
                <ImportAssetsButton onExtracted={handleImportedAssets} />
                <Button type="button" variant="outline" size="sm" onClick={() => setAssets((prev) => [...prev, newAsset()])}>
                  <Plus className="size-4" />
                  Adicionar bem
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Digite os bens manualmente ou importe de um PDF/foto — declaração de bens do IRPF, relação de bens,
              auto de inventário. A IA lê o documento e preenche a lista abaixo; confira os valores antes de salvar.
            </p>
            <div className="space-y-2">
              {assets.map((asset) => (
                <div key={asset.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center">
                  <Input
                    placeholder="Descrição (ex: Imóvel residencial)"
                    value={asset.description}
                    onChange={(e) => updateAsset(asset.id, { description: e.target.value })}
                    className="sm:flex-1"
                  />
                  <Select value={asset.type} onValueChange={(v) => updateAsset(asset.id, { type: v as AssetType })}>
                    <SelectTrigger className="sm:w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(AssetType).map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    min={0}
                    placeholder="Valor (R$)"
                    value={asset.value || ""}
                    onChange={(e) => updateAsset(asset.id, { value: Number(e.target.value) || 0 })}
                    className="sm:w-40"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Remover bem"
                    onClick={() => setAssets((prev) => prev.filter((a) => a.id !== asset.id))}
                    disabled={assets.length === 1}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="existing_protection" className="flex items-center gap-1.5">
                Seguro de vida / PGBL / VGBL já contratados (R$)
                <InfoTooltip>
                  Nenhum dos dois entra em inventário nem paga ITCMD (Art. 794 do CC e LC 227/2026 para PGBL/VGBL) —
                  esse valor é descontado da meta de liquidez, pra não sugerir cobertura duplicada.
                </InfoTooltip>
              </Label>
              <Input
                id="existing_protection"
                type="number"
                min={0}
                value={existingProtection || ""}
                onChange={(e) => setExistingProtection(Number(e.target.value) || 0)}
                placeholder="0"
              />
              {!simulacao && prefill?.existingInsurance && <PrefillNote field={prefill.existingInsurance} />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="monthly_maintenance" className="flex items-center gap-1.5">
                Custo mensal de manutenção do patrimônio (R$)
                <InfoTooltip>
                  IPTU, condomínio, sustento da família etc. — continua vencendo enquanto os bens ficam bloqueados
                  pelo inventário, então entra na meta de liquidez multiplicado pelo prazo de bloqueio abaixo.
                </InfoTooltip>
              </Label>
              <Input
                id="monthly_maintenance"
                type="number"
                min={0}
                value={monthlyMaintenance || ""}
                onChange={(e) => setMonthlyMaintenance(Number(e.target.value) || 0)}
                placeholder="Ex: IPTU, condomínio, sustento da família"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {hasResult && (
        <>
          {/* O problema primeiro: cenário litigioso em destaque. Os dois cards
              são clicáveis — escolhem qual cenário alimenta a meta de
              liquidez/capital sugerido mais abaixo. */}
          <Card
            role="button"
            tabIndex={0}
            onClick={() => setScenario("max")}
            onKeyDown={(e) => e.key === "Enter" && setScenario("max")}
            className={`cursor-pointer border-destructive/30 bg-destructive/5 transition-all ${scenario === "max" ? "ring-2 ring-destructive" : "opacity-70"}`}
          >
            <CardContent className="space-y-1 pt-6">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
                <AlertTriangle className="size-3.5" />
                Se houver conflito entre os herdeiros (via judicial)
              </p>
              <p className="text-4xl font-bold tracking-tight text-destructive">{formatCurrency(result.totals.max)}</p>
              <p className="text-sm text-muted-foreground">
                Patrimônio avaliado: {formatCurrency(result.totalAssets)}
                {maritalRegime !== "solteiro" && maritalRegime !== "separacao_total"
                  ? ` (base do imposto considera a meação do cônjuge: ${formatCurrency(result.taxableBase)})`
                  : ""}
              </p>
            </CardContent>
          </Card>

          <Card
            role="button"
            tabIndex={0}
            onClick={() => setScenario("min")}
            onKeyDown={(e) => e.key === "Enter" && setScenario("min")}
            className={`cursor-pointer transition-all ${scenario === "min" ? "ring-2 ring-primary" : "opacity-70"}`}
          >
            <CardContent className="flex flex-col gap-2 pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Se o processo for amigável (via administrativa)
                </p>
                <p className="text-2xl font-semibold">{formatCurrency(result.totals.min)}</p>
              </div>
              <p className="max-w-sm text-xs text-muted-foreground">
                A diferença entre os dois cenários não depende de nada que o corretor controle — depende só da
                família entrar em acordo ou não. Clique pra escolher qual cenário vira a meta de liquidez abaixo.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="duration" className="flex shrink-0 items-center gap-1.5">
                  Prazo estimado de bloqueio dos bens
                  <InfoTooltip>
                    Tempo até o inventário terminar e os herdeiros poderem dispor dos bens livremente — padrão de 6
                    meses no cenário amigável e 36 no litigioso, ajustável conforme o caso.
                  </InfoTooltip>
                </Label>
                <span className="text-sm font-semibold">{customDuration} meses</span>
              </div>
              <input
                id="duration"
                type="range"
                min={1}
                max={60}
                value={customDuration}
                onChange={(e) => setCustomDuration(Number(e.target.value))}
                className="w-full accent-primary"
              />
              <p className="text-xs text-muted-foreground">
                Enquanto o inventário corre, alguém precisa continuar pagando IPTU, condomínio e o sustento da
                família — esse custo entra na meta de liquidez abaixo.
              </p>
            </CardContent>
          </Card>

          {/* A solução: capital sugerido + CTA colado */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="space-y-4 pt-6">
              <div>
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  <ShieldCheck className="size-3.5" />
                  Capital de seguro de vida sugerido
                </p>
                <p className="text-5xl font-bold tracking-tight">{formatCurrency(suggestedCoverage)}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Custos do cenário selecionado ({scenario === "max" ? "judicial" : "administrativa"}:{" "}
                  {formatCurrency(baseProcessCosts)}) + manutenção por {customDuration} meses (
                  {formatCurrency(monthlyMaintenance * customDuration)})
                  {existingProtection > 0 ? ` − proteção já contratada (${formatCurrency(existingProtection)})` : ""}.
                  O capital do seguro de vida não entra em inventário nem paga ITCMD (Art. 794 do Código Civil) —
                  fica disponível pra família na hora.
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
                {simulacao && (
                  <ExportSucessaoPdfButton
                    simulacao={{ ...simulacao, client_name: name }}
                    advisorName={advisorName}
                    scenario={scenario}
                    customDuration={customDuration}
                    liquidityGoal={liquidityGoal}
                    suggestedCoverage={suggestedCoverage}
                  />
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Estimativa educativa — não substitui análise individual atuarial/tributária. Valores de ITCMD usam
                uma tabela nacional simplificada (teto de 8%); alíquotas variam por estado.
              </p>
            </CardContent>
          </Card>

          <details className="rounded-md border">
            <summary className="cursor-pointer px-4 py-3 text-sm font-medium">Ver detalhamento por categoria</summary>
            <div className="space-y-6 border-t p-4">
              <SucessaoCharts result={result} />
            </div>
          </details>

          <div className="space-y-2">
            <Label htmlFor="notes">Observações / parecer técnico (aparece no PDF)</Label>
            <Textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Sugerida reserva de liquidez para pagamento do ITCMD sem necessidade de vender imóveis."
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
          Adicione ao menos um bem com descrição e valor pra ver o resultado.{" "}
          <Link href="/sucessao" className="underline underline-offset-2">
            Voltar pro histórico
          </Link>
        </p>
      )}
    </div>
  );
}
