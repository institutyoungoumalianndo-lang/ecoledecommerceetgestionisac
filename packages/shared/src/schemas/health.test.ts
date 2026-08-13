import { describe, expect, it } from "vitest";
import { healthCheckSchema } from "./health";

describe("healthCheckSchema", () => {
  it("accepte une réponse de santé valide", () => {
    const result = healthCheckSchema.safeParse({
      status: "ok",
      database: true,
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(true);
  });

  it("rejette un statut inconnu", () => {
    const result = healthCheckSchema.safeParse({
      status: "inconnu",
      database: true,
      timestamp: new Date().toISOString(),
    });
    expect(result.success).toBe(false);
  });
});
