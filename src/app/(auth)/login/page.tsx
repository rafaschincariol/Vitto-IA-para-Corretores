"use client";

import { Suspense, useActionState } from "react";
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
import { signInWithPassword } from "../actions";

function StatusBanner() {
  const searchParams = useSearchParams();
  const confirm = searchParams.get("confirm");
  const reset = searchParams.get("reset");

  if (confirm === "1") {
    return (
      <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Conta criada! Verifique seu e-mail para confirmar o cadastro antes de entrar.
      </p>
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
