import { describe, expect, it } from "vitest";
import { compare } from "./alertEngineService.js";

describe("compare", () => {
  it("LT — vrai seulement quand la valeur est strictement sous le seuil", () => {
    expect(compare(4, "LT", 5)).toBe(true);
    expect(compare(5, "LT", 5)).toBe(false);
    expect(compare(6, "LT", 5)).toBe(false);
  });

  it("LTE — vrai à l'égalité aussi", () => {
    expect(compare(4, "LTE", 5)).toBe(true);
    expect(compare(5, "LTE", 5)).toBe(true);
    expect(compare(6, "LTE", 5)).toBe(false);
  });

  it("GT — vrai seulement quand la valeur est strictement au-dessus du seuil", () => {
    expect(compare(6, "GT", 5)).toBe(true);
    expect(compare(5, "GT", 5)).toBe(false);
    expect(compare(4, "GT", 5)).toBe(false);
  });

  it("GTE — vrai à l'égalité aussi", () => {
    expect(compare(6, "GTE", 5)).toBe(true);
    expect(compare(5, "GTE", 5)).toBe(true);
    expect(compare(4, "GTE", 5)).toBe(false);
  });
});
