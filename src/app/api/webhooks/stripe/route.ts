import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getStripeClient } from "@/lib/billing/stripe";

// Único lugar do projeto que usa a service_role key do Supabase — de
// propósito. Em todo o resto do app, quem autentica uma escrita é uma
// sessão de usuário (e a RLS decide o que ela pode tocar); aqui não existe
// sessão nenhuma, quem está chamando é o Stripe. A autenticação da escrita é
// a assinatura criptográfica do webhook (verificada abaixo, antes de
// qualquer coisa), não uma sessão — por isso a service_role (que ignora RLS)
// é o jeito certo aqui, e só aqui.
function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
}

const RELEVANT_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
]);

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Assinatura ausente." }, { status: 400 });
  }

  const stripe = getStripeClient();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  if (!RELEVANT_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true });
  }

  const subscription = event.data.object as Stripe.Subscription;
  const customerId = typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  const currentPeriodEnd = subscription.items.data[0]?.current_period_end;

  const supabase = createAdminClient();
  const { error } = await supabase
    .from("tenant_subscriptions")
    .update({
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_end: currentPeriodEnd ? new Date(currentPeriodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", customerId);

  if (error) {
    return NextResponse.json({ error: "Falha ao atualizar assinatura." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
