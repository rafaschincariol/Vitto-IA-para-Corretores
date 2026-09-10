import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type LogCategory = "sistema" | "usuario";
export type LogLevel = "info" | "aviso" | "erro";

// Log pro painel admin (/admin/logs), não pro Sentry — mensagens em
// português, prontas pra leitura por alguém não técnico. Nunca deixa um
// erro de log derrubar o fluxo principal do usuário (por isso o
// try/catch engolido aqui, não em cada chamador).
export async function logActivity(
  supabase: SupabaseClient,
  params: {
    tenantId?: string | null;
    category: LogCategory;
    eventType: string;
    message: string;
    level?: LogLevel;
    metadata?: Record<string, unknown>;
  }
) {
  try {
    await supabase.rpc("log_activity", {
      p_tenant_id: params.tenantId ?? null,
      p_category: params.category,
      p_event_type: params.eventType,
      p_message: params.message,
      p_level: params.level ?? "info",
      p_metadata: params.metadata ?? null,
    });
  } catch {
    // Ver comentário acima — logging não pode quebrar a experiência real.
  }
}
