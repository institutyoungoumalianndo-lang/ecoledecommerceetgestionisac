import { type ReactNode, useMemo, useState } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { TableContextMenu, type TableContextMenuItem, useTableContextMenu } from "./TableContextMenu";
import { cn } from "../lib/cn";
import { copyRowsToClipboard, exportRowsToCsv, exportRowsToPdf, exportRowsToXlsx } from "../lib/tableExport";
import { useColumnWidths } from "../lib/useColumnWidths";
import { applySortRules, useMultiSort } from "../lib/useMultiSort";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  /** Valeur brute utilisée pour la recherche, le tri et l'export — jamais du JSX. */
  value: (row: T) => string | number;
  /** Affichage dans la cellule ; par défaut, la valeur brute telle quelle. */
  render?: (row: T) => ReactNode;
  sortable?: boolean;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  searchPlaceholder?: string;
  pageSize?: number;
  exportFilename?: string;
  /** Titre affiché en en-tête de l'export PDF. */
  exportTitle?: string;
  emptyMessage?: string;
  /** Colonne d'actions supplémentaire (boutons modifier/supprimer...), en fin de ligne. */
  rowActions?: (row: T) => ReactNode;
  /** Emplacement pour des filtres spécifiques à l'écran (ex. filtre par rôle). */
  filters?: ReactNode;
  /** Ouvre la fiche détaillée d'une ligne (double-clic — cahier des charges §6). */
  onRowDoubleClick?: (row: T) => void;
  /** Actions du menu contextuel (clic droit sur une ligne) ; absent = pas de menu. */
  rowContextActions?: (row: T) => TableContextMenuItem[];
}

function ExportMenu({ onCsv, onXlsx, onPdf, onCopy }: { onCsv: () => void; onXlsx: () => void; onPdf: () => void; onCopy: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen((v) => !v)}>
        Exporter ▾
      </Button>
      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-1 w-48 rounded-lg border border-border bg-background p-1 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {[
            { label: "Excel (.xlsx)", action: onXlsx },
            { label: "CSV", action: onCsv },
            { label: "PDF", action: onPdf },
            { label: "Copier", action: onCopy },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              className="block w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-muted"
              onClick={() => {
                item.action();
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Table générique conforme aux exigences du cahier des charges (Chapitre 2
 * §2.9, enrichie refonte UI/UX Phase 4 2026-07-30) : recherche instantanée,
 * tri multi-colonnes (Maj+clic), colonnes redimensionnables, pagination,
 * export Excel/CSV/PDF, copie, impression, menu contextuel, double-clic.
 * Les filtres spécifiques à un écran restent la responsabilité de l'appelant
 * (slot `filters`) — cette table ne connaît pas le domaine métier.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowId,
  searchPlaceholder = "Rechercher...",
  pageSize = 20,
  exportFilename = "export",
  exportTitle,
  emptyMessage = "Aucune donnée.",
  rowActions,
  filters,
  onRowDoubleClick,
  rowContextActions,
}: DataTableProps<T>) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const { rules: sortRules, toggleSort, ruleFor } = useMultiSort();
  const { widths, startResize } = useColumnWidths();
  const { menu, openMenu } = useTableContextMenu<T>();

  const filteredRows = useMemo(() => {
    if (!search.trim()) return rows;
    const term = search.trim().toLowerCase();
    return rows.filter((row) =>
      columns.some((column) => String(column.value(row)).toLowerCase().includes(term))
    );
  }, [rows, search, columns]);

  const sortedRows = useMemo(
    () => applySortRules(filteredRows, sortRules, (row, key) => columns.find((c) => c.key === key)?.value(row) ?? ""),
    [filteredRows, sortRules, columns]
  );

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sortedRows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const exportColumns = columns.map((c) => ({ header: c.header, value: c.value }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder={searchPlaceholder}
          className="max-w-xs border-2 border-button/30"
        />
        <div className="flex items-center gap-2">
          {filters}
          <ExportMenu
            onCsv={() => exportRowsToCsv(sortedRows, exportColumns, exportFilename)}
            onXlsx={() => exportRowsToXlsx(sortedRows, exportColumns, exportFilename)}
            onPdf={() => void exportRowsToPdf(sortedRows, exportColumns, exportFilename, exportTitle)}
            onCopy={() => void copyRowsToClipboard(sortedRows, exportColumns)}
          />
          <Button variant="outline" onClick={() => window.print()}>
            Imprimer
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-background text-foreground">
        <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: "0 10px" }}>
          <colgroup>
            {columns.map((column) => (
              <col key={column.key} style={widths[column.key] ? { width: widths[column.key] } : undefined} />
            ))}
            {rowActions && <col />}
          </colgroup>
          <thead>
            <tr className="table-head-card">
              {columns.map((column) => {
                const rule = ruleFor(column.key);
                const priority = sortRules.length > 1 ? sortRules.findIndex((r) => r.key === column.key) : -1;
                return (
                  <th
                    key={column.key}
                    className={cn(
                      "group relative select-none px-3 py-2 text-left font-medium text-secondary-foreground",
                      column.sortable !== false && "cursor-pointer"
                    )}
                    onClick={(e) => column.sortable !== false && toggleSort(column.key, e.shiftKey)}
                    title={column.sortable !== false ? "Clic : trier — Maj+clic : ajouter un critère de tri" : undefined}
                  >
                    {column.header}
                    {rule ? (rule.direction === "asc" ? " ▲" : " ▼") : ""}
                    {priority >= 0 && <sup className="ml-0.5">{priority + 1}</sup>}
                    <span
                      role="separator"
                      onMouseDown={startResize(column.key, widths[column.key] ?? 150)}
                      onClick={(e) => e.stopPropagation()}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize opacity-0 hover:bg-primary/40 group-hover:opacity-100"
                    />
                  </th>
                );
              })}
              {rowActions && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length + (rowActions ? 1 : 0)}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageRows.map((row) => (
                <tr
                  key={getRowId(row)}
                  className={cn("table-row-card", onRowDoubleClick && "cursor-pointer")}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                  onContextMenu={rowContextActions ? (e) => openMenu(e, row) : undefined}
                >
                  {columns.map((column) => (
                    <td key={column.key} className="truncate px-3 py-3">
                      {column.render ? column.render(row) : column.value(row)}
                    </td>
                  ))}
                  {rowActions && (
                    <td className="px-3 py-3 text-right">{rowActions(row)}</td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rowContextActions && <TableContextMenu menu={menu} items={rowContextActions} />}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {sortedRows.length === 0
            ? "0 résultat"
            : `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, sortedRows.length)} sur ${sortedRows.length}`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            disabled={currentPage <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </Button>
          <span>
            Page {currentPage} / {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={currentPage >= pageCount}
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
