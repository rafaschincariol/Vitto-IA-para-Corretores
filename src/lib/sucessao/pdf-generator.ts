import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatCurrency } from "./calculator";
import { ITCMD_PROGRESSIVE_BRACKETS, MARITAL_REGIME_TAXABLE_FRACTION } from "./constants";
import { MARITAL_REGIME_LABELS, type Asset, type MaritalRegime, type SimulationResult } from "./types";

export type PdfExportOptions = {
  clientName: string;
  advisorName: string;
  notes: string | null;
  scenario: "min" | "max";
  maritalRegime: MaritalRegime;
  existingProtection: number;
  customDuration: number;
  monthlyMaintenance: number;
  liquidityGoal: number;
  suggestedCoverage: number;
};

// Porta services/pdfGenerator.ts do protótipo do usuário (jsPDF +
// jspdf-autotable, sem dependência de DOM/React), com três ajustes: usa
// client.name/profile.full_name do Vitto em vez de inputs livres, mostra o
// capital de seguro já descontado da proteção existente (não só a meta de
// liquidez bruta), e troca as afirmações não embasadas do original ("até
// 60% de economia") por linguagem compatível com a seção de compliance do
// plano — estimativa educativa, sem prometer número que não foi calculado.
export function generateSucessaoPDF(assets: Asset[], result: SimulationResult, options: PdfExportOptions): jsPDF {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 14;
  const contentWidth = pageWidth - marginX * 2;

  const slate900 = [15, 23, 42] as const;
  const slate700 = [51, 65, 85] as const;
  const slate500 = [100, 116, 139] as const;
  const slate100 = [241, 245, 249] as const;
  const teal600 = [13, 148, 136] as const;
  const teal700 = [15, 118, 110] as const;
  const teal50 = [240, 253, 250] as const;

  let y = 14;

  doc.setFillColor(...teal600);
  doc.rect(0, 0, pageWidth, 4, "F");

  doc.setFillColor(...slate900);
  doc.roundedRect(marginX, y, contentWidth, 26, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("DIAGNÓSTICO DE SUCESSÃO PATRIMONIAL", marginX + 6, y + 9);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text("Simulação de custos de inventário e meta de liquidez para proteção com seguro de vida", marginX + 6, y + 16);

  const now = new Date();
  const formattedDate =
    now.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " às " +
    now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  doc.setFontSize(7.5);
  doc.setTextColor(153, 246, 228);
  doc.text(
    `Emissão: ${formattedDate} | Cenário: ${options.scenario === "min" ? "Via Administrativa (consensual)" : "Via Judicial (litigioso)"}`,
    marginX + 6,
    y + 22
  );

  y += 31;

  doc.setFillColor(...slate100);
  doc.roundedRect(marginX, y, contentWidth, 14, 2, 2, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...slate900);
  let metaX = marginX + 5;
  doc.text("Titular / Família: ", metaX, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate700);
  doc.text(options.clientName, metaX + 24, y + 6);
  metaX += 85;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...slate900);
  doc.text("Corretor: ", metaX, y + 6);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...slate700);
  doc.text(options.advisorName, metaX + 16, y + 6);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.setTextColor(...slate500);
  doc.text(
    `Regime de bens: ${MARITAL_REGIME_LABELS[options.maritalRegime]}. Relatório emitido para subsidiar o planejamento sucessório preventivo.`,
    marginX + 5,
    y + 11
  );
  y += 18;

  const cardW = (contentWidth - 6) / 2;
  const cardH = 21;

  doc.setFillColor(...slate100);
  doc.roundedRect(marginX, y, cardW, cardH, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...slate500);
  doc.text("PATRIMÔNIO TOTAL AVALIADO", marginX + 4, y + 6);
  doc.setFontSize(13);
  doc.setTextColor(...slate900);
  doc.text(formatCurrency(result.totalAssets), marginX + 4, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...slate700);
  doc.text(`${assets.length} bem(ns) cadastrado(s)`, marginX + 4, y + 18.5);

  doc.setFillColor(...teal50);
  doc.setDrawColor(...teal600);
  doc.setLineWidth(0.4);
  doc.roundedRect(marginX + cardW + 6, y, cardW, cardH, 2.5, 2.5, "FD");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...teal700);
  doc.text("CAPITAL DE SEGURO SUGERIDO", marginX + cardW + 10, y + 6);
  doc.setFontSize(13);
  doc.text(formatCurrency(options.suggestedCoverage), marginX + cardW + 10, y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...slate700);
  doc.text(
    options.existingProtection > 0
      ? `Já descontada proteção existente de ${formatCurrency(options.existingProtection)}`
      : "Cobre a meta de liquidez integral do cenário selecionado",
    marginX + cardW + 10,
    y + 18.5
  );

  y += cardH + 4;

  const processCosts = options.liquidityGoal - options.monthlyMaintenance * options.customDuration;

  doc.setFillColor(...slate100);
  doc.roundedRect(marginX, y, cardW, cardH, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...slate500);
  doc.text("CUSTOS FIXOS DO PROCESSO", marginX + 4, y + 6);
  doc.setFontSize(11);
  doc.setTextColor(...slate900);
  doc.text(formatCurrency(Math.max(0, processCosts)), marginX + 4, y + 13.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...slate700);
  doc.text("ITCMD, cartório, registro, certidões e honorários", marginX + 4, y + 18);

  doc.setFillColor(...slate100);
  doc.roundedRect(marginX + cardW + 6, y, cardW, cardH, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...slate500);
  doc.text("PROVISÃO DE MANUTENÇÃO (BLOQUEIO)", marginX + cardW + 10, y + 6);
  doc.setFontSize(11);
  doc.setTextColor(...slate900);
  doc.text(formatCurrency(options.monthlyMaintenance * options.customDuration), marginX + cardW + 10, y + 13.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...slate700);
  doc.text(
    `${options.customDuration} meses a ${formatCurrency(options.monthlyMaintenance)}/mês`,
    marginX + cardW + 10,
    y + 18
  );

  y += cardH + 7;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...slate900);
  doc.text("1. Relação de Bens Declarados", marginX, y);
  y += 3;

  const assetRows = assets.map((asset, index) => [
    String(index + 1),
    asset.description,
    asset.type,
    formatCurrency(asset.value),
    result.totalAssets > 0 ? `${((asset.value / result.totalAssets) * 100).toFixed(1)}%` : "0%",
  ]);
  assetRows.push(["", "TOTAL DO PATRIMÔNIO", "", formatCurrency(result.totalAssets), "100.0%"]);

  autoTable(doc, {
    startY: y,
    head: [["#", "Descrição", "Tipo", "Valor (R$)", "Part. %"]],
    body: assetRows,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 2.2, font: "helvetica", textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [...slate900], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 10, halign: "center" },
      1: { cellWidth: 82 },
      2: { cellWidth: 32 },
      3: { cellWidth: 38, halign: "right" },
      4: { cellWidth: 20, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === assetRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
    margin: { left: marginX, right: marginX },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...slate900);
  doc.text("2. Demonstrativo Comparativo de Encargos do Inventário", marginX, y);
  y += 3;

  const costEntries = Object.values(result.costs);
  const impactLabel = { high: "Alto", medium: "Médio", low: "Baixo" } as const;
  const costRows = costEntries.map((item) => [
    item.label,
    item.description,
    formatCurrency(item.min),
    formatCurrency(item.max),
    impactLabel[item.impact],
  ]);

  const procMin = result.totals.min - result.maintenance.low;
  const procMax = result.totals.max - result.maintenance.high;
  costRows.push(["Subtotal: Encargos do Processo", "Tributos, taxas, certidões e honorários", formatCurrency(procMin), formatCurrency(procMax), "-"]);
  costRows.push([
    `Manutenção dos Bens (${options.customDuration} meses)`,
    "Custo para manter a família e os bens enquanto bloqueados",
    formatCurrency(options.monthlyMaintenance * options.customDuration),
    formatCurrency(options.monthlyMaintenance * options.customDuration),
    "Alto",
  ]);
  costRows.push([
    "META DE LIQUIDEZ NECESSÁRIA",
    "Total em dinheiro que a família precisará",
    formatCurrency(procMin + options.monthlyMaintenance * options.customDuration),
    formatCurrency(procMax + options.monthlyMaintenance * options.customDuration),
    "Crítico",
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Encargo", "Descrição / Base", "Via Administrativa", "Via Judicial", "Impacto"]],
    body: costRows,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 2.2, font: "helvetica", textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [...teal700], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 46, fontStyle: "bold" },
      1: { cellWidth: 62 },
      2: { cellWidth: 32, halign: "right" },
      3: { cellWidth: 32, halign: "right" },
      4: { cellWidth: 10, halign: "center" },
    },
    didParseCell: (data) => {
      if (data.row.index === costRows.length - 2) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 253, 250];
      }
      if (data.row.index === costRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [15, 23, 42];
        data.cell.styles.textColor = [255, 255, 255];
      }
    },
    margin: { left: marginX, right: marginX },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;
  if (y > pageHeight - 65) {
    doc.addPage();
    y = 16;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...slate900);
  doc.text("3. Memória de Cálculo: ITCMD Progressivo", marginX, y);
  y += 2;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slate700);
  const regimeNote =
    MARITAL_REGIME_TAXABLE_FRACTION[options.maritalRegime] < 1
      ? ` Base já descontada da meação do cônjuge (regime: ${MARITAL_REGIME_LABELS[options.maritalRegime]}).`
      : "";
  doc.text(
    `Faixas nacionais simplificadas, teto de 8% (EC 132/2023, LC 227/2026) — alíquotas variam por estado.${regimeNote}`,
    marginX,
    y + 3,
    { maxWidth: contentWidth }
  );
  y += 7;

  let remaining = result.taxableBase;
  let previousLimit = 0;
  const itcmdRows = ITCMD_PROGRESSIVE_BRACKETS.map((bracket) => {
    const rangeSize = bracket.limit - previousLimit;
    const amountInBracket = Math.min(remaining, rangeSize);
    const taxInBracket = amountInBracket > 0 ? amountInBracket * bracket.rate : 0;
    const label =
      bracket.limit === Infinity
        ? `Acima de ${formatCurrency(previousLimit)}`
        : `${formatCurrency(previousLimit)} a ${formatCurrency(bracket.limit)}`;
    remaining -= Math.max(0, amountInBracket);
    previousLimit = bracket.limit;
    return [label, `${(bracket.rate * 100).toFixed(0)}%`, formatCurrency(Math.max(0, amountInBracket)), formatCurrency(taxInBracket)];
  });
  itcmdRows.push([
    "TOTAL DO IMPOSTO DEVIDO (ITCMD)",
    result.taxableBase > 0 ? `${((result.costs.itcmd.max / result.taxableBase) * 100).toFixed(2)}% (efetiva)` : "-",
    formatCurrency(result.taxableBase),
    formatCurrency(result.costs.itcmd.max),
  ]);

  autoTable(doc, {
    startY: y,
    head: [["Faixa", "Alíquota", "Base na Faixa", "Imposto Devido"]],
    body: itcmdRows,
    theme: "grid",
    styles: { fontSize: 7.5, cellPadding: 2, font: "helvetica", textColor: [30, 41, 59], lineColor: [226, 232, 240], lineWidth: 0.2 },
    headStyles: { fillColor: [...slate900], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 72 },
      1: { cellWidth: 30, halign: "center" },
      2: { cellWidth: 40, halign: "right" },
      3: { cellWidth: 40, halign: "right" },
    },
    didParseCell: (data) => {
      if (data.row.index === itcmdRows.length - 1) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [240, 253, 250];
        data.cell.styles.textColor = [15, 118, 110];
      }
    },
    margin: { left: marginX, right: marginX },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 8;
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 16;
  }

  doc.setFillColor(...slate100);
  doc.roundedRect(marginX, y, contentWidth, 28, 2.5, 2.5, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...slate900);
  doc.text("PONTOS DE ATENÇÃO", marginX + 4, y + 5.5);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...slate700);
  const bullets = [
    "• Contas e aplicações do titular ficam bloqueadas até a homologação do inventário ou alvará judicial.",
    "• Sem reserva de liquidez, famílias frequentemente precisam vender bens sob pressão pra pagar ITCMD e honorários.",
    "• O capital de seguro de vida não entra em inventário nem paga ITCMD (Art. 794 do Código Civil) — fica disponível de imediato.",
  ];
  let bulletY = y + 11;
  for (const bullet of bullets) {
    doc.text(bullet, marginX + 4, bulletY, { maxWidth: contentWidth - 8 });
    bulletY += 5.2;
  }
  y += 28 + 4;

  if (options.notes?.trim()) {
    if (y > pageHeight - 35) {
      doc.addPage();
      y = 16;
    }
    doc.setDrawColor(...slate500);
    doc.roundedRect(marginX, y, contentWidth, 18, 2, 2, "D");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...slate900);
    doc.text("Observações do corretor:", marginX + 4, y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...slate700);
    doc.text(options.notes, marginX + 4, y + 10, { maxWidth: contentWidth - 8 });
  }

  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(6.5);
    doc.setTextColor(...slate500);
    doc.text(
      "Vitto — estimativa educativa, não substitui análise individual atuarial/tributária.",
      marginX,
      pageHeight - 7
    );
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX - 18, pageHeight - 7);
  }

  return doc;
}
