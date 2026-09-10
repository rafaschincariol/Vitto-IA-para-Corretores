import { createClient as createSupabaseClient } from "@/lib/supabase/server";
import { GlobalKnowledgeForm } from "./form";

type GlobalChunkSource = { source_name: string; count: number };

export default async function GlobalKnowledgePage() {
  const supabase = await createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: isAdminRow } = await supabase
    .from("platform_admins")
    .select("email")
    .eq("email", user?.email ?? "")
    .maybeSingle();

  const { data: chunks } = await supabase
    .from("global_chunks")
    .select("source_name")
    .returns<{ source_name: string }[]>();

  const sources: GlobalChunkSource[] = Object.values(
    (chunks ?? []).reduce<Record<string, GlobalChunkSource>>((acc, c) => {
      acc[c.source_name] = acc[c.source_name] ?? { source_name: c.source_name, count: 0 };
      acc[c.source_name].count += 1;
      return acc;
    }, {})
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Base global de conhecimento</h1>
        <p className="text-sm text-muted-foreground">
          Condições gerais e manuais de seguradoras — disponível para o assistente de todas as corretoras
          (não só a sua). Acesso restrito a administradores da plataforma.
        </p>
      </div>

      {!isAdminRow ? (
        <p className="rounded-md bg-muted p-4 text-sm text-muted-foreground">
          Seu usuário ({user?.email}) não está na tabela <code>platform_admins</code> — veja o README para
          liberar acesso.
        </p>
      ) : (
        <>
          <GlobalKnowledgeForm />

          <div className="space-y-2">
            <p className="text-sm font-medium">Fontes já indexadas</p>
            {sources.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma fonte ainda.</p>
            ) : (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {sources.map((s) => (
                  <li key={s.source_name}>
                    {s.source_name} — {s.count} trecho(s)
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
