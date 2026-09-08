"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/data/auth";

const clientSchema = z.object({
  name: z.string().trim().min(1, "Informe o nome do cliente."),
  cpf_cnpj: z.string().trim().optional().transform((v) => v || null),
  email: z.string().trim().email("E-mail inválido.").optional().or(z.literal("")).transform((v) => v || null),
  phone: z.string().trim().optional().transform((v) => v || null),
  assigned_to: z.string().uuid().optional().or(z.literal("")).transform((v) => v || null),
});

export type ClientFormState = { error: string | null };

export async function createClientRecord(
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const { error } = await supabase.from("clients").insert({
    ...parsed.data,
    // Corretor comum só cadastra para si mesmo; só Admin escolhe outro responsável.
    assigned_to: profile.role === "owner" ? parsed.data.assigned_to || profile.id : profile.id,
    tenant_id: tenant.id,
    created_by: profile.id,
  });

  if (error) return { error: "Não foi possível salvar o cliente." };

  revalidatePath("/clients");
  return { error: null };
}

export async function updateClientRecord(
  id: string,
  _prevState: ClientFormState,
  formData: FormData
): Promise<ClientFormState> {
  const parsed = clientSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }

  const { profile } = await requireProfile();
  const supabase = await createSupabaseClient();

  const update: Partial<typeof parsed.data> = { ...parsed.data };
  // RLS já bloqueia um Corretor tentando reatribuir para outra pessoa, mas
  // nem mostramos o campo pra ele — só o Admin decide isso pela UI.
  if (profile.role !== "owner") delete update.assigned_to;

  const { error } = await supabase.from("clients").update(update).eq("id", id);

  if (error) return { error: "Não foi possível atualizar o cliente." };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { error: null };
}

export async function deleteClientRecord(id: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);

  if (error) return { error: "Não foi possível excluir o cliente. Verifique se ele não tem apólices vinculadas." };

  revalidatePath("/clients");
  return { error: null };
}

const bulkClientSchema = z
  .array(
    z.object({
      name: z.string().trim().min(1),
      cpf_cnpj: z.string().trim().nullable(),
      email: z.string().trim().nullable(),
      phone: z.string().trim().nullable(),
    })
  )
  .min(1, "A planilha não tem nenhuma linha válida.")
  .max(1000, "Envie no máximo 1000 clientes por vez.");

export type BulkImportState = { error: string | null; inserted: number };

// Importação em lote de clientes via planilha (Excel/CSV) — o parsing
// acontece no navegador (ver clients/parse-spreadsheet.ts); esta action só
// recebe as linhas já normalizadas e grava.
export async function bulkCreateClients(
  rows: { name: string; cpf_cnpj: string | null; email: string | null; phone: string | null }[]
): Promise<BulkImportState> {
  const parsed = bulkClientSchema.safeParse(rows);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Dados inválidos.", inserted: 0 };
  }

  const { profile, tenant } = await requireProfile();
  const supabase = await createSupabaseClient();

  const { error, count } = await supabase
    .from("clients")
    .insert(
      parsed.data.map((row) => ({ ...row, tenant_id: tenant.id, created_by: profile.id })),
      { count: "exact" }
    );

  if (error) return { error: "Não foi possível importar os clientes.", inserted: 0 };

  revalidatePath("/clients");
  return { error: null, inserted: count ?? parsed.data.length };
}
