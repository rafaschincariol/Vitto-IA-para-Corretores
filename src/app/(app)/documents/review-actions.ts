"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";

const reviewSchema = z.object({
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

export type ReviewFormState = { error: string | null };

// Confirma a revisão de um documento (com ou sem prefill de IA — ver
// extract-actions.ts) criando o cliente e, se os campos da apólice foram
// preenchidos, a apólice também, vinculando o documento a ambos.
export async function createClientAndPolicyFromDocument(
  documentId: string,
  _prevState: ReviewFormState,
  formData: FormData
): Promise<ReviewFormState> {
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { name, cpf_cnpj, email, phone, insurer, policy_number, policy_type, premium_total, start_date, end_date } =
    parsed.data;

  const hasPolicyData = Boolean(insurer || policy_number || start_date || end_date);
  if (hasPolicyData && (!insurer || !policy_number || !start_date || !end_date)) {
    return { error: "Para cadastrar a apólice, preencha seguradora, número e as datas de vigência." };
  }
  if (hasPolicyData && start_date! > end_date!) {
    return { error: "A data de fim precisa ser igual ou posterior à data de início." };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({ name, cpf_cnpj, email, phone, tenant_id: tenant.id, created_by: profile.id })
    .select("id")
    .single<{ id: string }>();

  if (clientError || !client) return { error: "Não foi possível salvar o cliente." };

  let policyId: string | null = null;
  if (hasPolicyData) {
    const { data: policy, error: policyError } = await supabase
      .from("policies")
      .insert({
        tenant_id: tenant.id,
        client_id: client.id,
        insurer: insurer!,
        policy_number: policy_number!,
        policy_type,
        premium_total,
        start_date: start_date!,
        end_date: end_date!,
        status: "ativo",
        created_by: profile.id,
      })
      .select("id")
      .single<{ id: string }>();

    if (policyError || !policy) {
      return { error: "Cliente criado, mas não foi possível salvar a apólice." };
    }
    policyId = policy.id;
  }

  const { error: linkError } = await supabase
    .from("documents")
    .update({ client_id: client.id, policy_id: policyId })
    .eq("id", documentId);

  if (linkError) return { error: "Cadastro criado, mas não foi possível vincular o documento." };

  revalidatePath("/clients");
  revalidatePath("/policies");
  revalidatePath("/documents");
  return { error: null };
}
