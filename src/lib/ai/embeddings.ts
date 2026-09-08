import "server-only";

// Anthropic não tem endpoint de embeddings — Voyage AI é quem eles próprios
// recomendam, e é o que usamos para as duas bases do RAG (privada e global).
// input_type "document" ao indexar, "query" ao buscar — a Voyage otimiza o
// vetor de forma diferente para cada caso.
const VOYAGE_MODEL = process.env.VOYAGE_MODEL || "voyage-3";

export async function embedTexts(texts: string[], inputType: "document" | "query"): Promise<number[][]> {
  if (texts.length === 0) return [];

  const apiKey = process.env.VOYAGE_API_KEY;
  if (!apiKey) throw new Error("VOYAGE_API_KEY não configurada.");

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ input: texts, model: VOYAGE_MODEL, input_type: inputType }),
  });

  if (!res.ok) {
    throw new Error(`Voyage AI respondeu ${res.status}`);
  }

  const body = (await res.json()) as { data: { embedding: number[]; index: number }[] };
  return body.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
}

export async function embedText(text: string, inputType: "document" | "query"): Promise<number[]> {
  const [embedding] = await embedTexts([text], inputType);
  return embedding;
}

// pgvector via PostgREST espera o vetor como texto no formato "[0.1,0.2,...]"
// — um array JS puro não é convertido automaticamente para o tipo vector.
export function toVectorLiteral(embedding: number[]): string {
  return `[${embedding.join(",")}]`;
}
