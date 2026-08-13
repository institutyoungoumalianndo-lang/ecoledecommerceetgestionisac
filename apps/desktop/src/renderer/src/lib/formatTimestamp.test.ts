import { describe, expect, it } from "vitest";
import { formatTimestamp } from "./formatTimestamp";

describe("formatTimestamp", () => {
  it("formate un ISO string en date lisible sans lever d'erreur", () => {
    const result = formatTimestamp("2026-07-26T10:00:00.000Z");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
