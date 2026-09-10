import { describe, expect, it } from "vitest";
import {
  isValidCpfCnpj,
  isValidBrazilianPhone,
  isValidIsoDate,
  cpfCnpjSchema,
  phoneSchema,
  optionalIsoDateSchema,
  requiredIsoDateSchema,
  optionalMoneySchema,
} from "./validators";

describe("isValidCpfCnpj", () => {
  it("aceita CPF válido, com ou sem pontuação", () => {
    expect(isValidCpfCnpj("111.444.777-35")).toBe(true);
    expect(isValidCpfCnpj("11144477735")).toBe(true);
  });

  it("rejeita CPF com dígito verificador errado", () => {
    expect(isValidCpfCnpj("111.444.777-36")).toBe(false);
  });

  it("rejeita sequência repetida (formato válido, mas CPF inválido)", () => {
    expect(isValidCpfCnpj("111.111.111-11")).toBe(false);
  });

  it("aceita CNPJ válido, com ou sem pontuação", () => {
    expect(isValidCpfCnpj("11.222.333/0001-81")).toBe(true);
    expect(isValidCpfCnpj("11222333000181")).toBe(true);
  });

  it("rejeita CNPJ com dígito verificador errado", () => {
    expect(isValidCpfCnpj("11.222.333/0001-82")).toBe(false);
  });

  it("rejeita tamanho que não é nem CPF nem CNPJ", () => {
    expect(isValidCpfCnpj("123456")).toBe(false);
  });
});

describe("isValidBrazilianPhone", () => {
  it("aceita celular com 9 dígitos e DDD válido", () => {
    expect(isValidBrazilianPhone("(11) 91234-5678")).toBe(true);
  });

  it("aceita fixo com 8 dígitos", () => {
    expect(isValidBrazilianPhone("(11) 1234-5678")).toBe(true);
  });

  it("aceita com +55 na frente", () => {
    expect(isValidBrazilianPhone("+55 11 91234-5678")).toBe(true);
  });

  it("rejeita celular sem o 9 inicial", () => {
    expect(isValidBrazilianPhone("(11) 81234-5678")).toBe(false);
  });

  it("rejeita DDD fora do intervalo válido", () => {
    expect(isValidBrazilianPhone("(10) 91234-5678")).toBe(false);
  });

  it("rejeita quantidade de dígitos errada", () => {
    expect(isValidBrazilianPhone("123456")).toBe(false);
  });
});

describe("isValidIsoDate", () => {
  it("aceita data real no formato yyyy-mm-dd", () => {
    expect(isValidIsoDate("2026-03-15")).toBe(true);
  });

  it("rejeita formato errado", () => {
    expect(isValidIsoDate("15/03/2026")).toBe(false);
  });

  it("rejeita data que não existe no calendário", () => {
    expect(isValidIsoDate("2026-02-30")).toBe(false);
  });
});

describe("cpfCnpjSchema", () => {
  it("transforma string vazia em null (campo opcional)", () => {
    expect(cpfCnpjSchema.parse("")).toBeNull();
  });

  it("aceita CPF válido", () => {
    expect(cpfCnpjSchema.parse("111.444.777-35")).toBe("111.444.777-35");
  });

  it("rejeita CPF inválido com mensagem clara", () => {
    const result = cpfCnpjSchema.safeParse("111.111.111-11");
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe("CPF/CNPJ inválido.");
  });
});

describe("phoneSchema", () => {
  it("transforma string vazia em null", () => {
    expect(phoneSchema.parse("")).toBeNull();
  });

  it("rejeita telefone mal formatado", () => {
    expect(phoneSchema.safeParse("123").success).toBe(false);
  });
});

describe("optionalIsoDateSchema / requiredIsoDateSchema", () => {
  it("optional: string vazia vira null", () => {
    expect(optionalIsoDateSchema.parse("")).toBeNull();
  });

  it("required: string vazia é rejeitada", () => {
    expect(requiredIsoDateSchema.safeParse("").success).toBe(false);
  });

  it("required: data válida passa", () => {
    expect(requiredIsoDateSchema.parse("2026-01-01")).toBe("2026-01-01");
  });
});

describe("optionalMoneySchema", () => {
  it("undefined vira null", () => {
    expect(optionalMoneySchema.parse(undefined)).toBeNull();
  });

  it("aceita vírgula como separador decimal", () => {
    expect(optionalMoneySchema.parse("1234,56")).toBe(1234.56);
  });

  it("aceita ponto como separador decimal", () => {
    expect(optionalMoneySchema.parse("1234.56")).toBe(1234.56);
  });

  it("rejeita valor negativo", () => {
    expect(optionalMoneySchema.safeParse("-10").success).toBe(false);
  });
});
