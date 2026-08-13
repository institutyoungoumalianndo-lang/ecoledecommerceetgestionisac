import { describe, expect, it } from "vitest";
import { hasPermission } from "./authorization";

describe("hasPermission", () => {
  it("accorde tout au Super Administrateur sans permission explicite", () => {
    expect(hasPermission("SUPER_ADMIN", new Set(), "UTILISATEURS:SUPPRESSION")).toBe(true);
  });

  it("accorde l'accès si la permission est dans l'ensemble accordé", () => {
    const granted = new Set(["UTILISATEURS:LECTURE"]);
    expect(hasPermission("COMPTABLE", granted, "UTILISATEURS:LECTURE")).toBe(true);
  });

  it("refuse l'accès si la permission n'est pas accordée", () => {
    const granted = new Set(["UTILISATEURS:LECTURE"]);
    expect(hasPermission("COMPTABLE", granted, "UTILISATEURS:SUPPRESSION")).toBe(false);
  });
});
