import type { GenerateDocumentInput } from "@isac-erp/shared";
import { getCampusSettings } from "../../campusService.js";
import { getEstablishmentSettings } from "../../establishmentService.js";
import { getPayrollLineById } from "../../payrollLineService.js";
import { formatAmount, formatDateFr, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "BULLETIN_SALAIRE" }>;

// Palette "paye" adoucie à dominante verte — retenue le 2026-07-31 après plusieurs itérations sur
// maquette (retour du porteur du projet : design plus équilibré et moderne, couleurs légères,
// migrant vers le vert). Propre à ce document ; les autres types restent sur le thème d'impression
// configuré (`ctx.printTheme`) — ce bulletin est le seul à avoir une identité visuelle dédiée.
const GREEN = "#2E7D5B";
const GREEN_DEEP = "#1F5E42";
const GREEN_TINT = "#EAF6EF";
const GREEN_TINT_2 = "#D9EEE1";
const LINE_COLOR = "#DCEAE2";
const INK = "#1E2A24";
const INK_SOFT = "#5C6E64";

interface GainRow {
  desc: string;
  heures: string;
  taux: string;
  total: string;
  obs: string;
}

/**
 * Bulletin de paie — refonte du 2026-07-31 (retour du porteur du projet, sur un exemple de bulletin
 * fourni : structure enrichie GAINS/DÉDUCTIONS avec heures/taux/observations, reprise ici avec les
 * coordonnées réelles de l'école plutôt que codées en dur, et une palette dédiée vert clair plutôt
 * que le thème d'impression générique). Uniquement pour les lignes VALIDEE (voir
 * PayrollLineDetailDialog.tsx — seul état où "Voir le bulletin" est proposé) : données figées, donc
 * génération idempotente (documentEngineService.ts) — un seul document archivé par ligne de paie.
 *
 * L'entête institutionnelle (logos, nom d'école, titre "BULLETIN DE SALAIRE — N° ...") et la
 * signature/cachet sont déjà rendus par le moteur centralisé (documentEngineService.ts) avant/après
 * cette fonction — ce générateur ne dessine que le contenu propre au bulletin, en s'appuyant sur le
 * signataire déjà configurable dans Paramètres → Documents → Signataires (rôle "Comptable").
 */
export async function generateBulletinSalaire(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  const [line, establishment, campus] = await Promise.all([
    getPayrollLineById(input.payrollLineId),
    getEstablishmentSettings(),
    getCampusSettings(),
  ]);

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // --- Coordonnées de l'établissement (jamais codées en dur — Paramètres → Établissement). ---
  const addressParts = [establishment.address, establishment.city].filter((p): p is string => Boolean(p));
  const contactParts = [addressParts.join(", "), establishment.phones.length > 0 ? establishment.phones.join(" / ") : null].filter(
    (p): p is string => Boolean(p && p.length > 0)
  );
  if (contactParts.length > 0) {
    doc.fontSize(7.5).fillColor(INK_SOFT).text(contactParts.join("  —  "), x, doc.y, { width, align: "center" });
    doc.moveDown(0.6);
  }

  // --- Bandeau période / émission. ---
  drawInfoStrip(doc, x, width, [
    ["Début période", formatDateFr(line.payPeriodStartDate)],
    ["Fin période", formatDateFr(line.payPeriodEndDate)],
    ["Date d'émission", formatDateFr(new Date())],
  ]);
  doc.moveDown(0.6);

  // --- Informations de l'employé. ---
  doc
    .font("Helvetica-Bold")
    .fontSize(8)
    .fillColor(GREEN_DEEP)
    .text("INFORMATIONS DE L'EMPLOYÉ", x, doc.y, { width, align: "left", characterSpacing: 0.3 });
  doc.font("Helvetica");
  doc.moveDown(0.3);
  drawInfoGrid(doc, x, width, [
    ["Nom", line.employeeName],
    ["Matricule", line.employeeMatricule],
    ["Poste", line.employeeCategoryLabel],
    ["Département", line.employeeDepartment ?? "—"],
    ["Adresse", line.employeeAddress ?? "—"],
    ["Téléphone", line.employeePhone ?? "—"],
    ["Période", capitalize(line.payPeriodLabel)],
    ["Mode de paiement", line.paymentMethodLabel ?? "—"],
  ]);
  doc.moveDown(0.6);

  // --- GAINS. ---
  const obs = statusLabel(line);
  const gainRows: GainRow[] = [];
  const baseHoursApplicable =
    line.hoursWorked !== null && (line.employeeSalaryMode === "HORAIRE" || line.employeeTeachingHoursPaid);
  gainRows.push({
    desc: "Salaire de base",
    heures: baseHoursApplicable ? String(line.hoursWorked) : "—",
    taux: baseHoursApplicable && line.hourlyRate !== null ? `${formatAmount(line.hourlyRate)} GNF` : "—",
    total: `${formatAmount(line.baseSalary)} GNF`,
    obs,
  });
  if (line.overtimeAmount !== null && line.overtimeAmount > 0) {
    gainRows.push({
      desc: "Heures supplémentaires",
      heures: String(line.overtimeHours ?? 0),
      taux: "—",
      total: `${formatAmount(line.overtimeAmount)} GNF`,
      obs,
    });
  }
  for (const c of line.components.filter((c) => c.componentKind === "PRIME" || c.componentKind === "INDEMNITE")) {
    gainRows.push({ desc: c.componentTypeLabel, heures: "—", taux: "—", total: `${formatAmount(c.amount)} GNF`, obs });
  }

  drawSectionLabel(doc, x, width, "Gains");
  drawPayTable(
    doc,
    x,
    width,
    [
      { label: "Description", width: 0.38, align: "left" },
      { label: "Heures", width: 0.12 },
      { label: "Taux", width: 0.17 },
      { label: "Total", width: 0.2 },
      { label: "Obs.", width: 0.13 },
    ],
    gainRows.map((r) => [r.desc, r.heures, r.taux, r.total, r.obs]),
    { label: "Salaire brut", value: `${formatAmount(line.grossSalary)} GNF`, spanBeforeValue: 3 }
  );
  doc.moveDown(0.6);

  // --- DÉDUCTIONS. ---
  const deductionRows: string[][] = [];
  for (const c of line.components.filter((c) => c.componentKind === "RETENUE" || c.componentKind === "COTISATION")) {
    deductionRows.push([c.componentTypeLabel, `${formatAmount(c.amount)} GNF`]);
  }
  if (line.totalAdvancesDeducted > 0) {
    deductionRows.push(["Avance sur salaire déduite", `${formatAmount(line.totalAdvancesDeducted)} GNF`]);
  }
  const totalDeductions = line.grossSalary - line.netSalary;
  if (deductionRows.length === 0) {
    deductionRows.push(["Aucune déduction", "0 GNF"]);
  }
  drawSectionLabel(doc, x, width, "Déductions");
  drawPayTable(
    doc,
    x,
    width,
    [
      { label: "Description", width: 0.75, align: "left" },
      { label: "Total", width: 0.25 },
    ],
    deductionRows,
    { label: "Total des déductions", value: `${formatAmount(totalDeductions)} GNF`, spanBeforeValue: 1 }
  );
  doc.moveDown(0.5);

  // --- Net à payer. ---
  const netBoxWidth = 190;
  const netBoxHeight = 34;
  const netBoxX = x + width - netBoxWidth;
  const netBoxY = doc.y;
  doc.roundedRect(netBoxX, netBoxY, netBoxWidth, netBoxHeight, 6).lineWidth(1.2).strokeColor(GREEN).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(7.5)
    .fillColor(GREEN_DEEP)
    .text("NET À PAYER", netBoxX + 14, netBoxY + 11, { width: 90, characterSpacing: 0.3 });
  doc
    .fontSize(15)
    .text(`${formatAmount(line.netSalary)} GNF`, netBoxX, netBoxY + 8, { width: netBoxWidth - 14, align: "right" });
  doc.font("Helvetica").fillColor(INK);
  doc.y = netBoxY + netBoxHeight + 4;
  doc.x = x;

  // --- Mention "en cas de litige" — ancrée en bas de page, sans perturber le doc.y courant (la
  // signature/cachet, rendus juste après par le moteur centralisé, s'appuient sur ce doc.y). ---
  const litigePhone = campus.phones[0] ?? establishment.phones[0] ?? null;
  if (litigePhone) {
    const noteHeight = 22;
    const noteY = doc.page.height - doc.page.margins.bottom - noteHeight - 6;
    const originalBottomMargin = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.roundedRect(x, noteY, width, noteHeight, 4).fillColor(GREEN_TINT).fill();
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(GREEN_DEEP)
      .text(`En cas de litige, veuillez nous contacter au ${litigePhone}`, x, noteY + 7, { width, align: "center" });
    doc.page.margins.bottom = originalBottomMargin;
    doc.fillColor(INK);
  }

  return {
    relatedEntityType: "PayrollLine",
    relatedEntityId: line.id,
    relatedEntityLabel: `${line.employeeName} — ${line.payPeriodLabel}`,
    qrFields: { employe: line.employeeMatricule, periode: line.payPeriodLabel, net: formatAmount(line.netSalary) },
  };
}

function capitalize(text: string): string {
  return text.length > 0 ? text[0]!.toUpperCase() + text.slice(1) : text;
}

/** "Payé" si un mode de paiement a été enregistré (paiement réellement exécuté), sinon le statut brut. */
function statusLabel(line: Awaited<ReturnType<typeof getPayrollLineById>>): string {
  if (line.paymentMethodLabel) return "Payé";
  return line.status === "VALIDEE" ? "Validée" : line.status === "CALCULEE" ? "Calculée" : "Brouillon";
}

/** Bandeau de 2-3 pastilles vert clair (période/émission) — largeur égale, sur une seule ligne. */
function drawInfoStrip(doc: PDFKit.PDFDocument, x: number, width: number, fields: [string, string][]): void {
  const gap = 8;
  const cellWidth = (width - gap * (fields.length - 1)) / fields.length;
  const cellHeight = 30;
  const y = doc.y;
  fields.forEach(([label, value], i) => {
    const cx = x + i * (cellWidth + gap);
    doc.roundedRect(cx, y, cellWidth, cellHeight, 6).fillColor(GREEN_TINT).fill();
    doc
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .fillColor(GREEN_DEEP)
      .text(label.toUpperCase(), cx, y + 6, { width: cellWidth, align: "center", characterSpacing: 0.2 });
    doc.font("Helvetica-Bold").fontSize(9).fillColor(INK).text(value, cx, y + 16, { width: cellWidth, align: "center" });
  });
  doc.font("Helvetica").fillColor(INK);
  doc.x = x;
  doc.y = y + cellHeight;
}

/** Cadre unique vert très pâle, grille 2 colonnes remplie ligne par ligne (pas colonne par colonne). */
function drawInfoGrid(doc: PDFKit.PDFDocument, x: number, width: number, fields: [string, string][]): void {
  const columns = 2;
  const rows = Math.ceil(fields.length / columns);
  const rowHeight = 20;
  const padding = 10;
  const boxHeight = rows * rowHeight + padding * 2;
  const y = doc.y;

  doc.roundedRect(x, y, width, boxHeight, 6).fillColor(GREEN_TINT).fill();

  const colWidth = width / columns;
  fields.forEach(([label, value], i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const cx = x + padding + col * colWidth;
    const cy = y + padding + row * rowHeight;
    doc
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .fillColor(GREEN_DEEP)
      .text(label.toUpperCase(), cx, cy, { width: colWidth - padding * 1.5, characterSpacing: 0.2, lineBreak: false });
    doc
      .font("Helvetica-Bold")
      .fontSize(9)
      .fillColor(INK)
      .text(value, cx, cy + 9, { width: colWidth - padding * 1.5, lineBreak: false, ellipsis: true });
  });

  doc.font("Helvetica").fillColor(INK);
  doc.x = x;
  doc.y = y + boxHeight;
}

function drawSectionLabel(doc: PDFKit.PDFDocument, x: number, width: number, label: string): void {
  const y = doc.y;
  doc.font("Helvetica-Bold").fontSize(8.5).fillColor(GREEN_DEEP).text(label.toUpperCase(), x, y, { characterSpacing: 0.4 });
  const labelWidth = doc.widthOfString(label.toUpperCase(), { characterSpacing: 0.4 } as PDFKit.Mixins.TextOptions);
  doc
    .strokeColor(LINE_COLOR)
    .lineWidth(0.75)
    .moveTo(x + labelWidth + 8, y + 5)
    .lineTo(x + width, y + 5)
    .stroke();
  doc.font("Helvetica").fillColor(INK);
  doc.x = x;
  doc.y = y + 14;
}

/**
 * Tableau à coins arrondis, entête vert clair, ligne de total optionnelle (vert pâle, en gras) —
 * utilisé pour GAINS et DÉDUCTIONS. `spanBeforeValue` = nombre de colonnes fusionnées avant la
 * colonne de valeur du total (le reste, jusqu'à la dernière colonne, affiche la valeur).
 */
function drawPayTable(
  doc: PDFKit.PDFDocument,
  x: number,
  width: number,
  columns: { label: string; width: number; align?: "left" | "center" }[],
  rows: string[][],
  total?: { label: string; value: string; spanBeforeValue: number }
): void {
  const headerHeight = 18;
  const rowHeight = 20;
  const colWidths = columns.map((c) => c.width * width);
  const startY = doc.y;
  let y = startY;

  // Entête.
  doc.roundedRect(x, y, width, headerHeight, 6).fillColor(GREEN_TINT_2).fill();
  // Masque les coins arrondis du bas de l'entête pour un raccord net avec les lignes suivantes.
  doc.rect(x, y + headerHeight / 2, width, headerHeight / 2).fillColor(GREEN_TINT_2).fill();
  let cx = x;
  columns.forEach((col, i) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(6.5)
      .fillColor(GREEN_DEEP)
      .text(col.label.toUpperCase(), cx + 6, y + 6, { width: colWidths[i]! - 10, align: col.align ?? "center", characterSpacing: 0.2 });
    cx += colWidths[i]!;
  });
  y += headerHeight;

  // Lignes.
  rows.forEach((row, rowIndex) => {
    cx = x;
    columns.forEach((col, i) => {
      doc
        .font("Helvetica")
        .fontSize(8.5)
        .fillColor(INK)
        .text(row[i] ?? "", cx + 6, y + 6, { width: colWidths[i]! - 10, align: col.align ?? "center", lineBreak: false, ellipsis: true });
      cx += colWidths[i]!;
    });
    if (rowIndex < rows.length - 1 || total) {
      doc
        .strokeColor(LINE_COLOR)
        .lineWidth(0.5)
        .moveTo(x, y + rowHeight)
        .lineTo(x + width, y + rowHeight)
        .stroke();
    }
    y += rowHeight;
  });

  // Total.
  if (total) {
    const spanWidth = colWidths.slice(0, total.spanBeforeValue).reduce((s, w) => s + w, 0);
    const valueWidth = width - spanWidth;
    doc.rect(x, y, width, rowHeight).fillColor(GREEN_TINT).fill();
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(GREEN_DEEP)
      .text(total.label, x + 6, y + 6, { width: spanWidth - 10, lineBreak: false });
    doc.text(total.value, x + spanWidth, y + 6, { width: valueWidth - 6, align: "right", lineBreak: false });
    y += rowHeight;
  }

  // Contour extérieur (coins arrondis).
  doc.roundedRect(x, startY, width, y - startY, 6).lineWidth(0.75).strokeColor(LINE_COLOR).stroke();

  doc.font("Helvetica").fillColor(INK);
  doc.x = x;
  doc.y = y;
}
