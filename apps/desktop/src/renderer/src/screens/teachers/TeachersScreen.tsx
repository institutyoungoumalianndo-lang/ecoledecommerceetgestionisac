import { useEffect, useState } from "react";
import { TeacherDetailScreen } from "./TeacherDetailScreen";
import { TeacherFormScreen } from "./TeacherFormScreen";
import { TeachersListScreen } from "./TeachersListScreen";

type View = { mode: "list" } | { mode: "create" } | { mode: "detail"; teacherId: string };

/**
 * Coquille du module Enseignants (MODULE-05) : liste, création, fiche complète. `openTeacherId`
 * permet une navigation depuis un autre écran (recherche globale) directement vers la fiche.
 */
export function TeachersScreen({
  openTeacherId,
  onOpenTeacherIdConsumed,
  onCreatePayrollProfile,
}: {
  openTeacherId?: string | null;
  onOpenTeacherIdConsumed?: () => void;
  onCreatePayrollProfile?: (teacherId: string) => void;
} = {}) {
  const [view, setView] = useState<View>({ mode: "list" });

  useEffect(() => {
    if (openTeacherId) {
      setView({ mode: "detail", teacherId: openTeacherId });
      onOpenTeacherIdConsumed?.();
    }
  }, [openTeacherId, onOpenTeacherIdConsumed]);

  if (view.mode === "create") {
    return (
      <TeacherFormScreen
        onCancel={() => setView({ mode: "list" })}
        onCreated={(teacherId) => setView({ mode: "detail", teacherId })}
      />
    );
  }

  if (view.mode === "detail") {
    return (
      <TeacherDetailScreen
        teacherId={view.teacherId}
        onBack={() => setView({ mode: "list" })}
        onCreatePayrollProfile={onCreatePayrollProfile}
      />
    );
  }

  return (
    <TeachersListScreen
      onCreate={() => setView({ mode: "create" })}
      onOpenTeacher={(teacherId) => setView({ mode: "detail", teacherId })}
    />
  );
}
