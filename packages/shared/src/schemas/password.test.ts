import { describe, expect, it } from "vitest";
import { passwordSchema } from "./password";

describe("passwordSchema", () => {
  it("accepte un mot de passe conforme", () => {
    expect(passwordSchema.safeParse("Motdepasse1").success).toBe(true);
  });

  it("rejette un mot de passe trop court", () => {
    expect(passwordSchema.safeParse("Ab1").success).toBe(false);
  });

  it("rejette un mot de passe sans majuscule", () => {
    expect(passwordSchema.safeParse("motdepasse1").success).toBe(false);
  });

  it("rejette un mot de passe sans chiffre", () => {
    expect(passwordSchema.safeParse("Motdepasse").success).toBe(false);
  });
});
