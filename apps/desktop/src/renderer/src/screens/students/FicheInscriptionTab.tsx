import { Button } from "@isac-erp/ui";
import { resolveUploadUrl } from "../../lib/upload";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR");
}

/**
 * Fiche d'inscription complétée (MODULE-09 §1) — version remplie de la fiche vierge, générée depuis le
 * dossier réel de l'étudiant (photo, scolarité, parent/tuteur, pièces fournies, montant payé). Bouton
 * dédié dans l'espace de l'étudiant, à côté de la carte d'étudiant et de la carte de paiement
 * (2026-08-03, retour du porteur du projet). Chaque génération crée un nouveau document archivé (même
 * principe que le certificat de scolarité) — pas de régénération à l'identique.
 */
export function FicheInscriptionTab({ studentId }: { studentId: string }) {
  const canView = useHasPermission("DOCUMENTS:LECTURE");
  const canGenerate = useHasPermission("DOCUMENTS:CREATION");

  const utils = trpc.useUtils();
  const query = trpc.documents.list.useQuery({ documentType: "FICHE_INSCRIPTION_COMPLETEE", relatedEntityId: studentId });
  const generate = trpc.documents.generate.useMutation({
    onSuccess: () => void utils.documents.list.invalidate({ documentType: "FICHE_INSCRIPTION_COMPLETEE", relatedEntityId: studentId }),
  });

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  const documents = [...(query.data ?? [])].sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime());
  const latest = documents[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border p-4">
        <p className="text-sm text-muted-foreground">
          Génère la fiche d'inscription complétée avec les informations réelles de l'étudiant (identité, photo, scolarité,
          parent/tuteur, pièces fournies, montant payé) et les zones de signature étudiant / Directeur des Études / Directeur.
        </p>
        {generate.error && <p className="text-sm text-destructive">{generate.error.message}</p>}
        {canGenerate && (
          <Button disabled={generate.isPending} onClick={() => generate.mutate({ documentType: "FICHE_INSCRIPTION_COMPLETEE", studentId })}>
            {generate.isPending ? "Génération…" : "Générer la fiche"}
          </Button>
        )}
      </div>

      {latest && (
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div>
            <p className="text-sm font-medium">Dernière fiche générée — n° {latest.documentNumber}</p>
            <p className="text-xs text-muted-foreground">Générée le {formatDate(latest.generatedAt)}</p>
          </div>
          <a href={resolveUploadUrl(latest.filePath) ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
            Voir le PDF
          </a>
        </div>
      )}

      {documents.length > 1 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Historique</p>
          <div className="flex flex-col gap-2">
            {documents.slice(1).map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <p className="text-sm">
                  N° {d.documentNumber} — {formatDate(d.generatedAt)}
                </p>
                <a href={resolveUploadUrl(d.filePath) ?? "#"} target="_blank" rel="noreferrer" className="text-sm text-primary underline">
                  Voir
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
