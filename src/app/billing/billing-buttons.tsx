"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { createCheckoutSession, createBillingPortalSession, type BillingActionState } from "./actions";

const initialState: BillingActionState = { error: null };

export function SubscribeButton() {
  const [state, formAction, pending] = useActionState(createCheckoutSession, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" disabled={pending} size="lg">
        {pending ? "Redirecionando..." : "Assinar — R$ 49,99/mês"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}

export function ManageSubscriptionButton() {
  const [state, formAction, pending] = useActionState(createBillingPortalSession, initialState);

  return (
    <form action={formAction} className="space-y-2">
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Redirecionando..." : "Gerenciar assinatura"}
      </Button>
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
