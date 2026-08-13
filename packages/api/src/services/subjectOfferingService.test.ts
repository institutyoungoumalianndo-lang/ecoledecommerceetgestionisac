import { describe, expect, it } from "vitest";
import { pickMostSpecificOffering } from "./subjectOfferingService.js";

interface Candidate {
  filiereId: string | null;
  updatedAt: Date;
}

function candidate(overrides: Partial<Candidate> = {}): Candidate {
  return { filiereId: null, updatedAt: new Date("2026-01-01"), ...overrides };
}

describe("pickMostSpecificOffering", () => {
  it("retourne null si aucun candidat", () => {
    expect(pickMostSpecificOffering([])).toBeNull();
  });

  it("retourne l'unique candidat générique s'il n'y en a qu'un", () => {
    const generic = candidate();
    expect(pickMostSpecificOffering([generic])).toBe(generic);
  });

  it("une affectation spécifique à la filière l'emporte sur la générique", () => {
    const generic = candidate({ updatedAt: new Date("2026-01-01") });
    const specific = candidate({ filiereId: "F1", updatedAt: new Date("2025-01-01") });
    expect(pickMostSpecificOffering([generic, specific])).toBe(specific);
  });

  it("à spécificité égale, la plus récemment modifiée l'emporte", () => {
    const older = candidate({ filiereId: "F1", updatedAt: new Date("2025-01-01") });
    const newer = candidate({ filiereId: "F1", updatedAt: new Date("2026-01-01") });
    expect(pickMostSpecificOffering([older, newer])).toBe(newer);
  });
});
