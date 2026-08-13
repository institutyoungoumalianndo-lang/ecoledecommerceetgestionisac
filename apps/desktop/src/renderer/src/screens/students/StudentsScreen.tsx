import { useEffect, useState } from "react";
import { StudentDetailScreen } from "./StudentDetailScreen";
import { StudentFormScreen } from "./StudentFormScreen";
import { StudentImportWizard } from "./StudentImportWizard";
import { StudentsListScreen } from "./StudentsListScreen";

type View =
  | { mode: "list" }
  | { mode: "create" }
  | { mode: "detail"; studentId: string }
  | { mode: "import" };

/**
 * Coquille du module Étudiants (MODULE-04) : liste, création, fiche
 * complète, import. `openStudentId` permet une navigation depuis un autre
 * module (ex. Inscriptions, MODULE-04.1) directement vers une fiche.
 */
export function StudentsScreen({
  openStudentId,
  onOpenStudentIdConsumed,
}: {
  openStudentId?: string | null;
  onOpenStudentIdConsumed?: () => void;
}) {
  const [view, setView] = useState<View>({ mode: "list" });

  useEffect(() => {
    if (openStudentId) {
      setView({ mode: "detail", studentId: openStudentId });
      onOpenStudentIdConsumed?.();
    }
  }, [openStudentId, onOpenStudentIdConsumed]);

  if (view.mode === "create") {
    return (
      <StudentFormScreen
        onCancel={() => setView({ mode: "list" })}
        onCreated={(studentId) => setView({ mode: "detail", studentId })}
      />
    );
  }

  if (view.mode === "detail") {
    return (
      <StudentDetailScreen studentId={view.studentId} onBack={() => setView({ mode: "list" })} />
    );
  }

  if (view.mode === "import") {
    return <StudentImportWizard onClose={() => setView({ mode: "list" })} />;
  }

  return (
    <StudentsListScreen
      onCreate={() => setView({ mode: "create" })}
      onOpenStudent={(studentId) => setView({ mode: "detail", studentId })}
      onImport={() => setView({ mode: "import" })}
    />
  );
}
