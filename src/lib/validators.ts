import { z } from "zod";

// Validação real de CPF/CNPJ (dígito verificador), não só contagem de
// caracteres — rejeita sequências como "123.456.789-00" ou "111.111.111-11"
// que têm o formato certo mas são inválidas.

function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  check = (sum * 10) % 11;
  if (check === 10) check = 0;
  if (check !== Number(cpf[10])) return false;

  return true;
}

function isValidCNPJ(raw: string): boolean {
  const cnpj = raw.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcDigit = (base: string) => {
    let pos = base.length - 7;
    let sum = 0;
    for (let i = base.length; i >= 1; i--) {
      sum += Number(base[base.length - i]) * pos--;
      if (pos < 2) pos = 9;
    }
    const result = sum % 11;
    return result < 2 ? 0 : 11 - result;
  };

  const d1 = calcDigit(cnpj.slice(0, 12));
  if (d1 !== Number(cnpj[12])) return false;
  const d2 = calcDigit(cnpj.slice(0, 13));
  if (d2 !== Number(cnpj[13])) return false;

  return true;
}

/** Aceita CPF (11 dígitos) ou CNPJ (14 dígitos), com ou sem pontuação. */
export function isValidCpfCnpj(raw: string): boolean {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return isValidCPF(digits);
  if (digits.length === 14) return isValidCNPJ(digits);
  return false;
}

/** DDD (2 dígitos) + 8 (fixo) ou 9 dígitos (celular, começando em 9). */
export function isValidBrazilianPhone(raw: string): boolean {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 12 || digits.length === 13) digits = digits.slice(2); // remove +55
  if (digits.length !== 10 && digits.length !== 11) return false;

  const ddd = Number(digits.slice(0, 2));
  if (ddd < 11 || ddd > 99) return false;

  if (digits.length === 11 && digits[2] !== "9") return false;

  return true;
}

export function isValidIsoDate(raw: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const date = new Date(`${raw}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === raw;
}

/** CPF/CNPJ opcional — string vazia vira null; se preenchido, precisa ser válido. */
export const cpfCnpjSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)
  .refine((v) => v === null || isValidCpfCnpj(v), "CPF/CNPJ inválido.");

/** Telefone opcional — string vazia vira null; se preenchido, precisa ter DDD + número válidos. */
export const phoneSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)
  .refine((v) => v === null || isValidBrazilianPhone(v), "Telefone inválido — use DDD + número, ex: (11) 91234-5678.");

/** Data opcional em texto (yyyy-mm-dd) — string vazia vira null; se preenchida, precisa ser uma data real. */
export const optionalIsoDateSchema = z
  .string()
  .trim()
  .optional()
  .transform((v) => v || null)
  .refine((v) => v === null || isValidIsoDate(v), "Data inválida.");

/** Data obrigatória em texto (yyyy-mm-dd), precisa ser uma data real (não só não-vazia). */
export const requiredIsoDateSchema = z
  .string()
  .trim()
  .min(1, "Informe a data.")
  .refine(isValidIsoDate, "Data inválida.");

/** Valor monetário opcional (aceita vírgula ou ponto decimal) — nunca negativo. */
export const optionalMoneySchema = z
  .string()
  .optional()
  .transform((v) => (v ? Number(v.replace(",", ".")) : null))
  .refine((v) => v === null || (!Number.isNaN(v) && v >= 0), "Valor inválido — informe um número maior ou igual a zero.");
