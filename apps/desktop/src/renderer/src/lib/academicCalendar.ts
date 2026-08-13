/**
 * Résout l'année calendaire (2026, 2027...) correspondant à un mois (1-12) donné à l'intérieur d'une
 * année scolaire — nécessaire car une année scolaire chevauche toujours deux années calendaires (ex.
 * Septembre 2026 → Juillet 2027) et les écrans n'exposent qu'un sélecteur "Année scolaire" + "Mois",
 * jamais une année calendaire explicite. Essaie d'abord l'année de début de l'année scolaire ; si le
 * mois choisi n'y tombe pas dans les bornes, retombe sur l'année de fin.
 */
export function resolveCalendarYearForMonth(month: number, academicYear: { startDate: Date; endDate: Date }): number {
  const startYear = academicYear.startDate.getFullYear();
  const endYear = academicYear.endDate.getFullYear();
  if (startYear === endYear) return startYear;

  const candidate = new Date(startYear, month - 1, 15);
  if (candidate >= academicYear.startDate && candidate <= academicYear.endDate) {
    return startYear;
  }
  return endYear;
}
