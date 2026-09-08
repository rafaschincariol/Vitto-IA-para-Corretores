"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { getTenantSubscription } from "@/lib/data/billing";
import { getStripeClient } from "@/lib/billing/stripe";

export type BillingActionState = { error: string | null };

export async function createCheckoutSession(
  _prevState: BillingActionState
): Promise<BillingActionState> {
  const { profile, tenant } = await requireProfile();
  if (profile.role !== "owner") {
    return { error: "Só o Admin da corretora pode assinar." };
  }

  const supabase = await createSupabaseClient();
  const subscription = await getTenantSubscription(supabase, tenant.id);
  const stripe = getStripeClient();
  const origin = (await headers()).get("origin");

  let customerId = subscription?.stripe_customer_id ?? null;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: profile.email,
      name: tenant.name,
      metadata: { tenant_id: tenant.id },
    });
    customerId = customer.id;

    const { error } = await supabase.rpc("set_tenant_stripe_customer", {
      p_tenant_id: tenant.id,
      p_customer_id: customerId,
    });
    if (error) return { error: "Não foi possível iniciar a assinatura." };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${origin}/billing?success=1`,
    cancel_url: `${origin}/billing`,
  });

  if (!session.url) return { error: "Não foi possível iniciar a assinatura." };
  redirect(session.url);
}

export async function createBillingPortalSession(
  _prevState: BillingActionState
): Promise<BillingActionState> {
  const { profile, tenant } = await requireProfile();
  if (profile.role !== "owner") {
    return { error: "Só o Admin da corretora pode gerenciar a assinatura." };
  }

  const supabase = await createSupabaseClient();
  const subscription = await getTenantSubscription(supabase, tenant.id);
  if (!subscription?.stripe_customer_id) {
    return { error: "Nenhuma assinatura encontrada." };
  }

  const stripe = getStripeClient();
  const origin = (await headers()).get("origin");

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripe_customer_id,
    return_url: `${origin}/billing`,
  });

  redirect(session.url);
}
