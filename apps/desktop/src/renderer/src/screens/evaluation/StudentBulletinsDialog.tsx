import type { BulletinAnnuelDto, BulletinPeriodeDto } from "@isac-erp/shared";
import { Badge, Button, Dialog } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { BulletinAnnuelView } from "./BulletinAnnuelView";
import { BulletinPeriodeView } from "./BulletinPeriodeView";

/**
 * Bulletins d'un étudiant (MODULE-06 §1.7/§1.8) — génération et consultation, aucun fichier PDF
 * stocké. Un bulletin déjà généré (non annulé) bloque toute nouvelle génération pour le même
 * contexte (§3 règle 7) — il faut l'annuler explicitement au préalable.
 */
export function StudentBulletinsDialog({
  studentId,
  studentName,
  academicPeriodId,
  academicYearId,
  onClose,
}: {
  studentId: string;
  studentName: string;
  academicPeriodId: string;
  academicYearId: string;
  onClose: () => void;
}) {
  const [viewingPeriode, setViewingPeriode] = useState<BulletinPeriodeDto | null>(null);
  const [viewingAnnuel, setViewingAnnuel] = useState<BulletinAnnuelDto | null>(null);

  const canGenerer = useHasPermission("BULLETINS:CREATION");
  const canAdministrer = useHasPermission("BULLETINS:ADMINISTRATION");
  const utils = trpc.useUtils();

  const periodeListQuery = trpc.bulletinsPeriode.listByStudent.useQuery({ studentId });
  const annuelListQuery = trpc.bulletinsAnnuels.listByStudent.useQuery({ studentId });

  const genererPeriode = trpc.bulletinsPeriode.generer.useMutation({
    onSuccess: () => void utils.bulletinsPeriode.listByStudent.invalidate({ studentId }),
  });
  const annulerPeriode = trpc.bulletinsPeriode.annuler.useMutation({
    onSuccess: () => void utils.bulletinsPeriode.listByStudent.invalidate({ studentId }),
  });
  const genererAnnuel = trpc.bulletinsAnnuels.generer.useMutation({
    onSuccess: () => void utils.bulletinsAnnuels.listByStudent.invalidate({ studentId }),
  });
  const annulerAnnuel = trpc.bulletinsAnnuels.annuler.useMutation({
    onSuccess: () => void utils.bulletinsAnnuels.listByStudent.invalidate({ studentId }),
  });

  const bulletinPeriodeActuel = (periodeListQuery.data ?? []).find(
    (b) => b.academicPeriodId === academicPeriodId && !b.annule
  );
  const bulletinAnnuelActuel = (annuelListQuery.data ?? []).find((b) => !b.annule);

  return (
    <>
      <Dialog open onClose={onClose} title={`Bulletins — ${studentName}`}>
        <div className="flex flex-col gap-4">
          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-semibold">Bulletin de la période sélectionnée</p>
            {bulletinPeriodeActuel ? (
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {bulletinPeriodeActuel.numeroDossier} — moyenne {bulletinPeriodeActuel.moyenne ?? "—"}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setViewingPeriode(bulletinPeriodeActuel)}>Voir</Button>
                  {canAdministrer && (
                    <Button
                      variant="destructive"
                      disabled={annulerPeriode.isPending}
                      onClick={() => annulerPeriode.mutate({ id: bulletinPeriodeActuel.id })}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              canGenerer && (
                <Button
                  disabled={genererPeriode.isPending}
                  onClick={() => genererPeriode.mutate({ studentId, academicPeriodId })}
                >
                  {genererPeriode.isPending ? "Génération…" : "Générer le bulletin de cette période"}
                </Button>
              )
            )}
            {genererPeriode.error && <p className="mt-2 text-sm text-destructive">{genererPeriode.error.message}</p>}
          </div>

          <div className="rounded-lg border border-border p-3">
            <p className="mb-2 text-sm font-semibold">Bulletin annuel</p>
            {bulletinAnnuelActuel ? (
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {bulletinAnnuelActuel.numeroDossier} — moyenne {bulletinAnnuelActuel.moyenneAnnuelle ?? "—"}
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setViewingAnnuel(bulletinAnnuelActuel)}>Voir</Button>
                  {canAdministrer && (
                    <Button
                      variant="destructive"
                      disabled={annulerAnnuel.isPending}
                      onClick={() => annulerAnnuel.mutate({ id: bulletinAnnuelActuel.id })}
                    >
                      Annuler
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              canGenerer && (
                <Button
                  disabled={genererAnnuel.isPending}
                  onClick={() => genererAnnuel.mutate({ studentId, academicYearId })}
                >
                  {genererAnnuel.isPending ? "Génération…" : "Générer le bulletin annuel"}
                </Button>
              )
            )}
            {genererAnnuel.error && <p className="mt-2 text-sm text-destructive">{genererAnnuel.error.message}</p>}
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold">Historique</p>
            <div className="flex flex-col gap-1">
              {(periodeListQuery.data ?? []).map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span>
                    {b.academicPeriodLabel} — {b.numeroDossier}
                    {b.annule && <Badge variant="destructive" className="ml-2">Annulé</Badge>}
                  </span>
                  <Button variant="outline" onClick={() => setViewingPeriode(b)}>Voir</Button>
                </div>
              ))}
              {(annuelListQuery.data ?? []).map((b) => (
                <div key={b.id} className="flex items-center justify-between text-sm">
                  <span>
                    Annuel {b.academicYearLabel} — {b.numeroDossier}
                    {b.annule && <Badge variant="destructive" className="ml-2">Annulé</Badge>}
                  </span>
                  <Button variant="outline" onClick={() => setViewingAnnuel(b)}>Voir</Button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>Fermer</Button>
          </div>
        </div>
      </Dialog>

      {viewingPeriode && <BulletinPeriodeView bulletin={viewingPeriode} onClose={() => setViewingPeriode(null)} />}
      {viewingAnnuel && <BulletinAnnuelView bulletin={viewingAnnuel} onClose={() => setViewingAnnuel(null)} />}
    </>
  );
}
