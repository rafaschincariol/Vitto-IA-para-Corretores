"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createPolicyRecord, updatePolicyRecord, type PolicyFormState } from "./actions";
import { POLICY_STATUS_LABELS, type Policy, type PolicyStatus } from "@/lib/types";
import { trackEvent } from "@/lib/analytics";

const initialState: PolicyFormState = { error: null };
const STATUS_OPTIONS = Object.entries(POLICY_STATUS_LABELS) as [PolicyStatus, string][];

export function PolicyFormDialog({
  clients,
  defaultClientId,
  policy,
}: {
  clients: { id: string; name: string }[];
  defaultClientId?: string;
  policy?: Policy;
}) {
  const [open, setOpen] = useState(false);
  const action = policy
    ? updatePolicyRecord.bind(null, policy.id, policy.client_id)
    : createPolicyRecord;
  const [state, formAction, pending] = useActionState(action, initialState);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (pending) submittedRef.current = true;
    if (!pending && submittedRef.current && !state.error) {
      submittedRef.current = false;
      if (state.firstPolicy) trackEvent("first_policy_created");
      setOpen(false);
    }
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {policy ? (
          <Button variant="ghost" size="icon" aria-label="Editar apólice">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" />
            Nova apólice
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{policy ? "Editar apólice" : "Nova apólice"}</DialogTitle>
            <DialogDescription>Cadastro manual dos dados da apólice.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="client_id">Cliente</Label>
              <Select name="client_id" defaultValue={policy?.client_id ?? defaultClientId} required>
                <SelectTrigger id="client_id" className="w-full">
                  <SelectValue placeholder="Selecione um cliente" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insurer">Seguradora</Label>
                <Input id="insurer" name="insurer" defaultValue={policy?.insurer} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="policy_type">Tipo</Label>
                <Input
                  id="policy_type"
                  name="policy_type"
                  placeholder="Auto, Vida, Residencial..."
                  defaultValue={policy?.policy_type ?? ""}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="policy_number">Número da apólice</Label>
              <Input id="policy_number" name="policy_number" defaultValue={policy?.policy_number} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_date">Início da vigência</Label>
                <Input
                  id="start_date"
                  name="start_date"
                  type="date"
                  defaultValue={policy?.start_date}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Fim da vigência</Label>
                <Input id="end_date" name="end_date" type="date" defaultValue={policy?.end_date} required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="premium_total">Prêmio total (R$)</Label>
                <Input
                  id="premium_total"
                  name="premium_total"
                  type="number"
                  step="0.01"
                  min="0"
                  defaultValue={policy?.premium_total ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select name="status" defaultValue={policy?.status ?? "ativo"} required>
                  <SelectTrigger id="status" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Observações</Label>
              <Textarea id="notes" name="notes" defaultValue={policy?.notes ?? ""} rows={3} />
            </div>

            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
