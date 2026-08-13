import { prisma } from "@isac-erp/db";
import type { GenerateDocumentInput } from "@isac-erp/shared";
import { drawTable, resolveUploadPath, type DocumentRenderContext } from "../pdfEngine.js";
import type { GeneratorResult } from "./types.js";

type Input = Extract<GenerateDocumentInput, { documentType: "EMPLOI_DU_TEMPS" }>;

const DAY_ORDER = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI", "DIMANCHE"];
const GRID_DAYS = ["LUNDI", "MARDI", "MERCREDI", "JEUDI", "VENDREDI", "SAMEDI"];

// Palette du gabarit réel de l'établissement (photo fournie par le porteur du projet, 2026-08-06) —
// bandeau République/Ministère/Institut bleu marine plein bord, séparateur doré, colonne Heures et
// bandeau des jours en couleurs pleines, libellés du panneau d'identité en rouge.
const BANNER_NAVY = "#132347";
const BANNER_GOLD = "#c8a13a";
const HEADER_RED = "#c0392b";
const HEADER_BLUE = "#3a72ad";
const META_LABEL_COLOR = "#1f4e8c";

/**
 * Emploi du temps (MODULE-09 §1 — documents administratifs) : deux modes.
 * - Historique (classId/teacherId) : liste simple des créneaux, conservée pour compatibilité.
 * - Grille par filière/niveau/module/année (2026-08-06, retour du porteur du projet) : lue depuis le
 *   Constructeur d'emploi du temps (scheduleBuilderService), toujours en paysage — jours en colonnes,
 *   créneaux horaires en lignes, cases blanches (pas de couleur par matière, maquette réelle de
 *   l'établissement validée le 2026-08-06).
 * Ce générateur dessine entièrement son propre en-tête (bandeau République/Ministère/Institut,
 * bandeau titre, bloc de signatures à trois parties) — le moteur partagé (texte simple sur fond blanc)
 * est désactivé pour ce type dans documentEngineService.ts, afin de reproduire à l'identique le gabarit
 * papier déjà utilisé par l'établissement plutôt que le style générique appliqué aux autres documents.
 */
export async function generateEmploiDuTemps(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  input: Input
): Promise<GeneratorResult> {
  drawInstitutionalBanner(doc, ctx);
  drawTitleBanner(doc, "EMPLOI DU TEMPS");

  const isGridMode = Boolean(input.levelId && input.periodId && input.academicYearId);

  const result = isGridMode
    ? await drawGridMode(doc, ctx, input)
    : await drawListMode(doc, ctx, input);

  drawSignatureBlock(doc, ctx);
  return result;
}

/**
 * Bandeau République/Ministère/Institut plein bord (fond bleu marine, texte blanc, devise nationale
 * tricolore) suivi d'un séparateur doré — reproduit le gabarit papier réel de l'établissement plutôt
 * que le style texte-simple-sur-fond-blanc du moteur partagé (2026-08-06, retour du porteur du projet).
 * Réutilise les textes déjà configurés dans `ctx.header` (jamais codés en dur), seule la mise en forme
 * (fond coloré, texte forcé en blanc) est bespoke à ce document.
 */
function drawInstitutionalBanner(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext): void {
  const { header } = ctx;
  const pageWidth = doc.page.width;
  const marginLeft = doc.page.margins.left;
  const contentWidth = pageWidth - marginLeft - doc.page.margins.right;
  const bannerHeight = 80;

  doc.rect(0, 0, pageWidth, bannerHeight).fill(BANNER_NAVY);

  let y = 10;
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#FFFFFF")
    .text(header.republicLine, marginLeft, y, { width: contentWidth, align: "center" });
  y += 16;

  doc.font("Helvetica").fontSize(9.5);
  const p1 = `${header.mottoPart1} – `;
  const p2 = `${header.mottoPart2} – `;
  const p3 = header.mottoPart3;
  const mottoWidth = doc.widthOfString(p1) + doc.widthOfString(p2) + doc.widthOfString(p3);
  const mottoX = marginLeft + Math.max(0, (contentWidth - mottoWidth) / 2);
  doc.fillColor(header.mottoPart1Color).text(p1, mottoX, y, { continued: true, lineBreak: false });
  doc.fillColor(header.mottoPart2Color).text(p2, { continued: true, lineBreak: false });
  doc.fillColor(header.mottoPart3Color).text(p3, { lineBreak: false });
  y += 15;

  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor("#FFFFFF")
    .text(header.schoolNameLine, marginLeft, y, { width: contentWidth, align: "center" });
  y += 13;

  doc
    .font("Helvetica-Bold")
    .fontSize(11.5)
    .fillColor("#FFFFFF")
    .text(header.instituteNameLine, marginLeft, y, { width: contentWidth, align: "center" });

  doc.rect(0, bannerHeight, pageWidth, 5).fill(BANNER_GOLD);

  doc.font("Helvetica").fillColor("#000000");
  doc.x = marginLeft;
  doc.y = bannerHeight + 5;
}

/** Bandeau titre plein bord, fond bleu, texte blanc gras italique — reproduit le gabarit papier réel. */
function drawTitleBanner(doc: PDFKit.PDFDocument, title: string): void {
  const pageWidth = doc.page.width;
  const y = doc.y;
  const height = 30;
  doc.rect(0, y, pageWidth, height).fill(HEADER_BLUE);
  doc
    .font("Helvetica-BoldOblique")
    .fontSize(16)
    .fillColor("#FFFFFF")
    .text(title, 0, y + height / 2 - 8, { width: pageWidth, align: "center" });

  doc.font("Helvetica").fillColor("#000000");
  doc.x = doc.page.margins.left;
  doc.y = y + height + 10;
}

/**
 * Panneau d'identité de la grille : logo établissement à gauche, logo secondaire à droite (découpés en
 * cercle), deux colonnes de libellé/valeur (libellé rouge souligné, valeur noire) entre les deux —
 * reproduit le gabarit papier réel (Filière/Niveau/Module à gauche, Campus/Année à droite). Pas de champ
 * "Département" : ce regroupement n'existe pas dans le modèle de données actuel (Filiere n'a pas de
 * catégorie parente) — ajouté seulement si le porteur du projet le demande explicitement.
 */
function drawMetaPanel(
  doc: PDFKit.PDFDocument,
  ctx: DocumentRenderContext,
  leftItems: { label: string; value: string }[],
  rightItems: { label: string; value: string }[]
): void {
  const marginLeft = doc.page.margins.left;
  const marginRight = doc.page.margins.right;
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const logoSize = 50;
  const rowHeight = 17;
  const panelTop = doc.y;

  // Logo droit : ministère en priorité (c'est ce champ que le moteur partagé utilise pour ce même
  // logo sur tous les autres documents — oublié ici initialement, d'où son absence signalée par le
  // porteur du projet), puis logo secondaire/partenaire, puis logo du campus.
  const logoPrimary = resolveUploadPath(ctx.establishment.logoPrimaryPath);
  const logoSecondary =
    resolveUploadPath(ctx.establishment.ministryLogoPath) ??
    resolveUploadPath(ctx.establishment.logoSecondaryPath) ??
    resolveUploadPath(ctx.campus.logoPath);

  if (logoPrimary) {
    doc.save();
    doc.circle(marginLeft + logoSize / 2, panelTop + logoSize / 2, logoSize / 2).clip();
    doc.image(logoPrimary, marginLeft, panelTop, { fit: [logoSize, logoSize] });
    doc.restore();
  }
  if (logoSecondary) {
    const rx = pageWidth - marginRight - logoSize;
    doc.save();
    doc.circle(rx + logoSize / 2, panelTop + logoSize / 2, logoSize / 2).clip();
    doc.image(logoSecondary, rx, panelTop, { fit: [logoSize, logoSize] });
    doc.restore();
  }

  const colGutter = logoSize + 28;
  const colWidth = (contentWidth - colGutter * 2) / 2;
  const leftX = marginLeft + colGutter;
  const rightX = leftX + colWidth + 24;

  leftItems.forEach((item, i) => drawMetaRow(doc, leftX, panelTop + i * rowHeight, colWidth, item));
  rightItems.forEach((item, i) => drawMetaRow(doc, rightX, panelTop + i * rowHeight, colWidth, item));

  const rowsHeight = Math.max(leftItems.length, rightItems.length) * rowHeight;
  doc.x = marginLeft;
  doc.y = panelTop + Math.max(logoSize, rowsHeight) + 10;
  doc.fillColor(ctx.printTheme.primaryTextColor);
}

function drawMetaRow(doc: PDFKit.PDFDocument, x: number, y: number, width: number, item: { label: string; value: string }): void {
  doc.font("Helvetica-Bold").fontSize(9);
  const label = `${item.label.toUpperCase()} :`;
  const labelWidth = doc.widthOfString(label);
  doc.fillColor(HEADER_RED).text(label, x, y, { lineBreak: false });
  doc.moveTo(x, y + 11).lineTo(x + labelWidth, y + 11).lineWidth(0.6).strokeColor(HEADER_RED).stroke();
  doc.fillColor("#1a1a1a").text(item.value, x + labelWidth + 6, y, { width: width - labelWidth - 6, lineBreak: false, ellipsis: true });
}

// --- Mode historique — liste simple par classe ou enseignant (inchangé). ---

async function drawListMode(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext, input: Input): Promise<GeneratorResult> {
  if (!input.classId && !input.teacherId) {
    throw new Error("Une classe ou un enseignant doit être précisé pour générer un emploi du temps.");
  }

  const templates = await prisma.seanceRecurrenceTemplate.findMany({
    where: {
      isActive: true,
      teacherId: input.teacherId,
      classes: input.classId ? { some: { classId: input.classId } } : undefined,
    },
    include: { teacher: true, subjectOffering: { include: { subject: true } }, room: true, classes: { include: { class: true } } },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const sorted = [...templates].sort((a, b) => DAY_ORDER.indexOf(a.dayOfWeek) - DAY_ORDER.indexOf(b.dayOfWeek) || a.startTime.localeCompare(b.startTime));

  const subtitle = input.classId
    ? (sorted[0]?.classes.find((c) => c.classId === input.classId)?.class.name ?? "Classe")
    : `${sorted[0]?.teacher.lastName ?? ""} ${sorted[0]?.teacher.firstName ?? ""}`.trim() || "Enseignant";

  doc.fontSize(10).fillColor(ctx.printTheme.secondaryTextColor).text(`${sorted.length} créneau(x) hebdomadaire(s) — ${subtitle}.`);
  doc.moveDown(0.75);

  drawTable(
    doc,
    ctx,
    [
      { label: "Jour", width: 65 },
      { label: "Horaire", width: 80 },
      { label: "Matière", width: 110 },
      { label: input.classId ? "Enseignant" : "Classe(s)", width: 130 },
      { label: "Salle", width: 90 },
    ],
    sorted.map((t) => [
      t.dayOfWeek,
      `${t.startTime} - ${t.endTime}`,
      t.subjectOffering.subject.name,
      input.classId ? `${t.teacher.lastName} ${t.teacher.firstName}` : t.classes.map((c) => c.class.name).join(", "),
      t.room?.label ?? "—",
    ])
  );

  const relatedEntityId = input.classId ?? input.teacherId ?? null;
  return {
    relatedEntityType: input.classId ? "Class" : "Teacher",
    relatedEntityId,
    relatedEntityLabel: `Emploi du temps — ${subtitle}`,
    qrFields: {},
  };
}

// --- Mode grille — par filière/niveau/module/année (nouveau). ---

async function drawGridMode(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext, input: Input): Promise<GeneratorResult> {
  const [level, period, academicYear, filiere] = await Promise.all([
    prisma.level.findUniqueOrThrow({ where: { id: input.levelId! } }),
    prisma.academicPeriod.findUniqueOrThrow({ where: { id: input.periodId! } }),
    prisma.academicYear.findUniqueOrThrow({ where: { id: input.academicYearId! } }),
    input.filiereId ? prisma.filiere.findUnique({ where: { id: input.filiereId } }) : Promise.resolve(null),
  ]);

  const templates = await prisma.seanceRecurrenceTemplate.findMany({
    where: {
      isActive: true,
      subjectOffering: { periodId: input.periodId! },
      classes: {
        some: {
          class: {
            academicYearId: input.academicYearId!,
            levelId: input.levelId!,
            filiereId: input.filiereId ?? undefined,
          },
        },
      },
    },
    include: { teacher: true, subjectOffering: { include: { subject: true } }, room: true, classes: { include: { class: true } } },
  });

  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  drawMetaPanel(
    doc,
    ctx,
    [
      { label: "Filière", value: filiere?.name ?? "Toutes filières" },
      { label: "Niveau", value: level.label },
      { label: "Module", value: period.label },
    ],
    [
      { label: "Campus", value: ctx.campus.name },
      { label: "Année universitaire", value: academicYear.label },
    ]
  );
  doc.moveDown(0.5);

  if (templates.length === 0) {
    doc.fontSize(10).fillColor(ctx.printTheme.secondaryTextColor).text("Aucun créneau n'a encore été posé pour cette sélection.", x, doc.y, { width });
    return {
      relatedEntityType: "Level",
      relatedEntityId: input.levelId ?? null,
      relatedEntityLabel: `Emploi du temps — ${filiere?.name ?? level.label} — ${period.label}`,
      qrFields: {},
    };
  }

  // Créneaux horaires réellement utilisés (pas une grille fixe imposée) — un par (startTime, endTime) distinct.
  const timeSlots = [...new Map(templates.map((t) => [`${t.startTime}-${t.endTime}`, { startTime: t.startTime, endTime: t.endTime }])).values()].sort(
    (a, b) => a.startTime.localeCompare(b.startTime)
  );

  // N'affiche que les jours où la classe a effectivement cours — plus de place par jour, texte plus grand
  // (2026-08-06, retour du porteur du projet : jours vides inutiles, écritures trop petites).
  const activeDays = GRID_DAYS.filter((day) => templates.some((t) => t.dayOfWeek === day));
  const days = activeDays.length > 0 ? activeDays : GRID_DAYS;

  const timeColWidth = 75;
  const dayColWidth = (width - timeColWidth) / days.length;
  const headerRowHeight = 28;
  const availableHeight = doc.page.height - doc.page.margins.bottom - doc.y - headerRowHeight - 90;
  const rowHeight = Math.max(65, Math.min(120, availableHeight / Math.max(1, timeSlots.length)));

  // Colonne Heures en rouge plein (liseré doré) et bandeau des jours en bleu plein, texte blanc gras
  // italique — reproduit le gabarit papier réel de l'établissement (2026-08-06, retour du porteur du
  // projet), remplace le style pâle/institutionnel précédent.
  let y = doc.y;
  let cx = x;
  doc.rect(cx, y, timeColWidth, headerRowHeight).fill(HEADER_RED);
  doc
    .font("Helvetica-BoldOblique")
    .fontSize(10)
    .fillColor("#FFFFFF")
    .text("HEURES", cx, y + headerRowHeight / 2 - 5, { width: timeColWidth, align: "center" });
  cx += timeColWidth;
  for (const day of days) {
    doc.rect(cx, y, dayColWidth, headerRowHeight).fill(HEADER_BLUE);
    doc
      .font("Helvetica-BoldOblique")
      .fontSize(12.5)
      .fillColor("#FFFFFF")
      .text(day, cx, y + headerRowHeight / 2 - 7, { width: dayColWidth, align: "center" });
    cx += dayColWidth;
  }
  y += headerRowHeight;

  timeSlots.forEach((slot) => {
    cx = x;
    doc.rect(cx, y, timeColWidth, rowHeight).fill(HEADER_RED);
    doc.rect(cx, y, 3, rowHeight).fill(BANNER_GOLD);
    doc
      .font("Helvetica-BoldOblique")
      .fontSize(11)
      .fillColor("#FFFFFF")
      .text(`${slot.startTime}\n${slot.endTime}`, cx, y + rowHeight / 2 - 13, { width: timeColWidth, align: "center" });
    cx += timeColWidth;

    for (const day of days) {
      doc.rect(cx, y, dayColWidth, rowHeight).fillAndStroke("#FFFFFF", BANNER_NAVY);
      const matches = templates.filter((t) => t.dayOfWeek === day && t.startTime === slot.startTime && t.endTime === slot.endTime);
      if (matches.length > 0) {
        drawSessionCards(doc, cx, y, dayColWidth, rowHeight, matches);
      }
      cx += dayColWidth;
    }
    y += rowHeight;
  });

  doc.x = x;
  doc.y = y + 14;
  doc.fillColor(ctx.printTheme.primaryTextColor);

  return {
    relatedEntityType: "Level",
    relatedEntityId: input.levelId ?? null,
    relatedEntityLabel: `Emploi du temps — ${filiere?.name ?? level.label} — ${period.label}`,
    qrFields: {},
  };
}

/**
 * Cases blanches (pas de couleur par matière — maquette réelle de l'établissement validée le
 * 2026-08-06) : seul un léger séparateur horizontal distingue deux séances mutualisées dans la même
 * case. Bloc matière/enseignant/salle centré comme groupe au milieu de la case.
 */
function drawSessionCards(
  doc: PDFKit.PDFDocument,
  cellX: number,
  cellY: number,
  cellWidth: number,
  cellHeight: number,
  matches: Array<{
    subjectOffering: { subject: { name: string } };
    teacher: { lastName: string; firstName: string; phonePrimary: string | null };
    room: { label: string } | null;
    classes: Array<{ class: { name: string } }>;
  }>
): void {
  const padding = 3;
  const innerHeight = (cellHeight - padding * (matches.length + 1)) / matches.length;
  let y = cellY + padding;

  for (const [index, m] of matches.entries()) {
    const cardX = cellX + padding;
    const cardWidth = cellWidth - padding * 2;
    const textWidth = cardWidth - 10;
    if (index > 0) {
      doc
        .moveTo(cardX, y)
        .lineTo(cardX + cardWidth, y)
        .lineWidth(0.5)
        .strokeColor("#cccccc")
        .stroke();
    }

    const subjSize = 10;
    const teachSize = 8.5;
    const phoneSize = 7.5;
    const roomSize = 8;
    const lineGap = 2.5;
    const subjLineH = subjSize * 1.15;
    const teachLineH = teachSize * 1.15;
    const phoneLineH = phoneSize * 1.15;
    const roomLineH = roomSize * 1.15;
    const hasPhone = Boolean(m.teacher.phonePrimary);
    const hasRoom = Boolean(m.room);
    const contentHeight =
      subjLineH + lineGap + teachLineH + (hasPhone ? lineGap + phoneLineH : 0) + (hasRoom ? lineGap + roomLineH : 0);
    let textY = y + Math.max(4, (innerHeight - contentHeight) / 2);

    doc
      .font("Helvetica-Bold")
      .fontSize(subjSize)
      .fillColor("#1a1a1a")
      .text(m.subjectOffering.subject.name.toUpperCase(), cardX + 8, textY, { width: textWidth, align: "center", lineBreak: false, ellipsis: true });
    textY += subjLineH + lineGap;

    doc
      .font("Helvetica")
      .fontSize(teachSize)
      .fillColor("#5b5670")
      .text(`${m.teacher.lastName} ${m.teacher.firstName}`, cardX + 8, textY, {
        width: textWidth,
        align: "center",
        lineBreak: false,
        ellipsis: true,
      });

    if (m.teacher.phonePrimary) {
      textY += teachLineH + lineGap;
      doc
        .font("Helvetica")
        .fontSize(phoneSize)
        .fillColor("#5b5670")
        .text(m.teacher.phonePrimary, cardX + 8, textY, { width: textWidth, align: "center", lineBreak: false });
    }

    if (m.room) {
      textY += (hasPhone ? phoneLineH : teachLineH) + lineGap;
      doc
        .font("Helvetica-Bold")
        .fontSize(roomSize)
        .fillColor(META_LABEL_COLOR)
        .text(m.room.label, cardX + 8, textY, { width: textWidth, align: "center", lineBreak: false });
    }
    y += innerHeight + padding;
  }
}

/**
 * Bloc de validation — Directeur des Études / Directeur des Campus / Directeur Général, jamais liés à
 * une donnée enregistrée. Repassé de 2 à 3 signataires le 2026-08-06 (retour du porteur du projet,
 * maquette réelle de l'établissement).
 */
function drawSignatureBlock(doc: PDFKit.PDFDocument, ctx: DocumentRenderContext): void {
  const x = doc.page.margins.left;
  const width = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  const reserved = 60;
  if (doc.y < bottomLimit - reserved) {
    doc.y = bottomLimit - reserved;
  }

  const colWidth = width / 3;
  const y = doc.y;
  const roles = ["LE DIRECTEUR DES ÉTUDES", "LE DIRECTEUR DES CAMPUS", "LE DIRECTEUR GÉNÉRAL"];
  roles.forEach((role, i) => {
    const cx = x + i * colWidth;
    doc
      .moveTo(cx, y + 26)
      .lineTo(cx + colWidth - 30, y + 26)
      .lineWidth(0.6)
      .strokeColor("#999999")
      .stroke();
    doc
      .font("Helvetica-Bold")
      .fontSize(8.5)
      .fillColor(ctx.printTheme.primaryTextColor)
      .text(role, cx, y + 31, { width: colWidth - 30, align: "center" });
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(ctx.printTheme.secondaryTextColor)
      .text("Nom et signature", cx, y, { width: colWidth - 30, align: "center" });
  });

  doc.x = x;
  doc.y = y + 46;
  doc.fillColor(ctx.printTheme.primaryTextColor);
}
