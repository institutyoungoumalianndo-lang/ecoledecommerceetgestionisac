import { describe, expect, it } from "vitest";
import { CARD_HEIGHT_MM, CARD_WIDTH_MM, MM_TO_PT, computeCardLayout, generateVerificationCode } from "./studentCardEngine.js";

describe("generateVerificationCode", () => {
  it("produit un code au format XXXX-XXXX", () => {
    const code = generateVerificationCode();
    expect(code).toMatch(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/);
  });

  it("n'utilise jamais de caractères ambigus (0/O, 1/I) — saisie manuelle sans scanner", () => {
    for (let i = 0; i < 200; i++) {
      const code = generateVerificationCode();
      expect(code).not.toMatch(/[01OI]/);
    }
  });

  it("génère des codes différents à chaque appel (entropie suffisante)", () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateVerificationCode()));
    expect(codes.size).toBe(50);
  });
});

describe("computeCardLayout", () => {
  const A4_WIDTH_PT = 595.28;
  const A4_HEIGHT_PT = 841.89;

  it("dimensionne les cartes à 54×86mm converties en points", () => {
    const layout = computeCardLayout(A4_WIDTH_PT, A4_HEIGHT_PT);
    expect(layout.cardWidthPt).toBeCloseTo(CARD_WIDTH_MM * MM_TO_PT, 5);
    expect(layout.cardHeightPt).toBeCloseTo(CARD_HEIGHT_MM * MM_TO_PT, 5);
  });

  it("centre la paire recto/verso horizontalement sur la page", () => {
    const layout = computeCardLayout(A4_WIDTH_PT, A4_HEIGHT_PT);
    const totalWidth = layout.cardWidthPt * 2 + layout.gapPt;
    const expectedStartX = (A4_WIDTH_PT - totalWidth) / 2;
    expect(layout.frontX).toBeCloseTo(expectedStartX, 5);
    expect(layout.backX).toBeCloseTo(expectedStartX + layout.cardWidthPt + layout.gapPt, 5);
  });

  it("place la ligne de pliage entre les deux faces, à mi-écart", () => {
    const layout = computeCardLayout(A4_WIDTH_PT, A4_HEIGHT_PT);
    expect(layout.foldX).toBeCloseTo(layout.frontX + layout.cardWidthPt + layout.gapPt / 2, 5);
    expect(layout.foldX).toBeGreaterThan(layout.frontX + layout.cardWidthPt);
    expect(layout.foldX).toBeLessThan(layout.backX);
  });

  it("place les cartes dans la première moitié de la page, pas centrées sur toute la hauteur", () => {
    const layout = computeCardLayout(A4_WIDTH_PT, A4_HEIGHT_PT);
    expect(layout.y).toBeGreaterThanOrEqual(0);
    expect(layout.y + layout.cardHeightPt).toBeLessThanOrEqual(A4_HEIGHT_PT / 2);
  });
});
