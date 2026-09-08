import "server-only";
import { getAnthropicClient } from "./anthropic";

export type ExtractedPolicyData = {
  client_name: string;
  cpf_cnpj: string | null;
  client_email: string | null;
  client_phone: string | null;
  insurer: string;
  policy_number: string;
  policy_type: string | null;
  premium_total: number | null;
  start_date: string | null;
  end_date: string | null;
  /** Transcrição do texto do documento — usada para indexar no RAG (fase 3), não exibida no formulário. */
  full_text: string | null;
};

const EXTRACTION_TOOL = {
  name: "salvar_dados_apolice",
  description:
    "Registra os dados extraídos de um documento de apólice de seguro. Omita (não invente) campos que não aparecem no documento.",
  input_schema: {
    type: "object" as const,
    properties: {
      client_name: { type: "string", description: "Nome completo do segurado/cliente" },
      cpf_cnpj: { type: "string", description: "CPF ou CNPJ do cliente, se presente no documento" },
      client_email: { type: "string", description: "E-mail do cliente, se presente" },
      client_phone: { type: "string", description: "Telefone do cliente, se presente" },
      insurer: { type: "string", description: "Nome da seguradora" },
      policy_number: { type: "string", description: "Número da apólice" },
      policy_type: {
        type: "string",
        description: "Tipo de seguro (Auto, Vida, Residencial, Saúde, etc.)",
      },
      premium_total: { type: "number", description: "Prêmio total em reais, sem símbolo de moeda" },
      start_date: { type: "string", description: "Início da vigência, no formato YYYY-MM-DD" },
      end_date: { type: "string", description: "Fim da vigência, no formato YYYY-MM-DD" },
      full_text: {
        type: "string",
        description:
          "Transcrição do texto integral do documento (condições, coberturas, cláusulas, franquias etc.), para uso em busca depois. Pode resumir trechos repetitivos, mas mantenha os números e termos técnicos.",
      },
    },
    required: ["client_name", "insurer", "policy_number"],
  },
};

// Lê um PDF ou imagem de apólice com o Claude (visão computacional) e devolve
// os campos estruturados via tool use — mais confiável que pedir texto livre
// e fazer parsing manual. O corretor sempre revisa/edita antes de salvar
// (ver documents/review-actions.ts e document-review-dialog.tsx).
export async function extractPolicyData(
  fileBytes: ArrayBuffer,
  mimeType: string
): Promise<ExtractedPolicyData> {
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
            media_type: (mimeType === "image/jpeg" ? "image/jpeg" : "image/png") as
              | "image/jpeg"
              | "image/png",
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
            text: "Extraia os dados desta apólice de seguro com a ferramenta salvar_dados_apolice. Se um campo não aparecer no documento, omita-o — nunca invente valores.",
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

  const input = toolUse.input as Record<string, unknown>;
  return {
    client_name: typeof input.client_name === "string" ? input.client_name : "",
    cpf_cnpj: typeof input.cpf_cnpj === "string" ? input.cpf_cnpj : null,
    client_email: typeof input.client_email === "string" ? input.client_email : null,
    client_phone: typeof input.client_phone === "string" ? input.client_phone : null,
    insurer: typeof input.insurer === "string" ? input.insurer : "",
    policy_number: typeof input.policy_number === "string" ? input.policy_number : "",
    policy_type: typeof input.policy_type === "string" ? input.policy_type : null,
    premium_total: typeof input.premium_total === "number" ? input.premium_total : null,
    start_date: typeof input.start_date === "string" ? input.start_date : null,
    end_date: typeof input.end_date === "string" ? input.end_date : null,
    full_text: typeof input.full_text === "string" ? input.full_text : null,
  };
}
