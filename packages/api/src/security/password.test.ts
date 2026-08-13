import { passwordSchema } from "@isac-erp/shared";
import { describe, expect, it } from "vitest";
import { generateTemporaryPassword, hashPassword, validatePasswordAgainstPolicy, verifyPassword, type PasswordPolicy } from "./password";

const DEFAULT_POLICY: PasswordPolicy = {
  passwordMinLength: 8,
  passwordRequireUppercase: true,
  passwordRequireNumber: true,
  passwordRequireSymbol: false,
};

describe("hashPassword / verifyPassword", () => {
  it("vérifie correctement un mot de passe haché", async () => {
    const hash = await hashPassword("Motdepasse1");
    expect(await verifyPassword("Motdepasse1", hash)).toBe(true);
  });

  it("rejette un mot de passe incorrect", async () => {
    const hash = await hashPassword("Motdepasse1");
    expect(await verifyPassword("AutreMotdepasse2", hash)).toBe(false);
  });

  it("ne lève pas d'exception sur un hash invalide", async () => {
    await expect(verifyPassword("x", "hash-invalide")).resolves.toBe(false);
  });
});

describe("generateTemporaryPassword", () => {
  it("génère un mot de passe conforme à la politique par défaut", () => {
    for (let i = 0; i < 20; i += 1) {
      expect(passwordSchema.safeParse(generateTemporaryPassword(DEFAULT_POLICY)).success).toBe(true);
    }
  });

  it("génère un mot de passe conforme à une politique renforcée (symbole exigé, longueur 12)", () => {
    const policy: PasswordPolicy = { passwordMinLength: 12, passwordRequireUppercase: true, passwordRequireNumber: true, passwordRequireSymbol: true };
    for (let i = 0; i < 20; i += 1) {
      expect(validatePasswordAgainstPolicy(generateTemporaryPassword(policy), policy)).toEqual([]);
    }
  });
});

describe("validatePasswordAgainstPolicy", () => {
  it("accepte un mot de passe conforme", () => {
    expect(validatePasswordAgainstPolicy("Motdepasse1", DEFAULT_POLICY)).toEqual([]);
  });

  it("signale la longueur insuffisante", () => {
    expect(validatePasswordAgainstPolicy("Ab1", DEFAULT_POLICY).length).toBeGreaterThan(0);
  });

  it("signale l'absence de majuscule", () => {
    expect(validatePasswordAgainstPolicy("motdepasse1", DEFAULT_POLICY).length).toBeGreaterThan(0);
  });

  it("signale l'absence de chiffre", () => {
    expect(validatePasswordAgainstPolicy("Motdepasse", DEFAULT_POLICY).length).toBeGreaterThan(0);
  });

  it("exige un symbole seulement si la politique le demande", () => {
    const withSymbol: PasswordPolicy = { ...DEFAULT_POLICY, passwordRequireSymbol: true };
    expect(validatePasswordAgainstPolicy("Motdepasse1", withSymbol).length).toBeGreaterThan(0);
    expect(validatePasswordAgainstPolicy("Motdepasse1!", withSymbol)).toEqual([]);
  });
});
