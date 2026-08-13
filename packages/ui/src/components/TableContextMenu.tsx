import { type ReactNode, useEffect, useState } from "react";
import { cn } from "../lib/cn";

export interface TableContextMenuItem {
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}

interface MenuState<T> {
  x: number;
  y: number;
  row: T;
}

/** Menu contextuel (clic droit sur une ligne) — refonte UI/UX Phase 4, 2026-07-30. */
export function useTableContextMenu<T>() {
  const [menu, setMenu] = useState<MenuState<T> | null>(null);

  useEffect(() => {
    if (!menu) return;
    function close() {
      setMenu(null);
    }
    window.addEventListener("click", close);
    window.addEventListener("resize", close);
    window.addEventListener("contextmenu", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("resize", close);
      window.removeEventListener("contextmenu", close);
    };
  }, [menu]);

  function openMenu(e: React.MouseEvent, row: T) {
    e.preventDefault();
    setMenu({ x: e.clientX, y: e.clientY, row });
  }

  return { menu, openMenu, closeMenu: () => setMenu(null) };
}

export function TableContextMenu<T>({
  menu,
  items,
}: {
  menu: MenuState<T> | null;
  items: (row: T) => TableContextMenuItem[];
}) {
  if (!menu) return null;
  const resolved = items(menu.row);
  if (resolved.length === 0) return null;

  return (
    <div
      className="fixed z-50 min-w-[180px] rounded-lg border border-border bg-background py-1 shadow-lg"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
    >
      {resolved.map((item) => (
        <button
          key={item.label}
          type="button"
          onClick={item.onClick}
          className={cn(
            "flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted",
            item.destructive ? "text-destructive" : "text-foreground"
          )}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  );
}
