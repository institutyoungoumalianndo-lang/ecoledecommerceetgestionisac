import { describe, expect, it } from "vitest";
import { automaticCommunicationChannelSchema } from "./notificationEventConfig.js";

describe("automaticCommunicationChannelSchema", () => {
  it("accepte SMS et EMAIL", () => {
    expect(automaticCommunicationChannelSchema.safeParse("SMS").success).toBe(true);
    expect(automaticCommunicationChannelSchema.safeParse("EMAIL").success).toBe(true);
  });

  it("rejette WHATSAPP — jamais un canal de notification automatique (MODULE-12 §3 règle 7)", () => {
    expect(automaticCommunicationChannelSchema.safeParse("WHATSAPP").success).toBe(false);
  });

  it("rejette INTERNE — cible des comptes User, pas le carnet d'adresses", () => {
    expect(automaticCommunicationChannelSchema.safeParse("INTERNE").success).toBe(false);
  });
});
