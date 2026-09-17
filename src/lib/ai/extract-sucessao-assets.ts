import "server-only";
import { getAnthropicClient } from "./anthropic";
import { AssetType } from "@/lib/sucessao/types";

export type ExtractedAsset = { description: string; type: AssetType; value: number };

const ASSET_TYPE_VALUES = Object.values(AssetType);

const EXTRACTION_TOOL = {
  name: "salvar_bens_patrimonio",
  description:
    "Registra a lista de bens patrimoniais encontrados no documento (declaração de bens e direitos do IRPF, relação de bens, auto de inventário, balancete patrimonial etc). Um bem por item, com descrição, categoria e valor em reais. Omita (não invente) bens cujo valor não esteja claro no documento, e ignore dívidas/financiamentos.",
  input_schema: {
    type: "object" as const,
    properties: {
      assets: {
        type: "array",
        description: "Lista de bens do patrimônio",
        items: {
          type: "object",
          properties: {
            description: {
              type: "string",
              description: "Descrição do bem (ex: Apartamento em São Paulo, Veículo Toyota Corolla 2020)",
            },
            type: {
              type: "string",
              enum: ASSET_TYPE_VALUES,
              description: "Categoria do bem",
            },
            value: { type: "number", description: "Valor do bem em reais, sem símbolo de moeda" },
          },
          required: ["description", "type", "value"],
        },
      },
    },
    required: ["assets"],
  },
};

// Lê um documento patrimonial (PDF ou imagem) com o Claude e devolve a lista
// de bens via tool use, mesmo padrão de extract-document.ts. O corretor
// sempre revisa/edita os valores no formulário antes de salvar a simulação —
// isso só evita digitar bem por bem.
export async function extractSucessaoAssets(fileBytes: ArrayBuffer, mimeType: string): Promise<ExtractedAsset[]> {
  const base64 = Buffer.from(fileBytes).toString("base64");
  const client = getAnthropicClient();

  const documentSource =
    mimeType === "application/pdf"
      ? {
          type: "document" as const,
          source: { type: "base64" as const, media_type: "application/pdf" as const, data: base64 },
        }
      : {
          type: "image" as const,
          source: {
            type: "base64" as const,
            media_type: (mimeType === "image/jpeg" ? "image/jpeg" : "image/png") as "image/jpeg" | "image/png",
            data: base64,
          },
        };

  const message = await client.messages.create({
    model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5",
    max_tokens: 4096,
    tools: [EXTRACTION_TOOL],
    tool_choice: { type: "tool", name: EXTRACTION_TOOL.name },
    messages: [
      {
        role: "user",
        content: [
          documentSource,
          {
            type: "text",
            text: "Extraia a lista de bens patrimoniais deste documento com a ferramenta salvar_bens_patrimonio. Considere só bens com valor claro no documento — nunca invente valores, e não inclua dívidas ou financiamentos.",
          },
        ],
      },
    ],
  });

  const toolUse = message.content.find(
    (block): block is Extract<typeof block, { type: "tool_use" }> => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new Error("A IA não retornou dados estruturados.");
  }

  const input = toolUse.input as { assets?: unknown[] };
  if (!Array.isArray(input.assets)) return [];

  const results: ExtractedAsset[] = [];
  for (const item of input.assets) {
    if (typeof item !== "object" || item === null) continue;
    const obj = item as Record<string, unknown>;
    const description = typeof obj.description === "string" ? obj.description.trim() : "";
    const value = typeof obj.value === "number" && obj.value > 0 ? obj.value : 0;
    if (!description || value <= 0) continue;
    const type = ASSET_TYPE_VALUES.includes(obj.type as AssetType) ? (obj.type as AssetType) : AssetType.OTHER;
    results.push({ description, type, value });
  }
  return results;
}
