import { Card, CardContent, CardHeader, CardTitle, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";
import { StudentCardTab } from "../students/StudentCardTab";

/** Génération individuelle de la carte d'étudiant (MODULE-09.1) — même parcours que sur la fiche étudiant, accessible directement depuis Documents. */
export function StudentCardIndividualScreen() {
  const [studentId, setStudentId] = useState("");
  const studentsQuery = trpc.students.list.useQuery({ pageSize: 200 });

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Carte d'étudiant — génération individuelle</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <Label>Étudiant</Label>
            <Select value={studentId} onChange={(e) => setStudentId(e.target.value)}>
              <option value="">— Sélectionner —</option>
              {(studentsQuery.data?.rows ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.lastName} {s.firstName} ({s.matricule})
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {studentId && <StudentCardTab studentId={studentId} />}
    </div>
  );
}
