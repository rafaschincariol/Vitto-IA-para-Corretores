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
          Encerrar a conta apaga permanentemente todos os clientes, apólices, documentos e o
          acesso de toda a equipe — inclui o cancelamento da assinatura, se houver. Não tem como
          desfazer.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Dialog open={open} onOpenChange={setOpen}>
          <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
            Encerrar conta e apagar todos os dados
          </Button>
          <DialogContent>
            <form action={formAction}>
              <DialogHeader>
                <DialogTitle>Encerrar a conta de {tenantName}?</DialogTitle>
                <DialogDescription>
                  Isso apaga permanentemente todos os clientes, apólices e documentos da
                  corretora, cancela a assinatura e remove o acesso de todos os membros da
                  equipe. Para confirmar, digite o nome da corretora abaixo.
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
                  {pending ? "Encerrando..." : "Encerrar conta permanentemente"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
