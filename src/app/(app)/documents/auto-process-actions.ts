"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import { extractPolicyData } from "@/lib/ai/extract-document";
import { ingestDocumentChunks } from "@/lib/ai/ingest-chunks";
import { markFirstPolicyIfNeeded } from "@/lib/funnel-events";

export type AutoProcessResult = {
  error: string | null;
  clientId?: string;
  policyId?: string | null;
  firstPolicy?: boolean;
};

// Upload em lote "zero digitação": chamada uma vez por documento logo após
// o upload (ver document-dropzone.tsx), sem nenhuma tela intermediária. Lê o
// PDF/imagem com IA e já cria cliente + apólice — mas com reviewed=false,
// então ficam sinalizados em /documents/review até o corretor confirmar ou
// descartar. Nunca é escrito como "confirmado" sem essa etapa.
export async function autoProcessDocument(documentId: string): Promise<AutoProcessResult> {
  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const { data: doc, error: docError } = await supabase
    .from("documents")
    .select("storage_path, mime_type, client_id")
    .eq("id", documentId)
    .single<{ storage_path: string; mime_type: string | null; client_id: string | null }>();

  if (docError || !doc) return { error: "Documento não encontrado." };
  if (doc.client_id) return { error: null, clientId: doc.client_id }; // já processado/vinculado

  await supabase.from("documents").update({ status: "pending_ai" }).eq("id", documentId);

  const { data: fileBlob, error: downloadError } = await supabase.storage
    .from("documents")
    .download(doc.storage_path);

  if (downloadError || !fileBlob) {
    await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
    return { error: "Não foi possível baixar o documento." };
  }

  try {
    const bytes = await fileBlob.arrayBuffer();
    const extracted = await extractPolicyData(bytes, doc.mime_type || "application/pdf");

    if (!extracted.client_name) {
      await supabase
        .from("documents")
        .update({ status: "error", extracted_data: extracted })
        .eq("id", documentId);
      return { error: "A IA não conseguiu identificar o cliente neste documento." };
    }

    const { data: client, error: clientError } = await supabase
      .from("clients")
      .insert({
        tenant_id: tenant.id,
        name: extracted.client_name,
        cpf_cnpj: extracted.cpf_cnpj,
        email: extracted.client_email,
        phone: extracted.client_phone,
        assigned_to: profile.id,
        created_by: profile.id,
        ai_created: true,
        reviewed: false,
      })
      .select("id")
      .single<{ id: string }>();

    if (clientError || !client) {
      await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
      return { error: "Não foi possível criar o cliente automaticamente." };
    }

    let policyId: string | null = null;
    const hasPolicyData = Boolean(
      extracted.insurer && extracted.policy_number && extracted.start_date && extracted.end_date
    );

    if (hasPolicyData) {
      const { data: policy, error: policyError } = await supabase
        .from("policies")
        .insert({
          tenant_id: tenant.id,
          client_id: client.id,
          insurer: extracted.insurer,
          policy_number: extracted.policy_number,
          policy_type: extracted.policy_type,
          premium_total: extracted.premium_total,
          start_date: extracted.start_date,
          end_date: extracted.end_date,
          status: "ativo",
          created_by: profile.id,
          ai_created: true,
          reviewed: false,
        })
        .select("id")
        .single<{ id: string }>();

      if (!policyError && policy) policyId = policy.id;
    }

    await supabase
      .from("documents")
      .update({ status: "extracted", extracted_data: extracted, client_id: client.id, policy_id: policyId })
      .eq("id", documentId);

    await ingestDocumentChunks(supabase, tenant.id, documentId, extracted.full_text);

    const firstPolicy = policyId ? await markFirstPolicyIfNeeded(supabase, tenant.id) : false;

    revalidatePath("/documents");
    revalidatePath("/documents/review");
    revalidatePath("/clients");
    revalidatePath("/policies");

    return { error: null, clientId: client.id, policyId, firstPolicy };
  } catch {
    await supabase.from("documents").update({ status: "error" }).eq("id", documentId);
    return { error: "Não foi possível extrair os dados do documento com a IA." };
  }
}
