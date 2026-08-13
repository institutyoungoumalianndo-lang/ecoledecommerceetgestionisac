import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

/**
 * Stockage local des fichiers importés (logos, signatures, cachet, images de
 * thème — Module 2 §3.4/3.5/3.6/3.15). Un dossier par installation, configurable
 * via UPLOADS_DIR (par défaut ./uploads, relatif au process du serveur local).
 * Les fichiers ne transitent jamais par tRPC (voir DECISIONS.md ADR-012).
 */
export const UPLOADS_DIR = process.env.UPLOADS_DIR ?? path.resolve(process.cwd(), "uploads");

const MAX_DIMENSION_PX = 1200;

export interface SavedImage {
  /** Chemin relatif servi par l'API (voir index.ts, route statique /uploads). */
  path: string;
}

/**
 * Redimensionne (si nécessaire) et enregistre une image importée. Ne
 * dépasse jamais MAX_DIMENSION_PX sur le plus grand côté, sans jamais
 * agrandir une image plus petite (`withoutEnlargement`), en conservant le
 * ratio et la meilleure qualité possible pour cette taille.
 */
export async function saveResizedImage(buffer: Buffer, originalFilename: string): Promise<SavedImage> {
  await mkdir(UPLOADS_DIR, { recursive: true });

  const extension = path.extname(originalFilename).toLowerCase() || ".png";
  const filename = `${randomUUID()}${extension}`;
  const destination = path.join(UPLOADS_DIR, filename);

  await sharp(buffer)
    .resize({
      width: MAX_DIMENSION_PX,
      height: MAX_DIMENSION_PX,
      fit: "inside",
      withoutEnlargement: true,
    })
    .toFile(destination);

  return { path: `/uploads/${filename}` };
}

/**
 * Stocke un document administratif étudiant tel quel (MODULE-04 §2.5) : pas
 * de redimensionnement (contrairement aux images ci-dessus), types acceptés
 * élargis aux PDF (diplômes, relevés). Dossier séparé pour rester lisible.
 */
export async function saveDocumentFile(buffer: Buffer, originalFilename: string): Promise<SavedImage> {
  const documentsDir = path.join(UPLOADS_DIR, "documents");
  await mkdir(documentsDir, { recursive: true });

  const extension = path.extname(originalFilename).toLowerCase() || ".bin";
  const filename = `${randomUUID()}${extension}`;
  const destination = path.join(documentsDir, filename);

  await writeFile(destination, buffer);

  return { path: `/uploads/documents/${filename}` };
}

/**
 * Archive un PDF généré par le moteur documentaire centralisé (MODULE-09 §1.7). Dossier séparé de
 * `documents/` (documents importés par les utilisateurs) pour ne jamais mélanger fichiers générés et
 * fichiers téléversés. Le nom de fichier reprend le numéro du document (déjà unique) pour rester
 * lisible sur le disque, sans jamais l'écraser (un document généré n'est jamais modifié après coup).
 */
export async function saveGeneratedDocument(buffer: Buffer, documentNumber: string): Promise<SavedImage> {
  const generatedDir = path.join(UPLOADS_DIR, "generated-documents");
  await mkdir(generatedDir, { recursive: true });

  const filename = `${documentNumber.replace(/[^a-zA-Z0-9_-]/g, "_")}-${randomUUID()}.pdf`;
  const destination = path.join(generatedDir, filename);

  await writeFile(destination, buffer);

  return { path: `/uploads/generated-documents/${filename}` };
}
