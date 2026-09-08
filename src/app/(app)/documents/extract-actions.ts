"use server";

import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { extractPolicyData, type ExtractedPolicyData } from "@/lib/ai/extract-document";
import { ingestDocumentChunks } from "@/lib/ai/ingest-chunks";

export type ExtractResult = { data: ExtractedPolicyData | null; error: string | null };

// Chamada sob demanda a partir de "Extrair com IA" em (app)/documents. Guarda
// o resultado em documents.extracted_data para não rechamar o modelo se o
// corretor reabrir a revisão antes de confirmar o cadastro.
export async function extractDocumentData(documentId: string): Promise<ExtractResult> {
  const supabase = await createSupabaseClient();

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("storage_path, mime_type, extracted_data")
    .eq("id", documentId)
    .single<{ storage_path: string; mime_type: string | null; extracted_data: ExtractedPolicyData | null }>();

  if (docError || !doc) return { data: null, error: "Documento não encontrado." };

  if (doc.extracted_data) {
    return { data: doc.extracted_data, error: null };
  }

  await supabase.from("documents").update({ status: "pending_ai" }).eq("id", documentId);

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("documents")
    .download(doc.storage_path);

  if (downloadError || !fileBlob) {
    await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
    return { data: null, error: "Não foi possível baixar o documento." };
  }

  try {
    const bytes = await fileBlob.arrayBuffer();
    const extracted = await extractPolicyData(bytes, doc.mime_type || "application/pdf");

    await supabase
      .from("documents")
      .update({ status: "extracted", extracted_data: extracted })
      .eq("id", documentId);

    const { tenant } = await requireProfile();
    await ingestDocumentChunks(supabase, tenant.id, documentId, extracted.full_text);

    return { data: extracted, error: null };
  } catch {
    await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
    return { data: null, error: "Não foi possível extrair os dados do documento com a IA." };
  }
}
