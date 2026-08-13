import type { EchecMatiereDto, RoomDto } from "@isac-erp/shared";
import { Button, Card, Input, Label, Select } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { InstitutionalHeaderPrint } from "../../components/print/InstitutionalHeaderPrint";
import { resolveUploadUrl } from "../../lib/upload";
import { usePrintThemeStyle } from "../../lib/printTheme";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR");
}

/**
 * Sessionnaires (MODULE-06, 2026-08-03, retour du porteur du projet) — étudiants n'ayant pas
 * obtenu la moyenne (10/20 fixe) dans une ou plusieurs matières, classés par niveau/filière/année
 * universitaire. La liste des étudiants en échec est recalculée à la demande (jamais stockée,
 * comme le classement) ; seule la date/heure/salle de chaque session de rattrapage par matière est
 * programmée ici et persistée.
 */
export function SessionnairesScreen() {
  const [academicYearId, setAcademicYearId] = useState("");
  const [filiereId, setFiliereId] = useState("");
  const [levelId, setLevelId] = useState("");

  const printThemeStyle = usePrintThemeStyle();
  const canView = useHasPermission("SESSIONNAIRES:LECTURE");
  const canSchedule = useHasPermission("SESSIONNAIRES:CREATION");

  const yearsQuery = trpc.academicYears.list.useQuery();
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const roomsQuery = trpc.rooms.list.useQuery({ activeOnly: true });
  const stampQuery = trpc.branding.stamp.get.useQuery();
  const templatesQuery = trpc.branding.documentTemplates.list.useQuery();
  const signatoriesQuery = trpc.branding.signatories.list.useQuery();

  const echecsQuery = trpc.rattrapageSessions.getEchecs.useQuery(
    { filiereId, levelId, academicYearId },
    { enabled: Boolean(filiereId && levelId && academicYearId) }
  );

  const filiere = (filieresQuery.data ?? []).find((f) => f.id === filiereId);
  const level = (levelsQuery.data ?? []).find((l) => l.id === levelId);
  const year = (yearsQuery.data ?? []).find((y) => y.id === academicYearId);
  const rooms = roomsQuery.data ?? [];
  const echecs = echecsQuery.data ?? [];

  const stamp = stampQuery.data;
  const template = templatesQuery.data?.find((t) => t.documentType === "BULLETIN");
  const showStamp = template?.showStamp && stamp?.imagePath && stamp.applicableDocumentTypes.includes("BULLETIN");
  const etudesDirector = signatoriesQuery.data?.find((s) => s.roleCode === "DIRECTEUR_ETUDES");
  const campusDirector = signatoriesQuery.data?.find((s) => s.roleCode === "DIRECTEUR_CAMPUS");

  if (!canView) return <p className="text-sm text-muted-foreground">Accès non autorisé.</p>;

  return (
    <div className="flex flex-col gap-4">
      <Card variant="static" className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>Année universitaire</Label>
          <Select value={academicYearId} onChange={(e) => setAcademicYearId(e.target.value)}>
            <option value="">—</option>
            {(yearsQuery.data ?? []).map((y) => (
              <option key={y.id} value={y.id}>{y.label}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Filière</Label>
          <Select value={filiereId} onChange={(e) => setFiliereId(e.target.value)}>
            <option value="">—</option>
            {(filieresQuery.data ?? []).map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Niveau</Label>
          <Select value={levelId} onChange={(e) => setLevelId(e.target.value)}>
            <option value="">—</option>
            {(levelsQuery.data ?? []).map((l) => (
              <option key={l.id} value={l.id}>{l.label}</option>
            ))}
          </Select>
        </div>
      </Card>

      {!filiereId || !levelId || !academicYearId ? (
        <p className="text-sm text-muted-foreground">Sélectionnez une filière, un niveau et une année.</p>
      ) : echecsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : echecs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Aucun sessionnaire — tous les étudiants de cette filière/niveau/année ont la moyenne dans toutes les matières.
        </p>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Programmation des sessions de rattrapage</p>
            {echecs.map((echec) => (
              <MatiereEchecCard
                key={echec.subjectId}
                filiereId={filiereId}
                levelId={levelId}
                academicYearId={academicYearId}
                echec={echec}
                canSchedule={canSchedule}
                rooms={rooms}
              />
            ))}
          </div>

          <div className="flex justify-end">
            <Button onClick={() => window.print()}>Imprimer la liste des sessionnaires</Button>
          </div>

          <div data-print-area style={printThemeStyle} className="rounded-lg border print-border bg-background p-8 text-sm print-text">
            <InstitutionalHeaderPrint documentType="BULLETIN" />

            <hr className="my-3 border-t-2 print-separator" />
            <p className="text-center text-base font-semibold uppercase tracking-[0.18em] print-title">
              Liste des sessionnaires
            </p>
            <p className="mt-1 text-center text-xs uppercase tracking-wide print-text-secondary">
              {filiere?.name} — {level?.label} — {year?.label}
            </p>
            <hr className="mb-6 mt-2 border-t print-separator" />

            <div className="flex flex-col gap-6">
              {echecs.map((echec) => (
                <div key={echec.subjectId}>
                  <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b-2 print-separator pb-1.5">
                    <p className="text-sm font-semibold uppercase tracking-wide print-header">{echec.subjectName}</p>
                    <p className="text-xs print-text-secondary">
                      {echec.session
                        ? `${formatDate(echec.session.date)} — ${echec.session.startTime}${
                            echec.session.endTime ? ` à ${echec.session.endTime}` : ""
                          } — Salle ${echec.session.roomLabel ?? "à préciser"}`
                        : "Session à programmer"}
                    </p>
                  </div>
                  <table className="mt-1.5 w-full table-fixed border print-table-border text-sm">
                    <colgroup>
                      <col className="w-[20%]" />
                      <col className="w-[55%]" />
                      <col className="w-[25%]" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th className="border print-table-border px-2 py-1 text-left text-xs uppercase print-header">Matricule</th>
                        <th className="border print-table-border px-2 py-1 text-left text-xs uppercase print-header">Étudiant</th>
                        <th className="border print-table-border px-2 py-1 text-right text-xs uppercase print-header">Moyenne</th>
                      </tr>
                    </thead>
                    <tbody>
                      {echec.etudiants.map((e) => (
                        <tr key={e.studentId}>
                          <td className="border print-table-border px-2 py-1 tabular-nums">{e.matricule}</td>
                          <td className="border print-table-border px-2 py-1">{e.studentName}</td>
                          <td className="border print-table-border px-2 py-1 text-right font-medium tabular-nums">{e.moyenne} / 20</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            <div className="mt-12 flex items-end justify-center gap-14">
              <div className="text-center text-xs">
                {etudesDirector?.signatureImagePath && (
                  <img src={resolveUploadUrl(etudesDirector.signatureImagePath)!} alt="" className="mx-auto h-10 object-contain" />
                )}
                <div className="mt-1 w-36 border-t print-separator pt-1 font-medium">Le Directeur des Études</div>
              </div>
              {showStamp && (
                <img src={resolveUploadUrl(stamp!.imagePath)!} alt="" className="h-16 w-16 object-contain opacity-80" />
              )}
              <div className="text-center text-xs">
                {campusDirector?.signatureImagePath && (
                  <img src={resolveUploadUrl(campusDirector.signatureImagePath)!} alt="" className="mx-auto h-10 object-contain" />
                )}
                <div className="mt-1 w-36 border-t print-separator pt-1">
                  <p className="font-medium">Le Directeur</p>
                  {campusDirector?.displayName && <p className="print-text-secondary">{campusDirector.displayName}</p>}
                </div>
              </div>
            </div>
            <p className="mt-6 text-center text-[10px] print-text-secondary">
              Document généré le {new Date().toLocaleDateString("fr-FR")}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

function MatiereEchecCard({
  filiereId,
  levelId,
  academicYearId,
  echec,
  canSchedule,
  rooms,
}: {
  filiereId: string;
  levelId: string;
  academicYearId: string;
  echec: EchecMatiereDto;
  canSchedule: boolean;
  rooms: RoomDto[];
}) {
  const utils = trpc.useUtils();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [roomId, setRoomId] = useState("");

  useEffect(() => {
    setDate(echec.session ? new Date(echec.session.date).toISOString().slice(0, 10) : "");
    setStartTime(echec.session?.startTime ?? "");
    setEndTime(echec.session?.endTime ?? "");
    setRoomId(echec.session?.roomId ?? "");
  }, [echec.session, echec.subjectId]);

  const upsert = trpc.rattrapageSessions.upsertSession.useMutation({
    onSuccess: () => void utils.rattrapageSessions.getEchecs.invalidate({ filiereId, levelId, academicYearId }),
  });

  return (
    <div className="rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">{echec.subjectName}</p>
        <p className="text-xs text-muted-foreground">{echec.etudiants.length} étudiant(s) en échec</p>
      </div>

      <div className="mt-2 flex flex-col gap-1">
        {echec.etudiants.map((e) => (
          <div key={e.studentId} className="flex items-center justify-between text-sm">
            <span>{e.studentName} — {e.matricule}</span>
            <span className="tabular-nums text-muted-foreground">{e.moyenne} / 20</span>
          </div>
        ))}
      </div>

      {canSchedule && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Heure début</Label>
              <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Heure fin</Label>
              <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <Label>Salle</Label>
              <Select value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                <option value="">—</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </Select>
            </div>
          </div>
          {upsert.error && <p className="mt-2 text-xs text-destructive">{upsert.error.message}</p>}
          <div className="mt-2 flex justify-end">
            <Button
              variant="outline"
              disabled={!date || !startTime || upsert.isPending}
              onClick={() =>
                upsert.mutate({
                  filiereId,
                  levelId,
                  academicYearId,
                  subjectId: echec.subjectId,
                  date: new Date(date),
                  startTime,
                  endTime: endTime || null,
                  roomId: roomId || null,
                })
              }
            >
              {upsert.isPending ? "Enregistrement…" : echec.session ? "Modifier la session" : "Programmer la session"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
