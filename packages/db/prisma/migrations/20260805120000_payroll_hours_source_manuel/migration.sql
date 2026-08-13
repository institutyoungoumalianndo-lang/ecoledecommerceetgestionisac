-- Ajoute la source "MANUEL" pour PayrollLine.hours_source : heures saisies à la main depuis la
-- fiche d'émargement papier signée, seule source possible pour un enseignant payé à l'heure depuis
-- l'abandon du pointage numérique.
ALTER TYPE "HoursSource" ADD VALUE 'MANUEL';
