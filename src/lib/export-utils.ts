import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { WASTE_COLUMNS, MONTHS, daysInMonth, type WasteKey } from "./waste-types";

interface ExportData {
  institution: { name: string; address?: string | null; phone?: string | null; responsible_person?: string | null };
  year: number;
  month: number;
  records: Record<number, Partial<Record<WasteKey, number>>>;
}

export function exportToPDF(data: ExportData) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const inst = data.institution;
  doc.setFontSize(14);
  doc.text("CONTROL DE RESIDUOS HOSPITALARIOS", 148, 12, { align: "center" });
  doc.setFontSize(9);
  doc.text(`INSTITUCIÓN: ${inst.name}`, 10, 20);
  doc.text(`MES: ${MONTHS[data.month - 1]}`, 150, 20);
  doc.text(`AÑO: ${data.year}`, 200, 20);
  doc.text(`DIRECCIÓN: ${inst.address ?? ""}`, 10, 26);
  doc.text(`CELULAR: ${inst.phone ?? ""}`, 200, 26);
  doc.text(`RESPONSABLE: ${inst.responsible_person ?? ""}`, 10, 32);

  const days = daysInMonth(data.year, data.month);
  const head = [["Día", ...WASTE_COLUMNS.map((c) => `${c.label} (Kg)`)]];
  const body = [];
  const totals: Record<string, number> = {};
  WASTE_COLUMNS.forEach((c) => (totals[c.key] = 0));
  for (let d = 1; d <= days; d++) {
    const row = data.records[d] ?? {};
    body.push([
      String(d),
      ...WASTE_COLUMNS.map((c) => {
        const v = Number(row[c.key] ?? 0);
        totals[c.key] += v;
        return v ? v.toFixed(2) : "";
      }),
    ]);
  }
  body.push(["TOTAL", ...WASTE_COLUMNS.map((c) => totals[c.key].toFixed(2))]);

  autoTable(doc, {
    head,
    body,
    startY: 36,
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fillColor: [76, 125, 90] },
    foot: [],
    didParseCell: (d) => {
      if (d.row.index === body.length - 1) d.cell.styles.fontStyle = "bold";
    },
  });

  doc.save(`residuos_${inst.name.replace(/\s+/g, "_")}_${data.year}_${String(data.month).padStart(2, "0")}.pdf`);
}

export function exportToExcel(data: ExportData) {
  const days = daysInMonth(data.year, data.month);
  const rows: any[] = [];
  rows.push({ "INSTITUCIÓN": data.institution.name, "MES": MONTHS[data.month - 1], "AÑO": data.year });
  rows.push({});
  const totals: Record<string, number> = {};
  WASTE_COLUMNS.forEach((c) => (totals[c.key] = 0));
  for (let d = 1; d <= days; d++) {
    const r = data.records[d] ?? {};
    const row: any = { "Día": d };
    WASTE_COLUMNS.forEach((c) => {
      const v = Number(r[c.key] ?? 0);
      row[c.label] = v;
      totals[c.key] += v;
    });
    rows.push(row);
  }
  const totalRow: any = { "Día": "TOTAL" };
  WASTE_COLUMNS.forEach((c) => (totalRow[c.label] = totals[c.key]));
  rows.push(totalRow);

  const ws = XLSX.utils.json_to_sheet(rows, { skipHeader: false });
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Residuos");
  XLSX.writeFile(wb, `residuos_${data.institution.name.replace(/\s+/g, "_")}_${data.year}_${String(data.month).padStart(2, "0")}.xlsx`);
}