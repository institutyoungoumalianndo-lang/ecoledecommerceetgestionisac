import { describe, expect, it } from "vitest";
import { monthRange, sessionDurationHours, timesOverlap } from "./seanceService.js";

describe("sessionDurationHours", () => {
  it("calcule la durée en heures entre deux horaires HH:mm", () => {
    expect(sessionDurationHours("08:00", "11:00")).toBe(3);
    expect(sessionDurationHours("08:00", "09:30")).toBe(1.5);
  });

  it("ne descend jamais sous zéro (heure de fin avant l'heure de début)", () => {
    expect(sessionDurationHours("10:00", "08:00")).toBe(0);
  });

  it("règle non négociable (MODULE-05.2 §1.11) : la durée d'une séance ne dépend jamais du nombre de classes liées", () => {
    // Une séance mutualisée (N classes) est TOUJOURS représentée par une seule ligne avec un seul
    // couple (startTime, endTime) — sessionDurationHours n'a même pas de paramètre "nombre de
    // classes" : la multiplication par N classes est structurellement impossible à ce niveau.
    const duration = sessionDurationHours("08:00", "11:00");
    expect(duration).toBe(3);
    expect(duration).not.toBe(3 * 4); // l'exemple du cahier des charges (30000×3h×4 classes ≠ 12h payées)
  });
});

describe("timesOverlap", () => {
  it("détecte un chevauchement partiel", () => {
    expect(timesOverlap("08:00", "10:00", "09:00", "11:00")).toBe(true);
  });

  it("détecte un créneau totalement inclus dans l'autre", () => {
    expect(timesOverlap("08:00", "12:00", "09:00", "10:00")).toBe(true);
  });

  it("ne détecte aucun chevauchement pour des créneaux disjoints", () => {
    expect(timesOverlap("08:00", "10:00", "11:00", "12:00")).toBe(false);
  });

  it("ne considère pas deux créneaux dos-à-dos comme un conflit (bornes exclusives)", () => {
    expect(timesOverlap("08:00", "10:00", "10:00", "12:00")).toBe(false);
  });
});

describe("monthRange", () => {
  it("retourne le premier et le dernier jour du mois", () => {
    const { start, end } = monthRange(2026, 2);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(1); // février, 0-indexé
    expect(start.getDate()).toBe(1);
    expect(end.getMonth()).toBe(1);
    expect(end.getDate()).toBe(28); // 2026 n'est pas bissextile
  });

  it("gère correctement une année bissextile", () => {
    const { end } = monthRange(2028, 2);
    expect(end.getDate()).toBe(29);
  });
});
