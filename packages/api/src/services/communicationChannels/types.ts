/**
 * Interface d'adaptateur de canal — indépendante du fournisseur concret (voir MODULE-12 §1.1/§1.14).
 * Un changement de fournisseur SMS/e-mail se traduit par un nouvel adaptateur implémentant cette
 * même interface, jamais par une modification du reste du module.
 */
export interface ChannelSendInput {
  to: string;
  content: string;
  /** Pièce jointe réelle (chemin absolu sur disque) — voir MODULE-13 §5.2 (partage de la bibliothèque
   * numérique). Ignorée par les canaux qui ne la supportent pas (WhatsApp, voir `whatsAppLink.ts`). */
  attachments?: { filename: string; path: string }[];
  /** Objet du message — optionnel, l'adaptateur e-mail retombe sur un objet par défaut sinon. */
  subject?: string;
}

export interface ChannelSendResult {
  success: boolean;
  providerMessageId?: string;
  error?: string;
}

export interface ChannelTestResult {
  success: boolean;
  message: string;
}

export interface ChannelAdapter {
  send(input: ChannelSendInput): Promise<ChannelSendResult>;
  testConnection(): Promise<ChannelTestResult>;
}
