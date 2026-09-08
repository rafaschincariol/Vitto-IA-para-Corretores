"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { createClientRecord, updateClientRecord, type ClientFormState } from "./actions";
import type { Client, Profile } from "@/lib/types";

const initialState: ClientFormState = { error: null };

export function ClientFormDialog({
  client,
  isOwner = false,
  teamMembers = [],
}: {
  client?: Client;
  /** Só Admins escolhem o responsável — Corretores sempre cadastram para si mesmos. */
  isOwner?: boolean;
  teamMembers?: Pick<Profile, "id" | "full_name" | "email">[];
}) {
  const [open, setOpen] = useState(false);
  const action = client ? updateClientRecord.bind(null, client.id) : createClientRecord;
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
        {client ? (
          <Button variant="ghost" size="icon" aria-label="Editar cliente">
            <Pencil className="size-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="size-4" />
            Novo cliente
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{client ? "Editar cliente" : "Novo cliente"}</DialogTitle>
            <DialogDescription>
              {client ? "Atualize os dados do cliente." : "Cadastre um cliente manualmente."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" defaultValue={client?.name} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cpf_cnpj">CPF/CNPJ</Label>
              <Input id="cpf_cnpj" name="cpf_cnpj" defaultValue={client?.cpf_cnpj ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" name="email" type="email" defaultValue={client?.email ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" name="phone" defaultValue={client?.phone ?? ""} />
            </div>
            {isOwner && teamMembers.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="assigned_to">Responsável</Label>
                <Select name="assigned_to" defaultValue={client?.assigned_to ?? undefined}>
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
