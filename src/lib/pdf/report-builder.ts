import jsPDF from "jspdf";
import autoTable, { type RowInput } from "jspdf-autotable";

type RGB = readonly [number, number, number];

export const REPORT_COLORS: Record<
  "slate900" | "slate700" | "slate500" | "slate100" | "blue600" | "blue700" | "blue50" | "blue100Text",
  RGB
> = {
  slate900: [15, 23, 42],
  slate700: [51, 65, 85],
  slate500: [100, 116, 139],
  slate100: [241, 245, 249],
  blue600: [37, 99, 235],
  blue700: [29, 78, 216],
  blue50: [239, 246, 255],
  blue100Text: [191, 219, 254],
};

export type KpiCard = { label: string; value: string; note?: string; highlight?: boolean };

// Toolkit de layout pra relatório em PDF (jsPDF + jspdf-autotable), extraído
// do gerador de PDF do Sucessão pra não duplicar ~400 linhas de posicionamento
// manual em cada novo simulador. O gerador do Sucessão continua com o próprio
// código (já em produção, sem risco de regressão) — este toolkit é usado só
// pelos relatórios novos.
export class ReportBuilder {
  readonly doc: jsPDF;
  readonly pageWidth: number;
  readonly pageHeight: number;
  readonly marginX = 14;
  readonly contentWidth: number;
  y: number;
  private footerNote: string;

  constructor(title: string, subtitle: string, metaLine: string, footerNote?: string) {
    this.doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    this.pageWidth = this.doc.internal.pageSize.getWidth();
    this.pageHeight = this.doc.internal.pageSize.getHeight();
    this.contentWidth = this.pageWidth - this.marginX * 2;
    this.footerNote = footerNote ?? "Vitto — estimativa educativa, não substitui análise individual.";
    this.y = 14;
    this.drawHeader(title, subtitle, metaLine);
  }

  private drawHeader(title: string, subtitle: string, metaLine: string) {
    const { doc, pageWidth, marginX, contentWidth } = this;
    doc.setFillColor(...REPORT_COLORS.blue600);
    doc.rect(0, 0, pageWidth, 4, "F");
    doc.setFillColor(...REPORT_COLORS.slate900);
    doc.roundedRect(marginX, this.y, contentWidth, 26, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text(title, marginX + 6, this.y + 9);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(203, 213, 225);
    doc.text(subtitle, marginX + 6, this.y + 16, { maxWidth: contentWidth - 12 });
    doc.setFontSize(7.5);
    doc.setTextColor(...REPORT_COLORS.blue100Text);
    doc.text(metaLine, marginX + 6, this.y + 22);
    this.y += 31;
  }

  metaRow(fields: { label: string; value: string }[], note?: string) {
    const { doc, marginX, contentWidth } = this;
    const rowH = note ? 18 : 14;
    doc.setFillColor(...REPORT_COLORS.slate100);
    doc.roundedRect(marginX, this.y, contentWidth, rowH, 2, 2, "F");
    const colWidth = contentWidth / fields.length;
    fields.forEach((field, i) => {
      const x = marginX + 5 + i * colWidth;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...REPORT_COLORS.slate900);
      doc.text(`${field.label}: `, x, this.y + 6);
      const labelWidth = doc.getTextWidth(`${field.label}: `);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...REPORT_COLORS.slate700);
      doc.text(field.value, x + labelWidth, this.y + 6);
    });
    if (note) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(7);
      doc.setTextColor(...REPORT_COLORS.slate500);
      doc.text(note, marginX + 5, this.y + 11, { maxWidth: contentWidth - 10 });
    }
    this.y += rowH + 4;
  }

  kpiCards(cards: KpiCard[]) {
    const { doc, marginX, contentWidth } = this;
    const gap = 6;
    const cardW = (contentWidth - gap * (cards.length - 1)) / cards.length;
    const cardH = 21;
    cards.forEach((card, i) => {
      const x = marginX + i * (cardW + gap);
      if (card.highlight) {
        doc.setFillColor(...REPORT_COLORS.blue50);
        doc.setDrawColor(...REPORT_COLORS.blue600);
        doc.setLineWidth(0.4);
        doc.roundedRect(x, this.y, cardW, cardH, 2.5, 2.5, "FD");
      } else {
        doc.setFillColor(...REPORT_COLORS.slate100);
        doc.roundedRect(x, this.y, cardW, cardH, 2.5, 2.5, "F");
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...(card.highlight ? REPORT_COLORS.blue700 : REPORT_COLORS.slate500));
      doc.text(card.label, x + 4, this.y + 6, { maxWidth: cardW - 8 });
      doc.setFontSize(13);
      doc.setTextColor(...REPORT_COLORS.slate900);
      doc.text(card.value, x + 4, this.y + 14, { maxWidth: cardW - 8 });
      if (card.note) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        doc.setTextColor(...REPORT_COLORS.slate700);
        doc.text(card.note, x + 4, this.y + 18.5, { maxWidth: cardW - 8 });
      }
    });
    this.y += cardH + 4;
  }

  sectionTitle(text: string) {
    const { doc, marginX } = this;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...REPORT_COLORS.slate900);
    doc.text(text, marginX, this.y);
    this.y += 3;
  }

  paragraph(text: string) {
    const { doc, marginX, contentWidth } = this;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...REPORT_COLORS.slate700);
    doc.text(text, marginX, this.y + 3, { maxWidth: contentWidth });
    this.y += 7;
  }

  table(head: string[], body: RowInput[], opts?: { boldLastRow?: boolean }) {
    autoTable(this.doc, {
      startY: this.y,
      head: [head],
      body,
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 2.2,
        font: "helvetica",
        textColor: [30, 41, 59],
        lineColor: [226, 232, 240],
        lineWidth: 0.2,
      },
      headStyles: { fillColor: [...REPORT_COLORS.slate900], textColor: [255, 255, 255], fontStyle: "bold" },
      didParseCell: (data) => {
        if (opts?.boldLastRow && data.section === "body" && data.row.index === body.length - 1) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [...REPORT_COLORS.slate100];
        }
      },
      margin: { left: this.marginX, right: this.marginX },
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.y = (this.doc as any).lastAutoTable.finalY + 8;
  }

  ensureSpace(minHeight: number) {
    if (this.y > this.pageHeight - minHeight) {
      this.doc.addPage();
      this.y = 16;
    }
  }

  calloutBox(title: string, bullets: string[]) {
    const { doc, marginX, contentWidth } = this;
    const boxH = 6 + bullets.length * 5.2 + 3;
    this.ensureSpace(boxH + 20);
    doc.setFillColor(...REPORT_COLORS.slate100);
    doc.roundedRect(marginX, this.y, contentWidth, boxH, 2.5, 2.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...REPORT_COLORS.slate900);
    doc.text(title, marginX + 4, this.y + 5.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...REPORT_COLORS.slate700);
    let bulletY = this.y + 11;
    for (const bullet of bullets) {
      doc.text(bullet, marginX + 4, bulletY, { maxWidth: contentWidth - 8 });
      bulletY += 5.2;
    }
    this.y += boxH + 4;
  }

  notesBox(notes: string) {
    const { doc, marginX, contentWidth } = this;
    this.ensureSpace(35);
    doc.setDrawColor(...REPORT_COLORS.slate500);
    doc.roundedRect(marginX, this.y, contentWidth, 18, 2, 2, "D");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...REPORT_COLORS.slate900);
    doc.text("Observações do corretor:", marginX + 4, this.y + 5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...REPORT_COLORS.slate700);
    doc.text(notes, marginX + 4, this.y + 10, { maxWidth: contentWidth - 8 });
    this.y += 22;
  }

  finish(): jsPDF {
    const { doc, marginX, pageWidth, pageHeight } = this;
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, pageHeight - 11, pageWidth - marginX, pageHeight - 11);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6.5);
      doc.setTextColor(...REPORT_COLORS.slate500);
      doc.text(this.footerNote, marginX, pageHeight - 7);
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - marginX - 18, pageHeight - 7);
    }
    return doc;
  }
}

export function formatEmissionDate(date: Date = new Date()): string {
  return (
    date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }) +
    " às " +
    date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
  );
}
