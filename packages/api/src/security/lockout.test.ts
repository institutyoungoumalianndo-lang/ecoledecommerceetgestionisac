import { describe, expect, it } from "vitest";
import { computeFailedLoginUpdate, isAccountLocked } from "./lockout";

describe("computeFailedLoginUpdate", () => {
  it("incrémente le compteur sans verrouiller sous le seuil", () => {
    const result = computeFailedLoginUpdate(2, 5, 15);
    expect(result.failedLoginAttempts).toBe(3);
    expect(result.didLock).toBe(false);
    expect(result.lockedUntil).toBeNull();
  });

  it("verrouille le compte au seuil et remet le compteur à zéro", () => {
    const now = new Date("2026-01-01T00:00:00.000Z");
    const result = computeFailedLoginUpdate(4, 5, 15, now);
    expect(result.didLock).toBe(true);
    expect(result.failedLoginAttempts).toBe(0);
    expect(result.lockedUntil?.toISOString()).toBe("2026-01-01T00:15:00.000Z");
  });

  it("verrouille aussi au-delà du seuil (garde-fou)", () => {
    const result = computeFailedLoginUpdate(10, 5, 15);
    expect(result.didLock).toBe(true);
  });
});

describe("isAccountLocked", () => {
  const now = new Date("2026-01-01T00:00:00.000Z");

  it("retourne false si lockedUntil est nul", () => {
    expect(isAccountLocked(null, now)).toBe(false);
  });

  it("retourne true si lockedUntil est dans le futur", () => {
    expect(isAccountLocked(new Date("2026-01-01T00:05:00.000Z"), now)).toBe(true);
  });

  it("retourne false si lockedUntil est dans le passé", () => {
    expect(isAccountLocked(new Date("2025-12-31T23:00:00.000Z"), now)).toBe(false);
  });
});
