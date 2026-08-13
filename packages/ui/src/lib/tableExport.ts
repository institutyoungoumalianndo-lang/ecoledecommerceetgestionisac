import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  header: string;
  value: (row: T) => string | number;
}

function toCsvValue(value: string | number): string {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/** Même logique d'export que `DataTable` (BOM UTF-8 en octets bruts — voir son commentaire). */
export function exportRowsToCsv<T>(rows: T[], columns: ExportColumn<T>[], filename: string): void {
  const header = columns.map((c) => toCsvValue(c.header)).join(",");
  const lines = rows.map((row) => columns.map((c) => toCsvValue(c.value(row))).join(","));
  const csv = [header, ...lines].join("\n");
  const utf8Bom = new Uint8Array([0xef, 0xbb, 0xbf]);
  downloadBlob(new Blob([utf8Bom, csv], { type: "text/csv;charset=utf-8;" }), `${filename}.csv`);
}

export function exportRowsToXlsx<T>(rows: T[], columns: ExportColumn<T>[], filename: string): void {
  const data = rows.map((row) => {
    const record: Record<string, string | number> = {};
    for (const column of columns) record[column.header] = column.value(row);
    return record;
  });
  const worksheet = XLSX.utils.json_to_sheet(data, { header: columns.map((c) => c.header) });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Export");
  XLSX.writeFile(workbook, `${filename}.xlsx`);
}

/** Export PDF client (tableaux avancés, refonte UI/UX Phase 4, 2026-07-30) — paysage, une page par
 * lot de lignes, gérée automatiquement par autotable. Import dynamique : jsPDF n'est chargé que
 * lorsqu'un export PDF est réellement déclenché, pas au chargement de l'écran. */
export async function exportRowsToPdf<T>(
  rows: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title?: string
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait" });
  if (title) {
    doc.setFontSize(12);
    doc.text(title, 14, 14);
  }
  autoTable(doc, {
    startY: title ? 20 : 12,
    head: [columns.map((c) => c.header)],
    body: rows.map((row) => columns.map((c) => String(c.value(row)))),
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [31, 96, 174] },
  });
  doc.save(`${filename}.pdf`);
}

/** Copie les lignes au format TSV (collable directement dans Excel/Sheets). */
export async function copyRowsToClipboard<T>(rows: T[], columns: ExportColumn<T>[]): Promise<void> {
  const header = columns.map((c) => c.header).join("\t");
  const lines = rows.map((row) => columns.map((c) => String(c.value(row))).join("\t"));
  await navigator.clipboard.writeText([header, ...lines].join("\n"));
}

/** Lit un fichier Excel/CSV et retourne ses lignes sous forme d'objets clé/valeur (1ère ligne = en-têtes). */
export async function parseSpreadsheetFile(file: File): Promise<Record<string, string>[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "", raw: false });
}
