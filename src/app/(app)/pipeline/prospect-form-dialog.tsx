"use client";

import { type ReactNode, useActionState, useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
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
import { createProspect, deleteProspect, updateProspect, type ProspectFormState } from "./actions";
import type { PipelineStage, Profile, Prospect } from "@/lib/types";

const initialState: ProspectFormState = { error: null };

export function ProspectFormDialog({
  prospect,
  stages,
  isOwner = false,
  teamMembers = [],
  trigger,
}: {
  prospect?: Prospect;
  stages: PipelineStage[];
  isOwner?: boolean;
  teamMembers?: Pick<Profile, "id" | "full_name" | "email">[];
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const action = prospect ? updateProspect.bind(null, prospect.id) : createProspect;
  const [state, formAction, pending] = useActionState(action, initialState);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (pending) submittedRef.current = true;
    if (!pending && submittedRef.current && !state.error) {
      submittedRef.current = false;
      setOpen(false);
    }
  }, [pending, state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button>
            <Plus className="size-4" />
            Novo prospect
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{prospect ? "Editar prospect" : "Novo prospect"}</DialogTitle>
            <DialogDescription>
              {prospect ? "Atualize os dados do prospect." : "Cadastre um novo prospect no funil."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={prospect?.name} required />
            </div>
            {!prospect && (
              <div className="space-y-2">
                <Label htmlFor="stage_id">Etapa</Label>
                <Select name="stage_id" defaultValue={stages[0]?.id}>
                  <SelectTrigger id="stage_id" className="w-full">
                    <SelectValue placeholder="Selecione a etapa" />
                  </SelectTrigger>
                  <SelectContent>
                    {stages.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="insurance_type">Tipo de seguro</Label>
                <Input
                  id="insurance_type"
                  name="insurance_type"
                  placeholder="Auto, vida, residencial..."
                  defaultValue={prospect?.insurance_type ?? ""}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estimated_value">Valor estimado</Label>
                <Input
                  id="estimated_value"
                  name="estimated_value"
                  placeholder="0,00"
                  defaultValue={prospect?.estimated_value ?? ""}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input
                id="cpf_cnpj"
                name="cpf_cnpj"
                placeholder="000.000.000-00 ou 00.000.000/0000-00"
                defaultValue={prospect?.cpf_cnpj ?? ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={prospect?.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                placeholder="(11) 91234-5678"
                defaultValue={prospect?.phone ?? ""}
              />
            </div>
            {isOwner && teamMembers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Responsável</Label>
                <Select name="assigned_to" defaultValue={prospect?.assigned_to ?? undefined}>
                  <SelectTrigger id="assigned_to" className="w-full">
                    <SelectValue placeholder="Selecione um responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.full_name ?? m.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <Textarea id="notes" name="notes" rows={3} defaultValue={prospect?.notes ?? ""} />
            </div>
            {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          </div>

          <DialogFooter className="gap-2 sm:justify-between">
            {prospect && (
              <Button
                type="button"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                disabled={deleting}
                onClick={() => {
                  if (!window.confirm("Excluir este prospect? Esta ação não pode ser desfeita.")) return;
                  setDeleting(true);
                  deleteProspect(prospect.id).then(() => {
                    setDeleting(false);
                    setOpen(false);
                  });
                }}
              >
                {deleting ? "Excluindo..." : "Excluir"}
              </Button>
            )}
            <Button type="submit" disabled={pending}>
              {pending ? "Salvando..." : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
