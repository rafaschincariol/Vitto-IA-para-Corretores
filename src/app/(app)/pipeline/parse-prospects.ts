import * as XLSX from "xlsx";
import { isValidCpfCnpj, isValidBrazilianPhone } from "@/lib/validators";
import type { ParsedProspectRow } from "./actions";

const HEADER_ALIASES: Record<string, keyof RawRow> = {
  nome: "name",
  name: "name",
  prospect: "name",
  "cpf/cnpj": "cpf_cnpj",
  cpf: "cpf_cnpj",
  cnpj: "cpf_cnpj",
  cpf_cnpj: "cpf_cnpj",
  email: "email",
  "e-mail": "email",
  telefone: "phone",
  celular: "phone",
  phone: "phone",
  valor: "estimated_value",
  "valor estimado": "estimated_value",
  estimated_value: "estimated_value",
  seguro: "insurance_type",
  "tipo de seguro": "insurance_type",
  insurance_type: "insurance_type",
  etapa: "stage_name",
  stage: "stage_name",
  status: "stage_name",
};

type RawRow = {
  name: string;
  cpf_cnpj: string;
  email: string;
  phone: string;
  estimated_value: string;
  insurance_type: string;
  stage_name: string;
};

export type ParseResult = {
  rows: ParsedProspectRow[];
  rowErrors: string[];
};

// Mesma lógica de clients/parse-spreadsheet.ts, com colunas extras de valor
// estimado, tipo de seguro e etapa (a coluna "Etapa" é opcional — casada por
// nome contra as etapas do tenant na Server Action, não aqui).
export async function parseProspectsSpreadsheet(file: File): Promise<ParseResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const rows: ParsedProspectRow[] = [];
  const rowErrors: string[] = [];

  raw.forEach((record, index) => {
    const mapped: Partial<RawRow> = {};
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

    if (mapped.cpf_cnpj && !isValidCpfCnpj(mapped.cpf_cnpj)) {
      rowErrors.push(`Linha ${index + 2} (${mapped.name}): CPF/CNPJ "${mapped.cpf_cnpj}" inválido — ignorada.`);
      return;
    }

    if (mapped.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mapped.email)) {
      rowErrors.push(`Linha ${index + 2} (${mapped.name}): e-mail "${mapped.email}" inválido — ignorada.`);
      return;
    }

    if (mapped.phone && !isValidBrazilianPhone(mapped.phone)) {
      rowErrors.push(`Linha ${index + 2} (${mapped.name}): telefone "${mapped.phone}" inválido — ignorada.`);
      return;
    }

    const estimatedValue = mapped.estimated_value ? Number(mapped.estimated_value.replace(",", ".")) : null;

    rows.push({
      name: mapped.name,
      cpf_cnpj: mapped.cpf_cnpj ?? null,
      email: mapped.email ?? null,
      phone: mapped.phone ?? null,
      estimated_value: estimatedValue !== null && !Number.isNaN(estimatedValue) ? estimatedValue : null,
      insurance_type: mapped.insurance_type ?? null,
      stage_name: mapped.stage_name ?? null,
    });
  });

  return { rows, rowErrors };
}
