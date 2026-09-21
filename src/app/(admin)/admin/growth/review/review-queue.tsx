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
import { Check, X } from "lucide-react";
import { updateDraft, approveDraft, rejectDraft, type GrowthActionState } from "../actions";
import type { PendingDraftRow } from "@/lib/data/growth";

// Editável (assunto/corpo) até aprovar — depois disso o texto congela pra
// refletir exatamente o que foi aprovado (fase 4/Resend envia esse texto).
function PendingDraftCard({ draft }: { draft: PendingDraftRow }) {
  const router = useRouter();
  const [state, formAction, savingDraft] = useActionState<GrowthActionState, FormData>(updateDraft, { error: null });
  const [deciding, startDeciding] = useTransition();

  function handleDecision(action: (id: string) => Promise<GrowthActionState>, successMessage: string) {
    startDeciding(async () => {
      const res = await action(draft.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success(successMessage);
      router.refresh();
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Link href={`/admin/growth/${draft.lead.id}`} className="underline-offset-4 hover:underline">
            {draft.lead.contact_name}
          </Link>
        </CardTitle>
        <CardDescription>
          {draft.lead.company_name ?? draft.lead.email} · {new Date(draft.created_at).toLocaleDateString("pt-BR")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form action={formAction} className="space-y-3">
          <input type="hidden" name="id" value={draft.id} />
          <div className="space-y-2">
            <Label htmlFor={`subject-${draft.id}`}>Assunto</Label>
            <Input id={`subject-${draft.id}`} name="subject" defaultValue={draft.subject} />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`body-${draft.id}`}>Corpo</Label>
            <Textarea id={`body-${draft.id}`} name="body" rows={8} defaultValue={draft.body} />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" variant="outline" size="sm" disabled={savingDraft}>
              {savingDraft ? "Salvando..." : "Salvar edição"}
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={deciding}
              onClick={() => handleDecision(approveDraft, "Rascunho aprovado.")}
            >
              <Check className="size-4" />
              Aprovar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              disabled={deciding}
              onClick={() => handleDecision(rejectDraft, "Rascunho rejeitado.")}
            >
              <X className="size-4" />
              Rejeitar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export function ReviewQueue({ pending, approved }: { pending: PendingDraftRow[]; approved: PendingDraftRow[] }) {
  const [tab, setTab] = useState<"pending" | "approved">("pending");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant={tab === "pending" ? "default" : "outline"} size="sm" onClick={() => setTab("pending")}>
          Aguardando revisão ({pending.length})
        </Button>
        <Button variant={tab === "approved" ? "default" : "outline"} size="sm" onClick={() => setTab("approved")}>
          Aprovados, aguardando envio ({approved.length})
        </Button>
      </div>

      {tab === "pending" && (
        <div className="grid gap-4 lg:grid-cols-2">
          {pending.length === 0 && <p className="text-sm text-muted-foreground">Nenhum rascunho pendente.</p>}
          {pending.map((draft) => (
            <PendingDraftCard key={draft.id} draft={draft} />
          ))}
        </div>
      )}

      {tab === "approved" && (
        <div className="space-y-3">
          {approved.length === 0 && <p className="text-sm text-muted-foreground">Nenhum rascunho aprovado ainda.</p>}
          {approved.map((draft) => (
            <Card key={draft.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  <Link href={`/admin/growth/${draft.lead.id}`} className="underline-offset-4 hover:underline">
                    {draft.lead.contact_name}
                  </Link>
                </CardTitle>
                <CardDescription>{draft.subject}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Aprovado em {draft.reviewed_at ? new Date(draft.reviewed_at).toLocaleDateString("pt-BR") : "—"} por{" "}
                  {draft.reviewed_by}. Envio ainda não está disponível — chega na próxima etapa (integração com o
                  Resend).
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
