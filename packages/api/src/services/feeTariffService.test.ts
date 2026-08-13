import { describe, expect, it } from "vitest";
import { matchesContext, selectMostSpecificTariff, type TariffScopeCandidate } from "./feeTariffService.js";

const CONTEXT = { filiereId: "F1", levelId: "L1", classId: "C1", enrollmentStatus: "NOUVEAU" } as const;

function candidate(overrides: Partial<TariffScopeCandidate> = {}): TariffScopeCandidate {
  return {
    filiereId: null,
    levelId: null,
    classId: null,
    targetEnrollmentStatus: null,
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("matchesContext", () => {
  it("un tarif totalement générique correspond à n'importe quel contexte", () => {
    expect(matchesContext(candidate(), CONTEXT)).toBe(true);
  });

  it("un tarif dont une dimension renseignée ne correspond pas est rejeté", () => {
    expect(matchesContext(candidate({ filiereId: "AUTRE" }), CONTEXT)).toBe(false);
  });

  it("un tarif dont toutes les dimensions renseignées correspondent est accepté", () => {
    expect(matchesContext(candidate({ filiereId: "F1", levelId: "L1" }), CONTEXT)).toBe(true);
  });
});

describe("selectMostSpecificTariff", () => {
  it("retourne null si aucun candidat", () => {
    expect(selectMostSpecificTariff([])).toBeNull();
  });

  it("le tarif le plus spécifique (le plus de dimensions renseignées) l'emporte", () => {
    const generic = candidate({ updatedAt: new Date("2026-01-01") });
    const specific = candidate({ filiereId: "F1", levelId: "L1", updatedAt: new Date("2025-01-01") });
    expect(selectMostSpecificTariff([generic, specific])).toBe(specific);
  });

  it("à spécificité égale, le plus récemment modifié l'emporte", () => {
    const older = candidate({ filiereId: "F1", updatedAt: new Date("2025-01-01") });
    const newer = candidate({ filiereId: "F1", updatedAt: new Date("2026-01-01") });
    expect(selectMostSpecificTariff([older, newer])).toBe(newer);
  });
});
