import { executeDueCampaigns } from "./campaignService.js";

const CHECK_INTERVAL_MS = 60_000;

/**
 * Boucle de vérification périodique (voir MODULE-12 §1.6/§1.7/§6.1) — traite les campagnes
 * planifiées/récurrentes et les envois individuels différés arrivés à échéance. Aucune dépendance
 * externe (juste `setInterval`), cohérente avec l'architecture serveur persistant déjà actée
 * (ADR-007) : si le serveur est éteint au moment prévu, l'envoi part dès son prochain démarrage
 * ("dégradation propre si hors-ligne", déjà annoncée dans ROADMAP.md pour ce module).
 */
async function tick(): Promise<void> {
  try {
    await executeDueCampaigns();
  } catch (err) {
    console.error("Boucle de vérification des campagnes planifiées en échec :", err);
  }
}

export function startCommunicationScheduler(): void {
  setInterval(() => void tick(), CHECK_INTERVAL_MS);
}
