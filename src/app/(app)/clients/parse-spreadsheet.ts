import * as XLSX from "xlsx";

export type ParsedClientRow = {
  name: string;
  cpf_cnpj: string | null;
  email: string | null;
  phone: string | null;
};

const HEADER_ALIASES: Record<string, keyof ParsedClientRow> = {
  nome: "name",
  name: "name",
  cliente: "name",
  "cpf/cnpj": "cpf_cnpj",
  cpf: "cpf_cnpj",
  cnpj: "cpf_cnpj",
  cpf_cnpj: "cpf_cnpj",
  email: "email",
  "e-mail": "email",
  telefone: "phone",
  celular: "phone",
  phone: "phone",
};

export type ParseResult = {
  rows: ParsedClientRow[];
  rowErrors: string[];
};

// Lê a primeira planilha de um .xlsx/.xls/.csv e mapeia cabeçalhos comuns
// (Nome, CPF/CNPJ, E-mail, Telefone — em qualquer ordem) para o formato de
// cliente. Roda inteiramente no navegador; nada é enviado ao servidor até o
// corretor confirmar a prévia e clicar em importar.
export async function parseClientsSpreadsheet(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const rows: ParsedClientRow[] = [];
  const rowErrors: string[] = [];

  raw.forEach((record, index) => {
    const mapped: Partial<Record<keyof ParsedClientRow, string>> = {};
    for (const [key, value] of Object.entries(record)) {
      const field = HEADER_ALIASES[key.trim().toLowerCase()];
      if (!field) continue;
      const text = String(value ?? "").trim();
      if (text) mapped[field] = text;
    }

    if (!mapped.name) {
      rowErrors.push(`Linha ${index + 2}: coluna "Nome" vazia ou não encontrada — ignorada.`);
      return;
    }

    rows.push({
      name: mapped.name,
      cpf_cnpj: mapped.cpf_cnpj ?? null,
      email: mapped.email ?? null,
      phone: mapped.phone ?? null,
    });
  });

  return { rows, rowErrors };
}
