import { cn } from "../lib/cn";

export interface TabItem {
  key: string;
  label: string;
  /** Onglet visible mais inactif (ex. "Disponible à partir du Module X" — MODULE-04 §1.3). */
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

export function Tabs({ items, activeKey, onChange }: TabsProps) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border" role="tablist">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          role="tab"
          aria-selected={activeKey === item.key}
          disabled={item.disabled}
          onClick={() => !item.disabled && onChange(item.key)}
          className={cn(
            // Texte toujours sombre (`text-foreground`/`text-muted-foreground`, jamais liés à
            // --primary ni --window) — retour du porteur du projet le 2026-08-02 : les onglets
            // devenaient blancs/peu lisibles selon la couleur de fenêtre ou la couleur principale
            // retenue par l'établissement. Seul le soulignement de l'onglet actif reste personnalisé
            // (`border-primary`), le texte non.
            "-mb-px border-b-2 px-3 py-2 text-sm font-medium",
            activeKey === item.key
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground",
            item.disabled && "cursor-not-allowed opacity-50"
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
