import "server-only";
import { isValidBrazilianPhone } from "@/lib/validators";

// A Cloud API da Meta espera o campo "to" só com dígitos, código do país
// incluso, sem "+"/espaços/pontuação (ex: "5511999999999"). Reaproveita a
// mesma validação de DDD/dígitos de isValidBrazilianPhone antes de formatar.
export function normalizeToE164Br(phone: string): string | null {
  if (!isValidBrazilianPhone(phone)) return null;

  let digits = phone.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;

  return digits;
}
