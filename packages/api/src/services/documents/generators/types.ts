/** Résultat d'un générateur de contenu Tier 1 (MODULE-09 §0.4) — l'archivage et le QR sont gérés par le moteur, pas par le générateur. */
export interface GeneratorResult {
  relatedEntityType: string | null;
  relatedEntityId: string | null;
  relatedEntityLabel: string | null;
  /** Fusionnés avec les champs communs (numéro, campus, date) par le moteur avant génération du QR (§12). */
  qrFields: Record<string, string>;
}
