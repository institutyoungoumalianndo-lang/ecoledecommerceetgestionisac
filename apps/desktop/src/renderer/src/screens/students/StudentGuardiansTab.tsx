import { Badge, Button } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useHasPermission } from "../../store/authStore";
import { LinkGuardianDialog } from "./LinkGuardianDialog";

const RELATIONSHIP_LABELS: Record<string, string> = {
  PERE: "Père",
  MERE: "Mère",
  TUTEUR_LEGAL: "Tuteur légal",
  FRERE: "Frère",
  SOEUR: "Sœur",
  ONCLE: "Oncle",
  TANTE: "Tante",
  GRAND_PARENT: "Grand-parent",
  AUTRE: "Autre",
};

/** Parents/tuteurs de l'étudiant (MODULE-04 §4.3). */
export function StudentGuardiansTab({ studentId }: { studentId: string }) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const utils = trpc.useUtils();
  const query = trpc.guardians.listByStudent.useQuery({ studentId });
  const canEdit = useHasPermission("ETUDIANTS:MODIFICATION");

  const unlink = trpc.guardians.unlink.useMutation({
    onSuccess: () => void utils.guardians.listByStudent.invalidate({ studentId }),
  });
  const setPrimary = trpc.guardians.setPrimaryContact.useMutation({
    onSuccess: () => void utils.guardians.listByStudent.invalidate({ studentId }),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        {canEdit && <Button onClick={() => setLinkDialogOpen(true)}>Lier un responsable</Button>}
      </div>

      {(query.data ?? []).length === 0 && (
        <p className="text-sm text-muted-foreground">Aucun responsable lié.</p>
      )}

      <div className="flex flex-col gap-3">
        {(query.data ?? []).map((link) => (
          <div key={link.id} className="rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-medium">
                  {link.guardian.lastName} {link.guardian.firstName}
                </span>{" "}
                <Badge variant="muted">
                  {link.relationship === "AUTRE" ? link.relationshipOther ?? "Autre" : RELATIONSHIP_LABELS[link.relationship]}
                </Badge>
                {link.isPrimaryContact && <Badge variant="success" className="ml-1">Contact officiel</Badge>}
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  {!link.isPrimaryContact && (
                    <Button
                      variant="outline"
                      onClick={() => setPrimary.mutate({ studentId, studentGuardianId: link.id })}
                    >
                      Définir comme contact officiel
                    </Button>
                  )}
                  <Button variant="destructive" onClick={() => unlink.mutate({ id: link.id })}>
                    Délier
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-2 grid grid-cols-2 gap-1 text-sm text-muted-foreground">
              {link.guardian.profession && <span>Profession : {link.guardian.profession}</span>}
              {link.guardian.employer && <span>Employeur : {link.guardian.employer}</span>}
              {link.guardian.phonePrimary && <span>Téléphone : {link.guardian.phonePrimary}</span>}
              {link.guardian.whatsapp && <span>WhatsApp : {link.guardian.whatsapp}</span>}
              {link.guardian.email && <span>E-mail : {link.guardian.email}</span>}
              {link.guardian.address && <span>Adresse : {link.guardian.address}</span>}
            </div>
          </div>
        ))}
      </div>

      {linkDialogOpen && (
        <LinkGuardianDialog studentId={studentId} onClose={() => setLinkDialogOpen(false)} />
      )}
    </div>
  );
}
