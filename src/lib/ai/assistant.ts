import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getAnthropicClient } from "./anthropic";
import { embedText, toVectorLiteral } from "./embeddings";
import { getPortfolioSnapshot } from "@/lib/data/assistant-context";

export type ChatMessage = { role: "user" | "assistant"; content: string };
export type Citation = { label: string; documentId?: string };
export type AssistantAnswer = { answer: string; citations: Citation[] };

type Intent = "private" | "global" | "both";

const CLASSIFY_TOOL = {
  name: "classificar_intencao",
  description: "Classifica a intenção de uma pergunta feita por um corretor de seguros ao assistente.",
  input_schema: {
    type: "object" as const,
    properties: {
      intent: {
        type: "string" as const,
        enum: ["private", "global", "both"],
        description:
          "'private': pergunta sobre a carteira do próprio corretor (seus clientes, apólices, vencimentos, prêmios). 'global': pergunta sobre regras gerais/condições/coberturas de seguradoras, não específica de um cliente. 'both': as duas coisas ao mesmo tempo.",
      },
    },
    required: ["intent"],
  },
};

async function classifyIntent(question: string): Promise<Intent> {
  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    // 32 não é suficiente: o modelo pode não conseguir completar a tool call
    // (stop_reason "max_tokens"), deixando input={} e caindo no fallback
    // "private" mesmo para perguntas claramente gerais.
    max_tokens: 200,
    system:
      'Classifique a pergunta do corretor usando a ferramenta "classificar_intencao". ' +
      'Regra prática: se a pergunta menciona "minha carteira", "meus clientes", um nome de cliente específico, ' +
      "ou pede números/datas de apólices cadastradas, é 'private'. Se pergunta sobre o que uma cobertura " +
      "geralmente inclui, regras de uma seguradora, ou definições de seguro sem referência à carteira do " +
      "corretor, é 'global'. Exemplos: \"quais apólices vencem em 30 dias\" -> private. " +
      '"o que cobre um seguro residencial contra incêndio" -> global. "o Carlos tem seguro de auto?" -> private.',
    tools: [CLASSIFY_TOOL],
    tool_choice: { type: "tool", name: CLASSIFY_TOOL.name },
    messages: [{ role: "user", content: question }],
  });

  const toolUse = message.content.find(
    (b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use"
  );
  const intent = (toolUse?.input as { intent?: string } | undefined)?.intent;
  return intent === "global" || intent === "both" ? intent : "private";
}

export async function askAssistant(
  supabase: SupabaseClient,
  tenantId: string,
  question: string,
  history: ChatMessage[]
): Promise<AssistantAnswer> {
  const intent = await classifyIntent(question);
  const citations: Citation[] = [];
  const contextParts: string[] = [];

  if (intent === "private" || intent === "both") {
    const snapshot = await getPortfolioSnapshot(supabase, tenantId);
    contextParts.push(`## Visão geral da carteira (dados exatos do banco)\n${snapshot}`);

    try {
      const queryEmbedding = await embedText(question, "query");
      const { data: chunks } = await supabase.rpc("match_document_chunks", {
        query_embedding: toVectorLiteral(queryEmbedding),
        match_tenant_id: tenantId,
        match_count: 6,
      });

      if (chunks?.length) {
        const documentIds = [...new Set(chunks.map((c: { document_id: string }) => c.document_id))];
        const { data: docs } = await supabase
          .from("documents")
          .select("id, original_filename")
          .in("id", documentIds)
          .returns<{ id: string; original_filename: string }[]>();
        const filenames = Object.fromEntries((docs ?? []).map((d) => [d.id, d.original_filename]));

        const privateText = chunks
          .map((c: { document_id: string; content: string }) => {
            const filename = filenames[c.document_id] ?? "documento";
            citations.push({ label: filename, documentId: c.document_id });
            return `[Fonte: ${filename}]\n${c.content}`;
          })
          .join("\n\n");
        contextParts.push(`## Trechos de documentos da sua carteira\n${privateText}`);
      }
    } catch {
      // Base privada indisponível (ex.: Voyage sem chave) — segue só com o snapshot.
    }
  }

  if (intent === "global" || intent === "both") {
    try {
      const queryEmbedding = await embedText(question, "query");
      const { data: chunks } = await supabase.rpc("match_global_chunks", {
        query_embedding: toVectorLiteral(queryEmbedding),
        match_count: 6,
      });

      if (chunks?.length) {
        const globalText = chunks
          .map((c: { source_name: string; content: string }) => {
            citations.push({ label: c.source_name });
            return `[Fonte: ${c.source_name}]\n${c.content}`;
          })
          .join("\n\n");
        contextParts.push(`## Trechos da base geral (condições/manuais de seguradoras)\n${globalText}`);
      }
    } catch {
      // Base global indisponível — segue sem ela.
    }
  }

  const context = contextParts.join("\n\n") || "Nenhum dado relevante encontrado.";

  const client = getAnthropicClient();
  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 1024,
    system: `Você é o assistente de um corretor de seguros, dentro do painel da corretora dele. Responda com base SOMENTE no contexto abaixo — nunca invente números, nomes ou datas. Se a resposta não estiver no contexto, diga que não encontrou essa informação na carteira/base disponível. Sempre que usar um trecho de documento, cite a fonte entre parênteses, ex: "(fonte: apolice_joao.pdf)". Responda em português, de forma direta e objetiva.\n\n${context}`,
    messages: [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: question },
    ],
  });

  const textBlock = message.content.find(
    (b): b is Extract<typeof b, { type: "text" }> => b.type === "text"
  );

  return {
    answer: textBlock?.text ?? "Não consegui gerar uma resposta.",
    citations: Array.from(new Map(citations.map((c) => [c.label, c])).values()),
  };
}
