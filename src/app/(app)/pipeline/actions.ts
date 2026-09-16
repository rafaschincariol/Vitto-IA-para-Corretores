"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";
import {
  cpfCnpjSchema,
  phoneSchema,
  optionalMoneySchema,
  isValidCpfCnpj,
  isValidBrazilianPhone,
} from "@/lib/validators";

const prospectSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do prospect."),
  cpf_cnpj: cpfCnpjSchema,
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")).transform((v) => v || null),
  phone: phoneSchema,
  estimated_value: optionalMoneySchema,
  insurance_type: z.string().trim().optional().transform((v) => v || null),
  notes: z.string().trim().optional().transform((v) => v || null),
  stage_id: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
  assigned_to: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
});

export type ProspectFormState = { error: string | null };

async function firstStageId(supabase: Awaited<ReturnType<typeof createSupabaseClient>>, tenantId: string) {
  const { data } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("position", { ascending: true })
    .limit(1)
    .maybeSingle<{ id: string }>();
  return data?.id ?? null;
}

export async function createProspect(
  _prevState: ProspectFormState,
  formData: FormData
): Promise<ProspectFormState> {
  const parsed = prospectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const stageId = parsed.data.stage_id ?? (await firstStageId(supabase, tenant.id));
  if (!stageId) return { error: "Nenhuma etapa do funil encontrada." };

  const { error } = await supabase.from("prospects").insert({
    ...parsed.data,
    stage_id: stageId,
    assigned_to: profile.role === "owner" ? parsed.data.assigned_to || profile.id : profile.id,
    tenant_id: tenant.id,
    created_by: profile.id,
  });

  if (error) return { error: "Não foi possível salvar o prospect." };

  revalidatePath("/pipeline");
  return { error: null };
}

export async function updateProspect(
  id: string,
  _prevState: ProspectFormState,
  formData: FormData
): Promise<ProspectFormState> {
  const parsed = prospectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { profile } = await requireProfile();
  const supabase = await createSupabaseClient();

  // Mudança de etapa passa por moveProspectStage (registra histórico) — aqui
  // só os dados cadastrais do prospect são atualizados.
  const { name, cpf_cnpj, email, phone, estimated_value, insurance_type, notes, assigned_to } = parsed.data;
  const update: Partial<typeof parsed.data> = { name, cpf_cnpj, email, phone, estimated_value, insurance_type, notes };
  if (profile.role === "owner") update.assigned_to = assigned_to;

  const { error } = await supabase.from("prospects").update(update).eq("id", id);

  if (error) return { error: "Não foi possível atualizar o prospect." };

  revalidatePath("/pipeline");
  return { error: null };
}

export async function deleteProspect(id: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("prospects").delete().eq("id", id);

  if (error) return { error: "Não foi possível excluir o prospect." };

  revalidatePath("/pipeline");
  return { error: null };
}

// Move um prospect pra outra etapa e grava a transição no histórico (base
// pros índices de conversão). A etapa de origem é lida do banco, nunca
// aceita do cliente — o card na tela pode estar desatualizado. Não mexe em
// "position" — isso é responsabilidade de reorderProspectsInStage, chamada
// logo em seguida pelo board depois do drop.
export async function moveProspectStage(
  prospectId: string,
  newStageId: string
): Promise<{ error: string | null }> {
  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const { data: current } = await supabase
    .from("prospects")
    .select("stage_id")
    .eq("id", prospectId)
    .maybeSingle<{ stage_id: string }>();

  if (!current) return { error: "Prospect não encontrado." };
  if (current.stage_id === newStageId) return { error: null };

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name")
    .eq("tenant_id", tenant.id)
    .in("id", [current.stage_id, newStageId])
    .returns<{ id: string; name: string }[]>();

  const fromStage = stages?.find((s) => s.id === current.stage_id);
  const toStage = stages?.find((s) => s.id === newStageId);
  if (!toStage) return { error: "Etapa de destino inválida." };

  const { error: updateError } = await supabase
    .from("prospects")
    .update({ stage_id: newStageId, stage_changed_at: new Date().toISOString() })
    .eq("id", prospectId);

  if (updateError) return { error: "Não foi possível mover o prospect." };

  await supabase.from("prospect_stage_history").insert({
    tenant_id: tenant.id,
    prospect_id: prospectId,
    from_stage_id: fromStage?.id ?? null,
    from_stage_name: fromStage?.name ?? null,
    to_stage_id: toStage.id,
    to_stage_name: toStage.name,
    changed_by: profile.id,
  });

  revalidatePath("/pipeline");
  revalidatePath("/pipeline/analytics");
  return { error: null };
}

// Renumera a posição (0..n-1) dos prospects de uma etapa, na ordem recebida
// do board depois de um drag-and-drop. RLS garante que só linhas visíveis ao
// usuário são de fato atualizadas.
export async function reorderProspectsInStage(orderedProspectIds: string[]): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();

  const results = await Promise.all(
    orderedProspectIds.map((id, index) => supabase.from("prospects").update({ position: index }).eq("id", id))
  );

  if (results.some((r) => r.error)) return { error: "Não foi possível salvar a ordem dos cards." };

  revalidatePath("/pipeline");
  return { error: null };
}

const stageNameSchema = z.string().trim().min(1, "Informe o nome da etapa.").max(60, "Nome muito longo.");

export async function createStage(name: string): Promise<{ error: string | null }> {
  const parsed = stageNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };

  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const { data: last } = await supabase
    .from("pipeline_stages")
    .select("position")
    .eq("tenant_id", tenant.id)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle<{ position: number }>();

  const { error } = await supabase.from("pipeline_stages").insert({
    tenant_id: tenant.id,
    name: parsed.data,
    position: (last?.position ?? -1) + 1,
  });

  if (error) return { error: "Não foi possível criar a etapa." };

  revalidatePath("/pipeline");
  return { error: null };
}

export async function renameStage(id: string, name: string): Promise<{ error: string | null }> {
  const parsed = stageNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Nome inválido." };

  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("pipeline_stages").update({ name: parsed.data }).eq("id", id);

  if (error) return { error: "Não foi possível renomear a etapa." };

  revalidatePath("/pipeline");
  return { error: null };
}

export async function reorderStage(id: string, direction: "up" | "down"): Promise<{ error: string | null }> {
  const { tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const { data: allStages } = await supabase
    .from("pipeline_stages")
    .select("id, position")
    .eq("tenant_id", tenant.id)
    .order("position", { ascending: true })
    .returns<{ id: string; position: number }[]>();

  if (!allStages) return { error: "Não foi possível reordenar." };

  const index = allStages.findIndex((s) => s.id === id);
  const swapIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || swapIndex < 0 || swapIndex >= allStages.length) {
    return { error: null };
  }

  const a = allStages[index];
  const b = allStages[swapIndex];

  const [{ error: errorA }, { error: errorB }] = await Promise.all([
    supabase.from("pipeline_stages").update({ position: b.position }).eq("id", a.id),
    supabase.from("pipeline_stages").update({ position: a.position }).eq("id", b.id),
  ]);

  if (errorA || errorB) return { error: "Não foi possível reordenar." };

  revalidatePath("/pipeline");
  return { error: null };
}

export async function deleteStage(id: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();

  const { count } = await supabase
    .from("prospects")
    .select("id", { count: "exact", head: true })
    .eq("stage_id", id);

  if (count && count > 0) {
    return { error: `Mova os ${count} prospect(s) dessa etapa antes de excluí-la.` };
  }

  const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
  if (error) return { error: "Não foi possível excluir a etapa." };

  revalidatePath("/pipeline");
  return { error: null };
}

export type ParsedProspectRow = {
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
  estimated_value: number | null;
  insurance_type: string | null;
  stage_name: string | null;
};

const bulkRowSchema = z
  .array(z.unknown())
  .min(1, "A planilha não tem nenhuma linha válida.")
  .max(1000, "Envie no máximo 1000 prospects por vez.");

export type BulkImportState = { error: string | null; inserted: number; skipped: string[] };

// Mesmo padrão de bulkCreateClients (clients/actions.ts): parsing no
// navegador, revalidação completa aqui. A coluna "etapa" é opcional — quando
// ausente ou sem correspondência, cai na primeira etapa por posição.
export async function bulkCreateProspects(rows: ParsedProspectRow[]): Promise<BulkImportState> {
  const sizeCheck = bulkRowSchema.safeParse(rows);
  if (!sizeCheck.success) {
    return { error: sizeCheck.error.issues[0]?.message ?? "Dados inválidos.", inserted: 0, skipped: [] };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id, name, position")
    .eq("tenant_id", tenant.id)
    .order("position", { ascending: true })
    .returns<{ id: string; name: string; position: number }[]>();

  if (!stages || stages.length === 0) {
    return { error: "Crie ao menos uma etapa do funil antes de importar.", inserted: 0, skipped: [] };
  }
  const stageByName = new Map(stages.map((s) => [s.name.trim().toLowerCase(), s.id]));
  const defaultStageId = stages[0].id;

  const validRows: Record<string, unknown>[] = [];
  const skipped: string[] = [];

  rows.forEach((row, index) => {
    const name = row.name?.trim();
    if (!name) {
      skipped.push(`Linha ${index + 2}: nome vazio.`);
      return;
    }
    if (row.cpf_cnpj && !isValidCpfCnpj(row.cpf_cnpj)) {
      skipped.push(`Linha ${index + 2} (${name}): CPF/CNPJ inválido.`);
      return;
    }
    if (row.email && !z.string().email().safeParse(row.email).success) {
      skipped.push(`Linha ${index + 2} (${name}): e-mail inválido.`);
      return;
    }
    if (row.phone && !isValidBrazilianPhone(row.phone)) {
      skipped.push(`Linha ${index + 2} (${name}): telefone inválido.`);
      return;
    }

    const stageId = row.stage_name ? stageByName.get(row.stage_name.trim().toLowerCase()) ?? defaultStageId : defaultStageId;

    validRows.push({
      name,
      cpf_cnpj: row.cpf_cnpj || null,
      email: row.email || null,
      phone: row.phone || null,
      estimated_value: row.estimated_value ?? null,
      insurance_type: row.insurance_type || null,
      stage_id: stageId,
    });
  });

  if (validRows.length === 0) {
    return { error: "Nenhuma linha passou na validação.", inserted: 0, skipped };
  }

  const { error, count } = await supabase
    .from("prospects")
    .insert(
      validRows.map((row) => ({ ...row, tenant_id: tenant.id, created_by: profile.id, assigned_to: profile.id })),
      { count: "exact" }
    );

  if (error) return { error: "Não foi possível importar os prospects.", inserted: 0, skipped };

  revalidatePath("/pipeline");
  return { error: null, inserted: count ?? validRows.length, skipped };
}
