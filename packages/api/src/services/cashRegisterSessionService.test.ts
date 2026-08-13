import { describe, expect, it } from "vitest";
import { computeClosingBalance, computeVariance } from "./cashRegisterSessionService.js";

describe("computeClosingBalance", () => {
  it("solde d'ouverture + espèces validées de la session", () => {
    expect(computeClosingBalance(50000, 120000)).toBe(170000);
  });

  it("ignore le fait qu'il n'y ait eu aucun encaissement en espèces", () => {
    expect(computeClosingBalance(50000, 0)).toBe(50000);
  });
});

describe("computeVariance", () => {
  it("aucun écart si le solde compté correspond exactement au solde calculé", () => {
    expect(computeVariance(170000, 170000)).toBe(0);
  });

  it("écart positif si le caissier compte plus que le solde calculé", () => {
    expect(computeVariance(175000, 170000)).toBe(5000);
  });

  it("écart négatif (manquant) si le caissier compte moins que le solde calculé", () => {
    expect(computeVariance(165000, 170000)).toBe(-5000);
  });
});
