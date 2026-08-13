import { describe, expect, it, vi } from "vitest";
import {
  consumePendingChallenge,
  createPendingChallenge,
  peekPendingChallenge,
  registerFailedTwoFactorAttempt,
} from "./twoFactorChallenge.js";

describe("twoFactorChallenge", () => {
  it("crée un défi consultable avec le bon userId", () => {
    const token = createPendingChallenge("user-1");
    expect(peekPendingChallenge(token)).toBe("user-1");
  });

  it("retourne null pour un token inconnu", () => {
    expect(peekPendingChallenge("token-inexistant")).toBeNull();
  });

  it("expire le défi après le TTL et le purge", () => {
    vi.useFakeTimers();
    try {
      const token = createPendingChallenge("user-2");
      vi.advanceTimersByTime(5 * 60_000 + 1);
      expect(peekPendingChallenge(token)).toBeNull();
      expect(peekPendingChallenge(token)).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("invalide le défi après 5 tentatives échouées", () => {
    const token = createPendingChallenge("user-3");
    expect(registerFailedTwoFactorAttempt(token)).toBe(false);
    expect(registerFailedTwoFactorAttempt(token)).toBe(false);
    expect(registerFailedTwoFactorAttempt(token)).toBe(false);
    expect(registerFailedTwoFactorAttempt(token)).toBe(false);
    expect(registerFailedTwoFactorAttempt(token)).toBe(true);
    expect(peekPendingChallenge(token)).toBeNull();
  });

  it("considère un token déjà consommé/inconnu comme invalidé", () => {
    expect(registerFailedTwoFactorAttempt("jamais-cree")).toBe(true);
  });

  it("consumePendingChallenge purge le défi", () => {
    const token = createPendingChallenge("user-4");
    consumePendingChallenge(token);
    expect(peekPendingChallenge(token)).toBeNull();
  });
});
