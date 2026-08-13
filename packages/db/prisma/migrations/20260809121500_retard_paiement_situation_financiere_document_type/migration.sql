-- Rapports financiers étudiants — retards de paiement et situation financière détaillée par
-- filière/niveau/année/tranche (2026-08-09, retour du porteur du projet). Complète la migration
-- 20260809120000 (qui n'avait ajouté ces deux valeurs qu'à NumberingPurpose, pas à DocumentType).
ALTER TYPE "DocumentType" ADD VALUE 'RETARD_PAIEMENT';
ALTER TYPE "DocumentType" ADD VALUE 'SITUATION_FINANCIERE';
