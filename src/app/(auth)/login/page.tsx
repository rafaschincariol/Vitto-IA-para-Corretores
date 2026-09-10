"use client";

import { Suspense, useActionState, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { trackEvent } from "@/lib/analytics";
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
import { signInWithPassword, resendConfirmationEmail } from "../actions";

// Sem `sent` travando o disabled pra sempre: se o segundo e-mail também não
// chegar (rate limit, pasta errada), a pessoa precisa conseguir tentar de
// novo, não ficar presa num botão morto.
function ResendConfirmation({ email }: { email: string }) {
  const [pending, setPending] = useState(false);
  const [sentOnce, setSentOnce] = useState(false);

  async function handleResend() {
    setPending(true);
    const result = await resendConfirmationEmail(email);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setSentOnce(true);
    toast.success("E-mail reenviado.");
  }

  return (
    <Button type="button" variant="link" className="h-auto p-0 text-sm" onClick={handleResend} disabled={pending}>
      {pending ? "Reenviando..." : sentOnce ? "Reenviar de novo" : "Reenviar e-mail de confirmação"}
    </Button>
  );
}

// Usado quando o link de confirmação chega expirado/inválido no callback —
// nesse ponto não temos mais o e-mail na URL, então pedimos de novo.
function ExpiredLinkResend() {
  const [email, setEmail] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!email) return;
    setPending(true);
    const result = await resendConfirmationEmail(email);
    setPending(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <p className="text-sm text-muted-foreground">
        Enviamos um novo e-mail de confirmação — confira sua caixa de entrada (e o spam).
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
      <Input
        type="email"
        placeholder="Seu e-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        className="h-9"
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Enviando..." : "Reenviar confirmação"}
      </Button>
    </form>
  );
}

function StatusBanner() {
  const searchParams = useSearchParams();
  const confirm = searchParams.get("confirm");
  const email = searchParams.get("email");
  const reset = searchParams.get("reset");

  // Dispara uma vez só, quando a tela carrega vindo do cadastro — é aqui
  // que marcamos a conversão pro Google/Meta Ads (ver
  // src/lib/analytics.ts), não dentro da Server Action de signup, porque
  // dataLayer só existe no navegador.
  useEffect(() => {
    // Nome não é "sign_up_completed": nesse ponto o cadastro foi só
    // submetido, o e-mail ainda não foi confirmado (isso é o evento
    // "email_confirmed", disparado depois — ver FunnelBeacon). Nome errado
    // aqui inflaria a taxa de conversão de cadastro nos relatórios.
    if (confirm === "1") trackEvent("signup_submitted");
  }, [confirm]);

  if (confirm === "1") {
    return (
      <div className="space-y-2 rounded-md bg-muted p-3 text-sm text-muted-foreground">
        <p>Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.</p>
        <p>Não chegou? Confira a caixa de spam/lixo eletrônico.</p>
        {email && <ResendConfirmation email={email} />}
      </div>
    );
  }

  if (searchParams.get("error") === "auth") {
    return (
      <div className="space-y-2 rounded-md bg-destructive/10 p-3 text-sm">
        <p className="text-destructive">Link de confirmação expirado ou inválido.</p>
        <p className="text-muted-foreground">Informe seu e-mail pra receber um novo link.</p>
        <ExpiredLinkResend />
      </div>
    );
  }

  if (reset === "requested") {
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Se esse e-mail tiver uma conta, enviamos um link para redefinir a senha.
      </p>
    );
  }

  if (reset === "success") {
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Senha redefinida! Entre com sua nova senha.
      </p>
    );
  }

  if (searchParams.get("deletion_scheduled") === "1") {
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Exclusão agendada. Sua conta e todos os dados serão apagados definitivamente em 30 dias.
        Entre em contato com o suporte antes disso se quiser cancelar.
      </p>
    );
  }

  return null;
}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(signInWithPassword, { error: null });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse o painel da sua corretora.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Suspense fallback={null}>
          <StatusBanner />
        </Suspense>

        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" autoComplete="email" required />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground">
                Esqueci minha senha
              </Link>
            </div>
            <Input id="password" name="password" type="password" autoComplete="current-password" required />
          </div>
          {state.error && <p className="text-sm text-destructive">{state.error}</p>}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Entrando..." : "Entrar"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Ainda não tem conta?&nbsp;
        <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
          Criar conta
        </Link>
      </CardFooter>
    </Card>
  );
}
