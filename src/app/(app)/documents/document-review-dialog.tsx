"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { extractDocumentData } from "./extract-actions";
import { createClientAndPolicyFromDocument, type ReviewFormState } from "./review-actions";
import type { ExtractedPolicyData } from "@/lib/ai/extract-document";

const initialState: ReviewFormState = { error: null };

export function DocumentReviewDialog({ documentId, filename }: { documentId: string; filename: string }) {
  const [open, setOpen] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [extracted, setExtracted] = useState<ExtractedPolicyData | null>(null);
  const [aiFailed, setAiFailed] = useState(false);

  const action = createClientAndPolicyFromDocument.bind(null, documentId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (pending) submittedRef.current = true;
    if (!pending && submittedRef.current && !state.error) {
      submittedRef.current = false;
      setOpen(false);
    }
  }, [pending, state]);

  async function handleTriggerClick() {
    setExtracting(true);
    setAiFailed(false);
    const result = await extractDocumentData(documentId);
    setExtracting(false);
    if (result.error || !result.data) {
      setAiFailed(true);
      setExtracted(null);
      toast.error(result.error ?? "Não foi possível extrair os dados. Preencha manualmente.");
    } else {
      setExtracted(result.data);
    }
    setOpen(true);
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={handleTriggerClick} disabled={extracting}>
        {extracting ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
        {extracting ? "Lendo com IA..." : "Extrair com IA"}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>Revisar cadastro</DialogTitle>
            <DialogDescription>
              {aiFailed
                ? `Não deu para ler "${filename}" automaticamente — preencha os dados manualmente.`
                : `Dados lidos por IA a partir de "${filename}". Confira e ajuste antes de salvar.`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm font-medium">Cliente</p>
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={extracted?.client_name ?? ""} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
                <Input id="cpf_cnpj" name="cpf_cnpj" defaultValue={extracted?.cpf_cnpj ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" name="phone" defaultValue={extracted?.client_phone ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={extracted?.client_email ?? ""} />
            </div>

            <Separator />

            <p className="text-sm font-medium">Apólice (opcional)</p>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insurer">Seguradora</Label>
                <Input id="insurer" name="insurer" defaultValue={extracted?.insurer ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policy_type">Tipo</Label>
                <Input id="policy_type" name="policy_type" defaultValue={extracted?.policy_type ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="policy_number">Número da apólice</Label>
              <Input id="policy_number" name="policy_number" defaultValue={extracted?.policy_number ?? ""} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Início da vigência</Label>
                <Input id="start_date" name="start_date" type="date" defaultValue={extracted?.start_date ?? ""} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fim da vigência</Label>
                <Input id="end_date" name="end_date" type="date" defaultValue={extracted?.end_date ?? ""} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="premium_total">Prêmio total (R$)</Label>
              <Input
                id="premium_total"
                name="premium_total"
                type="number"
                step="0.01"
                min="0"
                defaultValue={extracted?.premium_total ?? ""}
              />
            </div>

            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar cadastro"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      </Dialog>
    </>
  );
}
