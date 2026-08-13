-- Rapports financiers étudiants — retards de paiement et situation financière détaillée par
-- filière/niveau/année/tranche (2026-08-09, retour du porteur du projet). Numérotation Tier 1,
-- même principe que les autres types du moteur de documents centralisé (voir NumberingPurpose).
ALTER TYPE "NumberingPurpose" ADD VALUE 'RETARD_PAIEMENT';
ALTER TYPE "NumberingPurpose" ADD VALUE 'SITUATION_FINANCIERE';
