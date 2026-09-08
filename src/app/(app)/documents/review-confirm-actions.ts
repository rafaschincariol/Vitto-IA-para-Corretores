"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import type { ExtractedPolicyData } from "@/lib/ai/extract-document";

const confirmSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do cliente."),
  cpf_cnpj: z.string().trim().optional().transform((v) => v || null),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")).transform((v) => v || null),
  phone: z.string().trim().optional().transform((v) => v || null),
  insurer: z.string().trim().optional().transform((v) => v || null),
  policy_number: z.string().trim().optional().transform((v) => v || null),
  policy_type: z.string().trim().optional().transform((v) => v || null),
  premium_total: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v.replace(",", ".")) : null))
    .refine((v) => v === null || !Number.isNaN(v), "Prêmio inválido."),
  start_date: z.string().optional().transform((v) => v || null),
  end_date: z.string().optional().transform((v) => v || null),
});

export type ConfirmFormState = { error: string | null };

// Mapeia campo do formulário -> chave correspondente no extracted_data (para
// comparar com o que a IA leu originalmente e alimentar o feedback loop).
const FIELD_TO_EXTRACTED_KEY: Record<string, keyof ExtractedPolicyData> = {
  name: "client_name",
  cpf_cnpj: "cpf_cnpj",
  email: "client_email",
  phone: "client_phone",
  insurer: "insurer",
  policy_number: "policy_number",
  policy_type: "policy_type",
  premium_total: "premium_total",
  start_date: "start_date",
  end_date: "end_date",
};

export async function confirmReviewedRecord(
  clientId: string,
  policyId: string | null,
  _prevState: ConfirmFormState,
  formData: FormData
): Promise<ConfirmFormState> {
  const parsed = confirmSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const { name, cpf_cnpj, email, phone, insurer, policy_number, policy_type, premium_total, start_date, end_date } =
    parsed.data;

  // Documento de origem (para registrar o feedback comparando com o que a
  // IA leu originalmente).
  const { data: sourceDoc } = await supabase
    .from("documents")
    .select("id, extracted_data")
    .eq("client_id", clientId)
    .not("extracted_data", "is", null)
    .limit(1)
    .maybeSingle<{ id: string; extracted_data: ExtractedPolicyData }>();

  const formValues: Record<string, string | number | null> = {
    name,
    cpf_cnpj,
    email,
    phone,
    insurer,
    policy_number,
    policy_type,
    premium_total,
    start_date,
    end_date,
  };

  const feedbackRows = sourceDoc
    ? Object.entries(FIELD_TO_EXTRACTED_KEY)
        .map(([field, extractedKey]) => {
          const aiValue = sourceDoc.extracted_data?.[extractedKey];
          const correctedValue = formValues[field];
          const aiStr = aiValue === null || aiValue === undefined ? null : String(aiValue);
          const correctedStr = correctedValue === null || correctedValue === undefined ? null : String(correctedValue);
          if (aiStr === correctedStr) return null;
          return {
            tenant_id: tenant.id,
            document_id: sourceDoc.id,
            client_id: clientId,
            policy_id: policyId,
            field_name: field,
            ai_value: aiStr,
            corrected_value: correctedStr,
            corrected_by: profile.id,
          };
        })
        .filter((row): row is NonNullable<typeof row> => row !== null)
    : [];

  if (feedbackRows.length > 0) {
    await supabase.from("ai_extraction_feedback").insert(feedbackRows);
  }

  const { error: clientError } = await supabase
    .from("clients")
    .update({ name, cpf_cnpj, email, phone, reviewed: true })
    .eq("id", clientId);

  if (clientError) return { error: "Não foi possível salvar o cliente." };

  if (policyId && insurer && policy_number && start_date && end_date) {
    const { error: policyError } = await supabase
      .from("policies")
      .update({ insurer, policy_number, policy_type, premium_total, start_date, end_date, reviewed: true })
      .eq("id", policyId);

    if (policyError) return { error: "Cliente salvo, mas não foi possível salvar a apólice." };
  }

  revalidatePath("/documents/review");
  revalidatePath("/clients");
  revalidatePath("/policies");
  return { error: null };
}

// Descarta o cadastro criado automaticamente (dado ruim/duplicado): apaga
// cliente e apólice; o documento original volta a ficar sem cliente
// vinculado (FK on delete set null), pronto para tentar de novo.
export async function discardReviewRecord(clientId: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("clients").delete().eq("id", clientId);

  if (error) return { error: "Não foi possível descartar o cadastro." };

  revalidatePath("/documents/review");
  revalidatePath("/documents");
  revalidatePath("/clients");
  return { error: null };
}
