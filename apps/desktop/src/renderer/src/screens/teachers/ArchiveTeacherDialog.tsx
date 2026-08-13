import { Button, Dialog, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/** MODULE-05 §3 règle 1 : suppression toujours logique, réversible. */
export function ArchiveTeacherDialog({ teacherId, onClose }: { teacherId: string; onClose: () => void }) {
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();
  const archive = trpc.teachers.archive.useMutation({
    onSuccess: () => {
      void utils.teachers.getById.invalidate({ id: teacherId });
      onClose();
    },
  });

  return (
    <Dialog
      open
      onClose={onClose}
      title="Archiver cet enseignant"
      description="L'enseignant n'apparaîtra plus dans la liste par défaut. Cette action est réversible."
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Motif</Label>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        {archive.error && <p className="text-sm text-destructive">{archive.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            variant="destructive"
            disabled={!reason.trim() || archive.isPending}
            onClick={() => archive.mutate({ id: teacherId, reason })}
          >
            {archive.isPending ? "Archivage…" : "Archiver"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
