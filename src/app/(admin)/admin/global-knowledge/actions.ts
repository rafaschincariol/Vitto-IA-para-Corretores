"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { chunkText } from "@/lib/ai/chunk-text";
import { embedTexts, toVectorLiteral } from "@/lib/ai/embeddings";

const schema = z.object({
  source_name: z.string().trim().min(1, "Informe o nome da fonte (ex: nome da seguradora/manual)."),
  content: z.string().trim().min(20, "Cole um texto com pelo menos 20 caracteres."),
});

export type GlobalKnowledgeState = { error: string | null };

// Escrita na base GLOBAL (compartilhada entre tenants) — a RLS de
// global_chunks já restringe isso a quem está em public.platform_admins,
// então esta action falha silenciosamente para qualquer outra pessoa mesmo
// que, por algum bug de UI, chegue a ser chamada.
export async function ingestGlobalKnowledge(
  _prevState: GlobalKnowledgeState,
  formData: FormData
): Promise<GlobalKnowledgeState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Sessão expirada." };

  const chunks = chunkText(parsed.data.content);
  let embeddings: number[][];
  try {
    embeddings = await embedTexts(chunks, "document");
  } catch {
    return { error: "Não foi possível gerar os embeddings (verifique a chave da Voyage AI)." };
  }

  const rows = chunks.map((content, i) => ({
    source_name: parsed.data.source_name,
    chunk_index: i,
    content,
    embedding: toVectorLiteral(embeddings[i]),
    created_by: user.email,
  }));

  const { error } = await supabase.from("global_chunks").insert(rows);

  if (error) {
    return {
      error:
        "Não foi possível salvar. Confirme que seu e-mail está na tabela platform_admins (ver README).",
    };
  }

  revalidatePath("/admin/global-knowledge");
  return { error: null };
}
