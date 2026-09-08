"use client";

import { useActionState, useState, useTransition } from "react";
import { toast } from "sonner";
import { Check, ExternalLink, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { confirmReviewedRecord, discardReviewRecord, type ConfirmFormState } from "../review-confirm-actions";
import { getSignedDocumentUrl } from "../actions";
import type { Client, Policy } from "@/lib/types";

const initialState: ConfirmFormState = { error: null };

export function ReviewCard({
  client,
  policy,
  documentFilename,
  storagePath,
}: {
  client: Client;
  policy: Policy | null;
  documentFilename: string | null;
  storagePath: string | null;
}) {
  const action = confirmReviewedRecord.bind(null, client.id, policy?.id ?? null);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [discarding, startDiscard] = useTransition();
  const [opening, setOpening] = useState(false);

  async function openOriginal() {
    if (!storagePath) return;
    setOpening(true);
    const url = await getSignedDocumentUrl(storagePath);
    setOpening(false);
    if (!url) {
      toast.error("Não foi possível abrir o documento.");
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleDiscard() {
    if (!window.confirm("Descartar este cadastro criado pela IA? O documento volta a ficar sem cliente vinculado.")) {
      return;
    }
    startDiscard(async () => {
      const result = await discardReviewRecord(client.id);
      if (result.error) toast.error(result.error);
      else toast.success("Cadastro descartado.");
    });
  }

  return (
    <Card>
      <form action={formAction}>
        <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
          <CardTitle className="text-base">Novo cadastro (IA)</CardTitle>
          {documentFilename && (
            <Button type="button" variant="ghost" size="sm" onClick={openOriginal} disabled={opening}>
              <ExternalLink className="size-3.5" />
              {documentFilename}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor={`name-${client.id}`}>Nome</Label>
              <Input id={`name-${client.id}`} name="name" defaultValue={client.name} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`cpf-${client.id}`}>CPF/CNPJ</Label>
              <Input id={`cpf-${client.id}`} name="cpf_cnpj" defaultValue={client.cpf_cnpj ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`phone-${client.id}`}>Telefone</Label>
              <Input id={`phone-${client.id}`} name="phone" defaultValue={client.phone ?? ""} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor={`email-${client.id}`}>E-mail</Label>
              <Input id={`email-${client.id}`} name="email" type="email" defaultValue={client.email ?? ""} />
            </div>
          </div>

          {policy && (
            <div className="grid grid-cols-2 gap-3 border-t pt-4">
              <div className="space-y-1.5">
                <Label htmlFor={`insurer-${policy.id}`}>Seguradora</Label>
                <Input id={`insurer-${policy.id}`} name="insurer" defaultValue={policy.insurer} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`type-${policy.id}`}>Tipo</Label>
                <Input id={`type-${policy.id}`} name="policy_type" defaultValue={policy.policy_type ?? ""} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor={`num-${policy.id}`}>Número da apólice</Label>
                <Input id={`num-${policy.id}`} name="policy_number" defaultValue={policy.policy_number} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`start-${policy.id}`}>Início</Label>
                <Input id={`start-${policy.id}`} name="start_date" type="date" defaultValue={policy.start_date} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`end-${policy.id}`}>Fim</Label>
                <Input id={`end-${policy.id}`} name="end_date" type="date" defaultValue={policy.end_date} />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label htmlFor={`premium-${policy.id}`}>Prêmio total (R$)</Label>
                <Input
                  id={`premium-${policy.id}`}
                  name="premium_total"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={policy.premium_total ?? ""}
                />
              </div>
            </div>
          )}

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        </CardContent>
        <CardFooter className="justify-between">
          <Button type="button" variant="ghost" onClick={handleDiscard} disabled={discarding}>
            <Trash2 className="size-4 text-destructive" />
            Descartar
          </Button>
          <Button type="submit" disabled={pending}>
            <Check className="size-4" />
            {pending ? "Confirmando..." : "Confirmar"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
