"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { cpfCnpjSchema, isValidBrazilianPhone } from "@/lib/validators";
import { generateLeadQualificationAndDraft } from "@/lib/ai/growth-outreach";
import { getGrowthLead } from "@/lib/data/growth";

// Mesmo padrão de admin/tenants/actions.ts: confirma sessão + pertencimento
// a platform_admins antes de qualquer mutação — RLS na tabela (0026) é a
// segunda camada, esta é a primeira (retorna erro amigável em vez de
// deixar a query falhar silenciosamente por RLS).
async function requirePlatformAdminSession() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) throw new Error("not authorized");

  const { data: isAdmin } = await supabase
    .from("platform_admins")
    .select("email")
    .eq("email", user.email)
    .maybeSingle();
  if (!isAdmin) throw new Error("not authorized");

  return { supabase, email: user.email };
}

// Rodapé de descadastro: sempre incluso, nunca deixado a critério da IA (ela
// nem recebe instrução pra gerar isso — ver growth-outreach.ts). Envio real
// (fase 4/Resend) ainda vai adicionar um link de opt-out de um clique aqui;
// por enquanto o texto já deixa claro que basta responder pra ser removido.
const UNSUBSCRIBE_FOOTER =
  "\n\n—\nSe preferir não receber mais contato, é só responder este e-mail pedindo pra remover — atendemos na hora.";

const leadRowSchema = z
  .array(z.unknown())
  .min(1, "A planilha não tem nenhuma linha válida.")
  .max(1000, "Envie no máximo 1000 leads por vez.");

export type BulkImportLeadsState = { error: string | null; inserted: number; skipped: string[] };

// Import em lote de leads via planilha — fonte v1 do motor de aquisição
// (nunca raspagem de terceiros, ver context do plano). Dedup por e-mail via
// unique index (lower(email)) — linha duplicada é silenciosamente pulada,
// nunca sobrescreve um lead já existente (evita perder qualificação/rascunho
// já feito por causa de um re-import acidental).
export async function bulkImportLeads(
  rows: { contact_name: string; email: string; company_name: string | null; phone: string | null; cnpj_cpf: string | null; city: string | null; state: string | null }[]
): Promise<BulkImportLeadsState> {
  const sizeCheck = leadRowSchema.safeParse(rows);
  if (!sizeCheck.success) {
    return { error: sizeCheck.error.issues[0]?.message ?? "Dados inválidos.", inserted: 0, skipped: [] };
  }

  const validRows: typeof rows = [];
  const skipped: string[] = [];

  rows.forEach((row, index) => {
    const contactName = row.contact_name?.trim();
    const email = row.email?.trim().toLowerCase();
    if (!contactName) {
      skipped.push(`Linha ${index + 2}: nome vazio.`);
      return;
    }
    if (!email || !z.string().email().safeParse(email).success) {
      skipped.push(`Linha ${index + 2} (${contactName}): e-mail inválido.`);
      return;
    }
    if (row.cnpj_cpf && !cpfCnpjSchema.safeParse(row.cnpj_cpf).success) {
      skipped.push(`Linha ${index + 2} (${contactName}): CPF/CNPJ inválido.`);
      return;
    }
    if (row.phone && !isValidBrazilianPhone(row.phone)) {
      skipped.push(`Linha ${index + 2} (${contactName}): telefone inválido.`);
      return;
    }
    validRows.push({ ...row, contact_name: contactName, email });
  });

  if (validRows.length === 0) {
    return { error: "Nenhuma linha passou na validação.", inserted: 0, skipped };
  }

  let supabase;
  try {
    ({ supabase } = await requirePlatformAdminSession());
  } catch {
    return { error: "Não autorizado.", inserted: 0, skipped: [] };
  }

  const { error, count } = await supabase
    .from("growth_leads")
    .upsert(
      validRows.map((row) => ({ ...row, source: "csv_import" as const })),
      { onConflict: "email", ignoreDuplicates: true, count: "exact" }
    );

  if (error) return { error: "Não foi possível importar os leads.", inserted: 0, skipped };

  revalidatePath("/admin/growth");
  return { error: null, inserted: count ?? validRows.length, skipped };
}

const updateLeadSchema = z.object({
  id: z.string().uuid(),
  contact_name: z.string().trim().min(1, "Informe o nome do contato."),
  company_name: z.string().trim().optional().or(z.literal("")).transform((v) => v || null),
  email: z.string().trim().toLowerCase().email("E-mail inválido."),
  phone: z.string().trim().optional().or(z.literal("")).transform((v) => v || null),
  cnpj_cpf: z.string().trim().optional().or(z.literal("")).transform((v) => v || null),
  city: z.string().trim().optional().or(z.literal("")).transform((v) => v || null),
  state: z.string().trim().optional().or(z.literal("")).transform((v) => v || null),
  stage: z.enum(["novo", "qualificado", "descartado", "convertido"]),
  notes: z.string().trim().optional().or(z.literal("")).transform((v) => v || null),
});

export type GrowthActionState = { error: string | null };

export async function updateLead(_prevState: GrowthActionState, formData: FormData): Promise<GrowthActionState> {
  const parsed = updateLeadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requirePlatformAdminSession();
  const { id, ...update } = parsed.data;
  const { error } = await supabase.from("growth_leads").update(update).eq("id", id);
  if (error) return { error: "Não foi possível salvar." };

  revalidatePath("/admin/growth");
  return { error: null };
}

export async function deleteLead(id: string): Promise<GrowthActionState> {
  const { supabase } = await requirePlatformAdminSession();
  const { error } = await supabase.from("growth_leads").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir." };

  revalidatePath("/admin/growth");
  return { error: null };
}

export type GenerateDraftState = { error: string | null; draftId: string | null };

// Chama a IA sob demanda (nunca automático) pra qualificar o lead e
// rascunhar uma abordagem. Marca novo→qualificado só se ainda estava em
// "novo" (não sobrescreve um estágio já avançado manualmente). O rascunho
// entra sempre como pending_review — aprovar e enviar são passos manuais
// separados (ver approveDraft e a fase 4/Resend, ainda não implementada).
export async function generateDraftForLead(leadId: string): Promise<GenerateDraftState> {
  const { supabase } = await requirePlatformAdminSession();

  const lead = await getGrowthLead(supabase, leadId);
  if (!lead) return { error: "Lead não encontrado.", draftId: null };

  let draft;
  try {
    draft = await generateLeadQualificationAndDraft(lead);
  } catch {
    return { error: "Não foi possível gerar o rascunho com a IA.", draftId: null };
  }

  const leadUpdate: { qualification_score: number; qualification_notes: string; stage?: "qualificado" } = {
    qualification_score: draft.score,
    qualification_notes: draft.qualification_notes,
  };
  if (lead.stage === "novo") leadUpdate.stage = "qualificado";

  const { error: leadError } = await supabase.from("growth_leads").update(leadUpdate).eq("id", leadId);
  if (leadError) return { error: "Não foi possível salvar a qualificação do lead.", draftId: null };

  const { data: inserted, error: draftError } = await supabase
    .from("growth_outreach_drafts")
    .insert({
      lead_id: leadId,
      subject: draft.subject,
      body: draft.body + UNSUBSCRIBE_FOOTER,
      status: "pending_review",
    })
    .select("id")
    .single();

  if (draftError || !inserted) return { error: "Não foi possível salvar o rascunho.", draftId: null };

  revalidatePath("/admin/growth");
  revalidatePath(`/admin/growth/${leadId}`);
  revalidatePath("/admin/growth/review");
  return { error: null, draftId: inserted.id as string };
}

const updateDraftSchema = z.object({
  id: z.string().uuid(),
  subject: z.string().trim().min(1, "Informe o assunto."),
  body: z.string().trim().min(1, "Informe o corpo do e-mail."),
});

export async function updateDraft(_prevState: GrowthActionState, formData: FormData): Promise<GrowthActionState> {
  const parsed = updateDraftSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { supabase } = await requirePlatformAdminSession();
  const { id, subject, body } = parsed.data;
  const { error } = await supabase
    .from("growth_outreach_drafts")
    .update({ subject, body })
    .eq("id", id)
    .eq("status", "pending_review");
  if (error) return { error: "Não foi possível salvar o rascunho." };

  revalidatePath("/admin/growth/review");
  return { error: null };
}

// Aprovar só marca status — nunca envia. Envio é um passo manual separado
// (fase 4/Resend), de propósito, pra nunca disparar e-mail sem querer.
export async function approveDraft(id: string): Promise<GrowthActionState> {
  const { supabase, email } = await requirePlatformAdminSession();
  const { error } = await supabase
    .from("growth_outreach_drafts")
    .update({ status: "approved", reviewed_by: email, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending_review");
  if (error) return { error: "Não foi possível aprovar o rascunho." };

  revalidatePath("/admin/growth/review");
  return { error: null };
}

export async function rejectDraft(id: string): Promise<GrowthActionState> {
  const { supabase, email } = await requirePlatformAdminSession();
  const { error } = await supabase
    .from("growth_outreach_drafts")
    .update({ status: "rejected", reviewed_by: email, reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "pending_review");
  if (error) return { error: "Não foi possível rejeitar o rascunho." };

  revalidatePath("/admin/growth/review");
  return { error: null };
}
