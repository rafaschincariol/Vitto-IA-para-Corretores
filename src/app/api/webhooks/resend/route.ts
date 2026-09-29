import { NextResponse } from "next/server";
import { Webhook } from "svix";
import { createAdminClient } from "@/lib/supabase/admin";
import type { GrowthOutreachEventType } from "@/lib/types";

// Mesmo raciocínio do webhook do Stripe (src/app/api/webhooks/stripe/route.ts):
// não há sessão de usuário aqui, quem autentica a escrita é a assinatura
// criptográfica do evento (verificada abaixo), então a service_role é o
// jeito certo — RLS não se aplica a uma chamada do próprio Resend.
const EVENT_TYPE_MAP: Record<string, GrowthOutreachEventType> = {
  "email.sent": "sent",
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
};

type ResendWebhookEvent = { type: string; data: { email_id: string; [key: string]: unknown } };

export async function POST(request: Request) {
  const body = await request.text();
  const svixHeaders = {
    "svix-id": request.headers.get("svix-id") ?? "",
    "svix-timestamp": request.headers.get("svix-timestamp") ?? "",
    "svix-signature": request.headers.get("svix-signature") ?? "",
  };

  const webhook = new Webhook(process.env.RESEND_WEBHOOK_SECRET!);
  let event: ResendWebhookEvent;
  try {
    event = webhook.verify(body, svixHeaders) as ResendWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const eventType = EVENT_TYPE_MAP[event.type];
  if (!eventType) return NextResponse.json({ received: true });

  const supabase = createAdminClient();
  const { data: draft } = await supabase
    .from("growth_outreach_drafts")
    .select("id, lead:growth_leads(email)")
    .eq("provider_message_id", event.data.email_id)
    .eq("channel", "email")
    .maybeSingle<{ id: string; lead: { email: string } }>();
  if (!draft) return NextResponse.json({ received: true });

  await supabase.from("growth_outreach_events").insert({ draft_id: draft.id, event_type: eventType, metadata: event.data });

  if (eventType === "bounced" || eventType === "complained") {
    await supabase.from("growth_suppressions").upsert(
      {
        channel: "email",
        contact: draft.lead.email,
        reason: eventType === "bounced" ? "bounced" : "complained",
      },
      { onConflict: "channel,contact", ignoreDuplicates: true }
    );
  }

  return NextResponse.json({ received: true });
}
