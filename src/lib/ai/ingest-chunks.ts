import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { chunkText } from "./chunk-text";
import { embedTexts, toVectorLiteral } from "./embeddings";

// Indexação é "best-effort": se a Voyage falhar (sem chave configurada,
// fora do ar, etc.), engolimos o erro e seguimos — o cliente/apólice já foi
// salvo antes disso, o RAG só fica sem esse documento até uma nova tentativa.
export async function ingestDocumentChunks(
  supabase: SupabaseClient,
  tenantId: string,
  documentId: string,
  text: string | null
): Promise<void> {
  if (!text) return;

  const chunks = chunkText(text);
  if (chunks.length === 0) return;

  let embeddings: number[][];
  try {
    embeddings = await embedTexts(chunks, "document");
  } catch {
    return;
  }

  const rows = chunks.map((content, i) => ({
    tenant_id: tenantId,
    document_id: documentId,
    chunk_index: i,
    content,
    embedding: toVectorLiteral(embeddings[i]),
  }));

  await supabase.from("document_chunks").insert(rows);
}
