import type { StudentDto } from "@isac-erp/shared";
import { Badge } from "@isac-erp/ui";
import type { LucideIcon } from "lucide-react";
import { User } from "lucide-react";
import { resolveUploadUrl } from "../../lib/upload";

export interface ProfileNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

export interface EnrollmentMeta {
  filiereName: string;
  levelLabel: string;
  className: string;
  academicYearLabel: string;
}

/**
 * Rail de profil de la fiche élève (refonte "Contraste marine", 2026-08-02, retour du porteur du
 * projet sur maquette) : remplace la barre d'onglets horizontale par une navigation verticale avec
 * photo/identité en tête — inspiré de l'exemple fourni (SchoolApp). `bg-primary`/`hsl(var(--secondary))`
 * plutôt que des teintes fixes : suit la personnalisation d'établissement (Paramètres → Apparence).
 */
export function StudentProfileRail({
  student,
  enrollment,
  items,
  activeKey,
  onChange,
  comingSoonCount,
}: {
  student: StudentDto;
  enrollment: EnrollmentMeta | undefined;
  items: ProfileNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  comingSoonCount: number;
}) {
  const photoUrl = resolveUploadUrl(student.photoPath);

  return (
    <aside className="sticky top-4 flex w-64 shrink-0 flex-col gap-4 self-start rounded-lg bg-primary p-4 text-primary-foreground shadow-md">
      <div className="flex flex-col items-center gap-1 border-b border-primary-foreground/15 pb-4 text-center">
        <div className="animate-avatar-glow flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-secondary bg-primary-foreground/10">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <User className="h-9 w-9 text-primary-foreground/70" />
          )}
        </div>
        <p className="mt-2 text-sm font-semibold">
          {student.lastName} {student.firstName}
        </p>
        <Badge variant="default" className="bg-secondary/25 text-primary-foreground">
          {student.matricule}
        </Badge>
        {enrollment && (
          <p className="mt-1 text-xs leading-relaxed text-primary-foreground/70">
            {enrollment.filiereName} · {enrollment.levelLabel}
            <br />
            Classe {enrollment.className} · {enrollment.academicYearLabel}
          </p>
        )}
        {student.archivedAt && (
          <Badge variant="muted" className="mt-1">
            Archivé
          </Badge>
        )}
      </div>

      <nav className="flex flex-col gap-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          const active = item.key === activeKey;
          return (
            <button
              key={item.key}
              type="button"
              disabled={item.disabled}
              onClick={() => onChange(item.key)}
              className={
                "relative flex items-center gap-2.5 rounded-md py-2 text-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40 " +
                (active
                  ? "bg-primary-foreground/12 pl-4 font-semibold text-primary-foreground"
                  : "pl-2.5 text-primary-foreground/75 hover:bg-primary-foreground/8 hover:pl-3.5")
              }
            >
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-secondary shadow-[0_0_8px_hsl(var(--secondary))]" />
              )}
              <Icon className={"h-4 w-4 shrink-0 " + (active ? "opacity-100" : "opacity-70")} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {comingSoonCount > 0 && (
        <p className="border-t border-primary-foreground/15 pt-2 text-center text-[11px] text-primary-foreground/50">
          + {comingSoonCount} autres modules à venir
        </p>
      )}
    </aside>
  );
}
