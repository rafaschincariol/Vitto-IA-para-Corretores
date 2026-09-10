"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { askAssistant, type AssistantAnswer, type ChatMessage } from "@/lib/ai/assistant";
import { logActivity } from "@/lib/log-activity";

export async function sendChatMessage(question: string, history: ChatMessage[]): Promise<AssistantAnswer> {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  try {
    return await askAssistant(supabase, tenant.id, question, history);
  } catch (err) {
    await logActivity(supabase, {
      tenantId: tenant.id,
      category: "sistema",
      eventType: "assistant_failed",
      level: "erro",
      message: "O assistente de IA falhou ao responder uma pergunta.",
      metadata: { error: err instanceof Error ? err.message : String(err) },
    });
    return {
      answer: "Não foi possível gerar uma resposta agora. Tente novamente em instantes.",
      citations: [],
    };
  }
}

export async function getCitationUrl(documentId: string): Promise<string | null> {
  const supabase = await createSupabaseClient();
  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path")
    .eq("id", documentId)
    .single<{ storage_path: string }>();

  if (!doc) return null;

  const { data } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
  return data?.signedUrl ?? null;
}
