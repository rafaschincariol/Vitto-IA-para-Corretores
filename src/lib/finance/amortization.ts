// Matemática de amortização de financiamento, compartilhada entre o
// simulador de Necessidade de Seguro de Vida (saldo devedor de uma dívida
// dentro da Linha da Vida) e o Simulador de Seguro Prestamista (saldo
// devedor de um financiamento imobiliário específico). Sem I/O, sem DOM.

export type AmortizationSystem = "sac" | "price";

// Parcela mensal fixa do sistema Price (tabela Price) — fórmula padrão de
// anuidade. Com taxa zero, vira só divisão linear (evita divisão por zero).
export function pricePmt(balance: number, annualInterestRate: number, termYears: number): number {
  const numMonths = Math.round(termYears * 12);
  if (numMonths <= 0) return 0;
  const monthlyRate = annualInterestRate / 100 / 12;
  if (monthlyRate <= 0) return balance / numMonths;
  return (balance * monthlyRate * Math.pow(1 + monthlyRate, numMonths)) / (Math.pow(1 + monthlyRate, numMonths) - 1);
}

// Saldo devedor projetado `yearsFromNow` anos à frente.
//
// Sem taxa de juros (annualInterestRate <= 0): amortização linear — a
// simplificação usada quando não se sabe a taxa exata do contrato.
//
// Com taxa informada:
// - SAC: amortização mensal fixa (balance/meses) — o saldo cai de forma
//   linear no tempo (o principal é pago em parcelas iguais).
// - Price: parcela mensal fixa, amortização crescente — o saldo cai mais
//   devagar no início (os primeiros pagamentos são majoritariamente juros),
//   fórmula fechada do valor presente das parcelas restantes.
export function remainingBalance(
  balance: number,
  annualInterestRate: number,
  termYears: number,
  system: AmortizationSystem,
  yearsFromNow: number
): number {
  if (termYears <= 0) return 0;
  if (yearsFromNow >= termYears) return 0;

  if (annualInterestRate <= 0) {
    const fractionPaid = Math.min(1, yearsFromNow / termYears);
    return balance * (1 - fractionPaid);
  }

  const monthlyRate = annualInterestRate / 100 / 12;
  const numMonths = Math.round(termYears * 12);
  const monthsElapsed = Math.round(yearsFromNow * 12);

  if (system === "sac") {
    const fixedAmortization = balance / numMonths;
    return Math.max(0, balance - fixedAmortization * monthsElapsed);
  }

  const remainingMonths = numMonths - monthsElapsed;
  const pmt = pricePmt(balance, annualInterestRate, termYears);
  return Math.max(0, (pmt * (1 - Math.pow(1 + monthlyRate, -remainingMonths))) / monthlyRate);
}

// Parcela (principal + juros) de um mês específico (0-based: 0 = primeiro
// mês). No Price a parcela é sempre a mesma; no SAC ela cai mês a mês porque
// os juros incidem sobre um saldo cada vez menor.
export function installmentAtMonth(
  balance: number,
  annualInterestRate: number,
  termYears: number,
  system: AmortizationSystem,
  monthIndex: number
): number {
  const numMonths = Math.round(termYears * 12);
  if (numMonths <= 0) return 0;

  if (annualInterestRate <= 0) return balance / numMonths;

  if (system === "price") {
    return pricePmt(balance, annualInterestRate, termYears);
  }

  const monthlyRate = annualInterestRate / 100 / 12;
  const fixedAmortization = balance / numMonths;
  const balanceBeforeMonth = Math.max(0, balance - fixedAmortization * monthIndex);
  return fixedAmortization + balanceBeforeMonth * monthlyRate;
}
