import type { GlobalSearchResultItem } from "@isac-erp/shared";
import {
  BookOpen,
  CreditCard,
  FileText,
  GraduationCap,
  type LucideIcon,
  Presentation,
  School,
  Search,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { trpc } from "../../lib/trpc";

export interface GlobalSearchHandlers {
  onOpenStudent: (id: string) => void;
  onOpenTeacher: (id: string) => void;
  onOpenClass: (id: string) => void;
  onOpenFiliere: (id: string) => void;
  onOpenDocuments: () => void;
  onOpenPayments: () => void;
}

const CATEGORIES: {
  key: "students" | "teachers" | "classes" | "filieres" | "documents" | "payments";
  label: string;
  icon: LucideIcon;
}[] = [
  { key: "students", label: "Étudiants", icon: GraduationCap },
  { key: "teachers", label: "Enseignants", icon: Presentation },
  { key: "classes", label: "Classes", icon: School },
  { key: "filieres", label: "Filières", icon: BookOpen },
  { key: "documents", label: "Documents officiels", icon: FileText },
  { key: "payments", label: "Paiements", icon: CreditCard },
];

/**
 * Recherche globale (refonte UI/UX, phase finale, 2026-07-30) — une seule zone de recherche pour
 * plusieurs modules à la fois (cahier des charges §10). Les catégories sans fiche détaillée dédiée
 * (Classes, Filières, Documents, Paiements) naviguent vers le bon écran plutôt que vers la ligne
 * exacte — voir `AppShell.tsx` pour le détail de ce que chaque catégorie sait ouvrir aujourd'hui.
 */
export function GlobalSearchBox({ handlers }: { handlers: GlobalSearchHandlers }) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(timer);
  }, [query]);

  const results = trpc.globalSearch.search.useQuery(
    { query: debounced },
    { enabled: debounced.length > 0 }
  );

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("click", onClickOutside);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("click", onClickOutside);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function select(categoryKey: (typeof CATEGORIES)[number]["key"], item: GlobalSearchResultItem) {
    setOpen(false);
    setQuery("");
    switch (categoryKey) {
      case "students":
        handlers.onOpenStudent(item.id);
        break;
      case "teachers":
        handlers.onOpenTeacher(item.id);
        break;
      case "classes":
        handlers.onOpenClass(item.id);
        break;
      case "filieres":
        handlers.onOpenFiliere(item.id);
        break;
      case "documents":
        handlers.onOpenDocuments();
        break;
      case "payments":
        handlers.onOpenPayments();
        break;
    }
  }

  const data = results.data;
  const totalCount = data
    ? CATEGORIES.reduce((sum, c) => sum + (data[c.key]?.length ?? 0), 0)
    : 0;

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
      <input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Rechercher un étudiant, un enseignant, un document…"
        className="h-9 w-full rounded-md border border-white bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-primary"
      />

      {open && debounced.length > 0 && (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-96 w-full min-w-[22rem] overflow-y-auto rounded-lg border border-border bg-background p-1 shadow-lg">
          {results.isLoading && <p className="px-3 py-4 text-center text-sm text-muted-foreground">Recherche…</p>}
          {!results.isLoading && totalCount === 0 && (
            <p className="px-3 py-4 text-center text-sm text-muted-foreground">Aucun résultat pour « {debounced} ».</p>
          )}
          {data &&
            CATEGORIES.map((category) => {
              const items = data[category.key];
              if (!items || items.length === 0) return null;
              return (
                <div key={category.key} className="py-1">
                  <p className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    <category.icon size={12} />
                    {category.label}
                  </p>
                  {items.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => select(category.key, item)}
                      className="flex w-full flex-col items-start rounded-md px-3 py-1.5 text-left hover:bg-muted"
                    >
                      <span className="text-sm text-foreground">{item.label}</span>
                      {item.sublabel && <span className="text-xs text-muted-foreground">{item.sublabel}</span>}
                    </button>
                  ))}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
