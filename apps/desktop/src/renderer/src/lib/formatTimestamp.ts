/**
 * Formate un horodatage (ISO string ou Date) en date/heure lisible en
 * français. Utilisé notamment par le journal d'audit.
 */
export function formatTimestamp(value: string | Date): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString("fr-FR");
}
