/**
 * WhatsApp — jamais un envoi programmatique (voir MODULE-12 §3 règle 7, §6.1) : l'application
 * classique du porteur du projet n'a pas d'API, et une automatisation non officielle violerait les
 * CGU WhatsApp. Seul un lien "cliquer pour envoyer" officiel (wa.me) est généré ; un membre du
 * personnel doit cliquer "Envoyer" lui-même.
 */
export function buildWhatsAppLink(phone: string, content: string): string {
  const digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(content)}`;
}
