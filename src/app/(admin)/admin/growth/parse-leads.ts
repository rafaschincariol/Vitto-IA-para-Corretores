import * as XLSX from "xlsx";
import { isValidCpfCnpj, isValidBrazilianPhone } from "@/lib/validators";

export type ParsedLeadRow = {
  contact_name: string;
  email: string;
  company_name: string | null;
  phone: string | null;
  cnpj_cpf: string | null;
  city: string | null;
  state: string | null;
};

const HEADER_ALIASES: Record<string, keyof ParsedLeadRow> = {
  nome: "contact_name",
  contato: "contact_name",
  "nome do contato": "contact_name",
  name: "contact_name",
  email: "email",
  "e-mail": "email",
  empresa: "company_name",
  corretora: "company_name",
  "razão social": "company_name",
  company: "company_name",
  telefone: "phone",
  celular: "phone",
  whatsapp: "phone",
  phone: "phone",
  "cpf/cnpj": "cnpj_cpf",
  cpf: "cnpj_cpf",
  cnpj: "cnpj_cpf",
  cidade: "city",
  city: "city",
  uf: "state",
  estado: "state",
  state: "state",
};

export type ParseLeadsResult = {
  rows: ParsedLeadRow[];
  rowErrors: string[];
};

// Lê a primeira planilha de um .xlsx/.xls/.csv e mapeia cabeçalhos comuns
// (Nome, E-mail, Empresa, Telefone, CPF/CNPJ, Cidade, UF — em qualquer
// ordem) pra formato de lead. Roda inteiramente no navegador; nada é
// enviado ao servidor até o admin confirmar a prévia e clicar em importar.
// Mesmo padrão de clients/parse-spreadsheet.ts.
export async function parseLeadsSpreadsheet(file: File): Promise<ParseLeadsResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const rows: ParsedLeadRow[] = [];
  const rowErrors: string[] = [];

  raw.forEach((record, index) => {
    const mapped: Partial<Record<keyof ParsedLeadRow, string>> = {};
    for (const [key, value] of Object.entries(record)) {
      const field = HEADER_ALIASES[key.trim().toLowerCase()];
      if (!field) continue;
      const text = String(value ?? "").trim();
      if (text) mapped[field] = text;
    }

    if (!mapped.contact_name) {
      rowErrors.push(`Linha ${index + 2}: coluna "Nome" vazia ou não encontrada — ignorada.`);
      return;
    }

    if (!mapped.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
      rowErrors.push(`Linha ${index + 2} (${mapped.contact_name}): e-mail ausente ou inválido — ignorada.`);
      return;
    }

    if (mapped.cnpj_cpf && !isValidCpfCnpj(mapped.cnpj_cpf)) {
      rowErrors.push(`Linha ${index + 2} (${mapped.contact_name}): CPF/CNPJ "${mapped.cnpj_cpf}" inválido — ignorada.`);
      return;
    }

    if (mapped.phone && !isValidBrazilianPhone(mapped.phone)) {
      rowErrors.push(`Linha ${index + 2} (${mapped.contact_name}): telefone "${mapped.phone}" inválido — ignorada.`);
      return;
    }

    rows.push({
      contact_name: mapped.contact_name,
      email: mapped.email.toLowerCase(),
      company_name: mapped.company_name ?? null,
      phone: mapped.phone ?? null,
      cnpj_cpf: mapped.cnpj_cpf ?? null,
      city: mapped.city ?? null,
      state: mapped.state ?? null,
    });
  });

  return { rows, rowErrors };
}
