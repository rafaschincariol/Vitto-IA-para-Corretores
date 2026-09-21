"use client";

import { useActionState, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Trash2 } from "lucide-react";
import { updateLead, deleteLead, generateDraftForLead } from "../actions";
import {
  GROWTH_STAGE_LABELS,
  GROWTH_SUSEP_STATUS_LABELS,
  type GrowthLead,
  type GrowthLeadStage,
  type GrowthOutreachDraft,
} from "@/lib/types";

const DRAFT_STATUS_LABELS: Record<GrowthOutreachDraft["status"], string> = {
  pending_review: "Aguardando revisão",
  approved: "Aprovado",
  rejected: "Rejeitado",
  sent: "Enviado",
};

export function LeadDetail({ lead, drafts }: { lead: GrowthLead; drafts: GrowthOutreachDraft[] }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(updateLead, { error: null });
  const [generating, startGenerating] = useTransition();
  const [generateError, setGenerateError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("Excluir este lead?")) return;
    const res = await deleteLead(lead.id);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    router.push("/admin/growth");
  }

  function handleGenerateDraft() {
    setGenerateError(null);
    startGenerating(async () => {
      const res = await generateDraftForLead(lead.id);
      if (res.error) {
        setGenerateError(res.error);
        return;
      }
      toast.success("Rascunho gerado — revise na fila de aprovação.");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Dados do lead</CardTitle>
          <CardDescription>Status SUSEP: {GROWTH_SUSEP_STATUS_LABELS[lead.susep_status]}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="id" value={lead.id} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contact_name">Nome do contato</Label>
                <Input id="contact_name" name="contact_name" defaultValue={lead.contact_name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input id="email" name="email" type="email" defaultValue={lead.email} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_name">Empresa</Label>
                <Input id="company_name" name="company_name" defaultValue={lead.company_name ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" defaultValue={lead.phone ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj_cpf">CPF/CNPJ</Label>
                <Input id="cnpj_cpf" name="cnpj_cpf" defaultValue={lead.cnpj_cpf ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stage">Etapa</Label>
                <Select name="stage" defaultValue={lead.stage}>
                  <SelectTrigger id="stage" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(GROWTH_STAGE_LABELS) as [GrowthLeadStage, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">Cidade</Label>
                <Input id="city" name="city" defaultValue={lead.city ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">UF</Label>
                <Input id="state" name="state" maxLength={2} defaultValue={lead.state ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" rows={3} defaultValue={lead.notes ?? ""} />
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
            <div className="flex items-center justify-between">
              <Button type="submit" disabled={pending}>
                {pending ? "Salvando..." : "Salvar alterações"}
              </Button>
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleDelete}>
                <Trash2 className="size-4" />
                Excluir lead
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Qualificação e abordagem por IA</CardTitle>
            <CardDescription>
              {lead.qualification_notes ? `Score: ${lead.qualification_score ?? "—"}/100` : "Ainda não gerado."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {lead.qualification_notes && <p className="text-sm text-muted-foreground">{lead.qualification_notes}</p>}
            {generateError && <p className="text-sm text-destructive">{generateError}</p>}
            <Button type="button" onClick={handleGenerateDraft} disabled={generating}>
              <Sparkles className="size-4" />
              {generating ? "Gerando..." : drafts.length > 0 ? "Gerar novo rascunho" : "Gerar rascunho de abordagem"}
            </Button>
          </CardContent>
        </Card>

        {drafts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Rascunhos de e-mail</CardTitle>
              <CardDescription>Revise e aprove na fila de aprovação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {drafts.map((draft) => (
                <div key={draft.id} className="flex items-center justify-between gap-2 rounded-md border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{draft.subject}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(draft.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant="outline">{DRAFT_STATUS_LABELS[draft.status]}</Badge>
                </div>
              ))}
              {drafts.some((d) => d.status === "pending_review") && (
                <Button variant="link" asChild className="px-0">
                  <Link href="/admin/growth/review">Ir para a fila de aprovação</Link>
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
