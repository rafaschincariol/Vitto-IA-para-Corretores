// Divide texto longo em pedaços com sobreposição, para indexação vetorial.
// Simples de propósito: documentos de apólice raramente passam de algumas
// páginas, então não precisa de um splitter ciente de parágrafos/sentenças.
export function chunkText(text: string, maxChars = 1500, overlap = 200): string[] {
  const clean = text.trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    const end = Math.min(start + maxChars, clean.length);
    chunks.push(clean.slice(start, end));
    if (end >= clean.length) break;
    start = end - overlap;
  }
  return chunks;
}
