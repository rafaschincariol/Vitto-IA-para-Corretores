"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteAccount, type DeleteAccountState } from "./actions";

const initialState: DeleteAccountState = { error: null };

export function DangerZone({ tenantName }: { tenantName: string }) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState(deleteAccount, initialState);

  return (
    <Card className="border-destructive/40">
      <CardHeader>
        <CardTitle className="text-destructive">Zona de perigo</CardTitle>
        <CardDescription>
          Encerrar a conta cancela a assinatura na hora e agenda a exclusão definitiva de todos
          os clientes, apólices, documentos e do acesso de toda a equipe para <strong>30 dias</strong>{" "}
          a partir de hoje. O acesso fica bloqueado imediatamente. Dentro desse prazo, entre em
          contato com o suporte para cancelar a exclusão.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
            Encerrar conta e agendar exclusão dos dados
          </Button>
          <DialogContent>
            <form action={formAction}>
              <DialogHeader>
                <DialogTitle>Encerrar a conta de {tenantName}?</DialogTitle>
                <DialogDescription>
                  A assinatura é cancelada na hora e o acesso é bloqueado imediatamente. Todos os
                  dados da corretora são apagados definitivamente em 30 dias — dá tempo de
                  cancelar pelo suporte se for engano. Para confirmar, digite o nome da corretora
                  abaixo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 py-2">
                <Label htmlFor="confirm_name">Nome da corretora</Label>
                <Input id="confirm_name" name="confirm_name" placeholder={tenantName} required />
              </div>
              {state.error && <p className="text-sm text-destructive">{state.error}</p>}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
                  Cancelar
                </Button>
                <Button type="submit" variant="destructive" disabled={pending}>
                  {pending ? "Encerrando..." : "Encerrar conta e agendar exclusão"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
