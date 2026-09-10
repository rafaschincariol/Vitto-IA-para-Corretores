"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { updatePassword } from "../actions";

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState(updatePassword, { error: null });
  const [confirmMismatch, setConfirmMismatch] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Definir nova senha</CardTitle>
        <CardDescription>Escolha uma nova senha para sua conta.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          action={formAction}
          onSubmit={(e) => {
            const form = e.currentTarget;
            const password = (form.elements.namedItem("password") as HTMLInputElement).value;
            const confirm = (form.elements.namedItem("confirm_password") as HTMLInputElement).value;
            if (password !== confirm) {
              e.preventDefault();
              setConfirmMismatch(true);
              return;
            }
            setConfirmMismatch(false);
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label htmlFor="password">Nova senha</Label>
            <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm_password">Confirmar nova senha</Label>
            <Input id="confirm_password" name="confirm_password" type="password" autoComplete="new-password" minLength={8} required />
          </div>
          {confirmMismatch && <p className="text-sm text-destructive">As senhas não coincidem.</p>}
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Salvando..." : "Salvar nova senha"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
