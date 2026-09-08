"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient as createSupabaseClient } from "@/lib/supabase/server";

const documentSchema = z.object({
  storage_path: z.string().min(1),
  original_filename: z.string().min(1),
  mime_type: z.string().optional().transform((v) => v || null),
  file_size: z
    .number()
    .optional()
    .transform((v) => v ?? null),
  client_id: z
    .string()
    .optional()
    .transform((v) => v || null),
  policy_id: z
    .string()
    .optional()
    .transform((v) => v || null),
});

// O upload em si (bytes do arquivo) acontece direto do navegador para o
// Supabase Storage (client component) — Server Actions têm limite de corpo
// de ~1MB por padrão, pequeno demais para PDFs/fotos de apólice. Esta action
// só grava a linha de metadados depois que o arquivo já está no Storage.
export async function createDocumentRecord(input: z.input<typeof documentSchema>) {
  const parsed = documentSchema.safeParse(input);
  if (!parsed.success) return { error: "Dados de upload inválidos." };

  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sessão expirada." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single<{ tenant_id: string }>();
  if (!profile) return { error: "Sessão expirada." };

  const { data: document, error } = await supabase
    .from("documents")
    .insert({
      ...parsed.data,
      tenant_id: profile.tenant_id,
      uploaded_by: user.id,
    })
    .select("id")
    .single<{ id: string }>();

  if (error || !document) return { error: "Não foi possível registrar o documento." };

  revalidatePath("/documents");
  if (parsed.data.client_id) revalidatePath(`/clients/${parsed.data.client_id}`);
  return { error: null, documentId: document.id };
}

export async function deleteDocumentRecord(id: string): Promise<{ error: string | null }> {
  const supabase = await createSupabaseClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("storage_path, client_id")
    .eq("id", id)
    .single<{ storage_path: string; client_id: string | null }>();

  if (!doc) return { error: "Documento não encontrado." };

  await supabase.storage.from("documents").remove([doc.storage_path]);
  const { error } = await supabase.from("documents").delete().eq("id", id);

  if (error) return { error: "Não foi possível excluir o documento." };

  revalidatePath("/documents");
  if (doc.client_id) revalidatePath(`/clients/${doc.client_id}`);
  return { error: null };
}

export async function getSignedDocumentUrl(storagePath: string): Promise<string | null> {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.storage
    .from("documents")
    .createSignedUrl(storagePath, 60);

  if (error || !data) return null;
  return data.signedUrl;
}
