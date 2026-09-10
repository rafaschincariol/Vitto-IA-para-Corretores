"use client";

import { Suspense, useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signUpWithPassword } from "../actions";
import { getInviteInfo, type InviteInfo } from "../invite-actions";

function SignupForm() {
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get("invite");
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [loadingInvite, setLoadingInvite] = useState(Boolean(inviteToken));
  const [state, formAction, pending] = useActionState(signUpWithPassword, { error: null });

  useEffect(() => {
    if (!inviteToken) return;
    getInviteInfo(inviteToken).then((info) => {
      setInvite(info);
      setLoadingInvite(false);
    });
  }, [inviteToken]);

  if (loadingInvite) {
    return <p className="text-sm text-muted-foreground">Carregando convite...</p>;
  }

  const inviteInvalid = Boolean(inviteToken) && !invite?.valid;

  return (
    <>
      {inviteToken && invite?.valid && (
        <p className="mb-4 rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Você foi convidado para <strong>{invite.tenantName}</strong> como {invite.roleLabel}.
        </p>
      )}
      {inviteInvalid && (
        <p className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          Este convite não é mais válido. Peça um novo link para o Admin da corretora.
        </p>
      )}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="invite_token" value={inviteToken ?? ""} />

        {!inviteToken && (
          <div className="space-y-2">
            <Label htmlFor="tenant_name">Nome da corretora</Label>
            <Input id="tenant_name" name="tenant_name" required />
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="full_name">Seu nome</Label>
          <Input id="full_name" name="full_name" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">E-mail</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue={invite?.email ?? ""}
            readOnly={Boolean(invite?.valid)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />
        </div>
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="terms_accepted"
            name="terms_accepted"
            required
            className="mt-0.5 size-4 shrink-0 rounded border-input accent-foreground"
          />
          <Label htmlFor="terms_accepted" className="block text-sm leading-normal font-normal text-muted-foreground">
            Li e aceito os{" "}
            <Link href="/terms" target="_blank" className="font-medium text-foreground underline underline-offset-4">
              Termos de Uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacy" target="_blank" className="font-medium text-foreground underline underline-offset-4">
              Política de Privacidade
            </Link>
            .
          </Label>
        </div>
        {state.error && <p className="text-sm text-destructive">{state.error}</p>}
        <Button type="submit" className="w-full" disabled={pending || inviteInvalid}>
          {pending ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>
    </>
  );
}

export default function SignupPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Comece a usar o painel da sua corretora.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
          <SignupForm />
        </Suspense>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Já tem conta?&nbsp;
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          Entrar
        </Link>
      </CardFooter>
    </Card>
  );
}
