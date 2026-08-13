import { describe, expect, it } from "vitest";
import { summarize, type StudentRow } from "./pedagogicalPerformanceService.js";

describe("summarize", () => {
  it("calcule la moyenne et le taux de réussite en ignorant les étudiants sans moyenne calculable", () => {
    const rows: StudentRow[] = [
      { filiereName: "Gestion", levelLabel: "L1", moyenne: 14 },
      { filiereName: "Gestion", levelLabel: "L1", moyenne: 8 },
      { filiereName: "Gestion", levelLabel: "L1", moyenne: null },
    ];
    const result = summarize("Gestion", rows, 10);
    expect(result.studentCount).toBe(3);
    expect(result.averageGrade).toBe(11);
    expect(result.successRate).toBe(50);
  });

  it("renvoie des valeurs nulles quand aucune moyenne n'est calculable", () => {
    const rows: StudentRow[] = [{ filiereName: "Gestion", levelLabel: "L1", moyenne: null }];
    const result = summarize("Gestion", rows, 10);
    expect(result.studentCount).toBe(1);
    expect(result.averageGrade).toBeNull();
    expect(result.successRate).toBeNull();
  });

  it("100% de réussite quand toutes les moyennes atteignent le seuil d'admission", () => {
    const rows: StudentRow[] = [
      { filiereName: "Gestion", levelLabel: "L1", moyenne: 12 },
      { filiereName: "Gestion", levelLabel: "L1", moyenne: 10 },
    ];
    const result = summarize("Gestion", rows, 10);
    expect(result.successRate).toBe(100);
  });
});
