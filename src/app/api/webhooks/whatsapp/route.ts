import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeToE164Br } from "@/lib/growth/whatsapp";
import type { GrowthOutreachEventType } from "@/lib/types";

// Handshake de verificação que a Meta chama uma vez ao cadastrar a URL do
// webhook no app — precisa ecoar hub.challenge de volta se o verify_token
// bater (https://developers.facebook.com/docs/graph-api/webhooks/getting-started).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && challenge && token === process.env.META_WEBHOOK_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }
  return new NextResponse(null, { status: 403 });
}

// A Meta não tem SDK oficial pra Node — a verificação de
// X-Hub-Signature-256 (HMAC-SHA256 do corpo cru com o App Secret) é manual,
// diferente do Resend/Stripe que têm helper de biblioteca.
function isValidSignature(body: string, signatureHeader: string | null): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret) return false;

  const expected = crypto.createHmac("sha256", appSecret).update(body).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const signatureBuffer = Buffer.from(signatureHeader.slice("sha256=".length), "hex");
  if (expectedBuffer.length !== signatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedBuffer, signatureBuffer);
}

const STATUS_EVENT_TYPES: GrowthOutreachEventType[] = ["sent", "delivered", "read", "failed"];

type WhatsappStatus = { id: string; status: string; recipient_id: string };
type WhatsappMessage = { from: string };
type WhatsappWebhookPayload = {
  entry?: { changes?: { value?: { statuses?: WhatsappStatus[]; messages?: WhatsappMessage[] } }[] }[];
};

export async function POST(request: Request) {
  const body = await request.text();
  if (!isValidSignature(body, request.headers.get("x-hub-signature-256"))) {
    return NextResponse.json({ error: "Assinatura inválida." }, { status: 400 });
  }

  const payload = JSON.parse(body) as WhatsappWebhookPayload;
  const supabase = createAdminClient();

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const status of change.value?.statuses ?? []) {
        const eventType = STATUS_EVENT_TYPES.find((t) => t === status.status);
        if (!eventType) continue;

        const { data: draft } = await supabase
          .from("growth_outreach_drafts")
          .select("id")
          .eq("provider_message_id", status.id)
          .eq("channel", "whatsapp")
          .maybeSingle();
        if (!draft) continue;

        await supabase.from("growth_outreach_events").insert({ draft_id: draft.id, event_type: eventType, metadata: status });

        if (eventType === "failed") {
          await supabase.from("growth_suppressions").upsert(
            { channel: "whatsapp", contact: status.recipient_id, reason: "failed" },
            { onConflict: "channel,contact", ignoreDuplicates: true }
          );
        }
      }

      for (const message of change.value?.messages ?? []) {
        const draftId = await findMostRecentSentDraftIdForPhone(supabase, message.from);
        if (!draftId) continue;
        await supabase.from("growth_outreach_events").insert({ draft_id: draftId, event_type: "replied", metadata: message });
      }
    }
  }

  return NextResponse.json({ received: true });
}

// Não dá pra casar uma resposta recebida com um draft por provider_message_id
// (esse é o id da mensagem QUE A GENTE mandou, a resposta tem um id novo) —
// então casa pelo telefone normalizado do lead e pega o envio mais recente.
async function findMostRecentSentDraftIdForPhone(
  supabase: ReturnType<typeof createAdminClient>,
  fromPhone: string
): Promise<string | null> {
  const { data: leads } = await supabase.from("growth_leads").select("id, phone").not("phone", "is", null);
  const lead = (leads ?? []).find((l) => normalizeToE164Br(l.phone ?? "") === fromPhone);
  if (!lead) return null;

  const { data: draft } = await supabase
    .from("growth_outreach_drafts")
    .select("id")
    .eq("lead_id", lead.id)
    .eq("channel", "whatsapp")
    .eq("status", "sent")
    .order("sent_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return draft?.id ?? null;
}
