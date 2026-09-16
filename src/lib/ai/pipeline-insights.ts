import "server-only";
import { getAnthropicClient } from "./anthropic";
import type { PipelineAnalytics } from "@/lib/data/pipeline";

export type PipelineInsights = {
  headline: string;
  insights: { title: string; detail: string }[];
  recommendations: { title: string; detail: string }[];
};

const INSIGHTS_TOOL = {
  name: "registrar_insights_funil",
  description: "Registra uma análise estruturada do funil de vendas de um corretor de seguros.",
  input_schema: {
    type: "object" as const,
    properties: {
      headline: {
        type: "string",
        description: "Uma frase curta (até 20 palavras) resumindo o estado geral do funil.",
      },
      insights: {
        type: "array",
        description: "2 a 4 observações objetivas sobre o funil (gargalos, etapas travadas, valor parado, etc.).",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título curto da observação." },
            detail: { type: "string", description: "1-2 frases explicando a observação com base nos números." },
          },
          required: ["title", "detail"],
        },
      },
      recommendations: {
        type: "array",
        description: "1 a 3 ações concretas e práticas que o corretor pode tomar.",
        items: {
          type: "object",
          properties: {
            title: { type: "string", description: "Título curto da recomendação." },
            detail: { type: "string", description: "1-2 frases explicando a ação recomendada." },
          },
          required: ["title", "detail"],
        },
      },
    },
    required: ["headline", "insights", "recommendations"],
  },
};

function formatSnapshot(analytics: PipelineAnalytics): string {
  const lines = [
    `Total de prospects no funil: ${analytics.totalProspects}.`,
    `Valor total estimado em negociação: R$ ${analytics.totalPipelineValue.toFixed(2)}.`,
    `Ganhos: ${analytics.wonCount}. Perdidos: ${analytics.lostCount}. Taxa de conversão geral (ganho / (ganho+perdido)): ${analytics.overallConversionRate}%.`,
    analytics.avgDaysToClose !== null
      ? `Tempo médio até fechar (criação → etapa de ganho): ${analytics.avgDaysToClose} dia(s).`
      : "Ainda não há prospects fechados como ganhos suficientes para calcular tempo médio até fechar.",
    "",
    "Pessoas por etapa (ocupação atual):",
    ...analytics.stageOccupancy.map((s) => `- ${s.stageName}: ${s.count} prospect(s)${s.isWon ? " (etapa de ganho)" : s.isLost ? " (etapa de perda)" : ""}`),
    "",
    "Funil de conversão por etapa (quantos prospects distintos já alcançaram cada etapa, e taxa de avanço vindo da etapa anterior):",
    ...analytics.stageFunnel.map(
      (s) =>
        `- ${s.stageName}: ${s.reachedCount} prospect(s) já alcançaram${s.conversionFromPrevious !== null ? ` (${s.conversionFromPrevious}% vindos da etapa anterior)` : ""}`
    ),
  ];
  return lines.join("\n");
}

// Gera insights sob demanda (não a cada carregamento de página) a partir do
// snapshot estruturado de getPipelineAnalytics — nunca de busca vetorial ou
// texto livre, então não há risco de o modelo inventar números: ele só
// enxerga os totais já calculados no banco. Mesmo padrão de tool-use forçado
// de extract-document.ts, mas aqui pra produzir um card de análise em vez de
// dados de formulário.
export async function generatePipelineInsights(analytics: PipelineAnalytics): Promise<PipelineInsights> {
  const client = getAnthropicClient();

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 1024,
    system:
      "Você analisa o funil de vendas de um corretor de seguros brasileiro. Use SOMENTE os números fornecidos — " +
      "nunca invente dados que não estão no snapshot. Seja direto, prático e objetivo, em português. Se os dados " +
      "forem insuficientes (poucos prospects, sem histórico), diga isso explicitamente em vez de especular.",
    tools: [INSIGHTS_TOOL],
    tool_choice: { type: "tool", name: INSIGHTS_TOOL.name },
    messages: [
      {
        role: "user",
        content: `Analise este snapshot do funil de vendas e registre os insights com a ferramenta registrar_insights_funil:\n\n${formatSnapshot(analytics)}`,
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> => block.type === "tool_use"
  );
  if (!toolUse) throw new Error("A IA não retornou os insights.");

  const input = toolUse.input as Partial<PipelineInsights>;
  return {
    headline: typeof input.headline === "string" ? input.headline : "Não foi possível gerar um resumo.",
    insights: Array.isArray(input.insights) ? input.insights : [],
    recommendations: Array.isArray(input.recommendations) ? input.recommendations : [],
  };
}
