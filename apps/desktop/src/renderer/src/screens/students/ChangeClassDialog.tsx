import { Button, Dialog, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/** MODULE-04 §4.9 / §2.3 : modifie en place l'inscription de l'année active. */
export function ChangeClassDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [classId, setClassId] = useState("");
  const utils = trpc.useUtils();
  const classesQuery = trpc.schoolClasses.list.useQuery({});
  const filieresQuery = trpc.filieres.list.useQuery();
  const levelsQuery = trpc.levels.list.useQuery();
  const filiereById = new Map((filieresQuery.data ?? []).map((f) => [f.id, f]));
  const levelById = new Map((levelsQuery.data ?? []).map((l) => [l.id, l]));

  const changeClass = trpc.studentEnrollments.changeClass.useMutation({
    onSuccess: () => {
      void utils.studentEnrollments.listByStudent.invalidate({ studentId });
      void utils.students.list.invalidate();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Changer de classe">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Nouvelle classe</Label>
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">—</option>
            {(classesQuery.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {filiereById.get(c.filiereId)?.name ?? "?"} / {levelById.get(c.levelId)?.label ?? "?"}
              </option>
            ))}
          </Select>
        </div>
        {changeClass.error && <p className="text-sm text-destructive">{changeClass.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!classId || changeClass.isPending}
            onClick={() => changeClass.mutate({ studentId, newClassId: classId })}
          >
            {changeClass.isPending ? "Enregistrement…" : "Changer de classe"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
