import { type ReactNode, useEffect, useState } from "react";
import { Button } from "./Button";
import { Input } from "./Input";
import { TableContextMenu, type TableContextMenuItem, useTableContextMenu } from "./TableContextMenu";
import { cn } from "../lib/cn";
import { copyRowsToClipboard, exportRowsToCsv, exportRowsToPdf, exportRowsToXlsx } from "../lib/tableExport";
import { useColumnWidths } from "../lib/useColumnWidths";

export interface ServerDataTableColumn<T> {
  key: string;
  header: string;
  value: (row: T) => string | number;
  render?: (row: T) => ReactNode;
  /** Colonne masquable via le menu "Colonnes" — visible par défaut sauf mention contraire. */
  defaultVisible?: boolean;
  /** Clé de tri côté serveur envoyée à `onSortChange` — omise si la colonne n'est pas triable. */
  sortKey?: string;
}

export interface ServerDataTableProps<T> {
  columns: ServerDataTableColumn<T>[];
  rows: T[];
  getRowId: (row: T) => string;
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  search: string;
  onSearchChange: (search: string) => void;
  searchPlaceholder?: string;
  sortKey?: string;
  sortDirection?: "asc" | "desc";
  onSortChange?: (key: string) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  rowActions?: (row: T) => ReactNode;
  filters?: ReactNode;
  /** Export sur l'ensemble des données (requête dédiée) — sinon l'export porte sur la page affichée. */
  onExportCsv?: () => void;
  onExportExcel?: () => void;
  exportFilename?: string;
  exportTitle?: string;
  /** Clé de persistance locale des colonnes affichées (une par écran). */
  columnStorageKey?: string;
  /** Ouvre la fiche détaillée d'une ligne (double-clic — cahier des charges §6). */
  onRowDoubleClick?: (row: T) => void;
  /** Actions du menu contextuel (clic droit sur une ligne) ; absent = pas de menu. */
  rowContextActions?: (row: T) => TableContextMenuItem[];
  /** Classe(s) additionnelle(s) par ligne (ex. teinte de fond selon un statut) — opt-in, n'affecte
   * aucun écran qui ne la fournit pas (2026-08-09, retour du porteur du projet, écran Étudiants). */
  rowClassName?: (row: T) => string;
}

function ExportMenu({
  onCsv,
  onXlsx,
  onPdf,
  onCopy,
  fullDatasetNote,
}: {
  onCsv: () => void;
  onXlsx: () => void;
  onPdf: () => void;
  onCopy: () => void;
  fullDatasetNote: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <Button variant="outline" onClick={() => setOpen((v) => !v)}>
        Exporter ▾
      </Button>
      {open && (
        <div
          className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-border bg-background p-1 shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {!fullDatasetNote && (
            <p className="px-3 py-1 text-xs text-muted-foreground">Porte sur la page affichée.</p>
          )}
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
 * Variante du `DataTable` du Module 1, mais avec recherche/tri/pagination
 * délégués au serveur (MODULE-04 §1.10) : conçue pour des tableaux pouvant
 * contenir plusieurs milliers de lignes (étudiants...), là où `DataTable`
 * reste adapté aux petits référentiels chargés entièrement côté client.
 * Enrichie refonte UI/UX Phase 4 (2026-07-30) : colonnes redimensionnables,
 * export Excel/CSV/PDF unifié (`tableExport.ts`), copie, menu contextuel,
 * double-clic. Le tri reste mono-colonne (contrat serveur actuel).
 */
export function ServerDataTable<T>({
  columns,
  rows,
  getRowId,
  total,
  page,
  pageSize,
  onPageChange,
  search,
  onSearchChange,
  searchPlaceholder = "Rechercher...",
  sortKey,
  sortDirection,
  onSortChange,
  isLoading = false,
  emptyMessage = "Aucune donnée.",
  rowActions,
  filters,
  onExportCsv,
  onExportExcel,
  exportFilename = "export",
  exportTitle,
  columnStorageKey,
  onRowDoubleClick,
  rowContextActions,
  rowClassName,
}: ServerDataTableProps<T>) {
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(() => {
    if (columnStorageKey) {
      try {
        const stored = window.localStorage.getItem(columnStorageKey);
        if (stored) return new Set(JSON.parse(stored) as string[]);
      } catch {
        // Stockage local indisponible/corrompu : on retombe sur les colonnes par défaut.
      }
    }
    return new Set(columns.filter((c) => c.defaultVisible !== false).map((c) => c.key));
  });
  const [columnMenuOpen, setColumnMenuOpen] = useState(false);
  const { widths, startResize } = useColumnWidths();
  const { menu, openMenu } = useTableContextMenu<T>();

  useEffect(() => {
    if (columnStorageKey) {
      window.localStorage.setItem(columnStorageKey, JSON.stringify([...visibleKeys]));
    }
  }, [visibleKeys, columnStorageKey]);

  function toggleColumn(key: string) {
    setVisibleKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const visibleColumns = columns.filter((c) => visibleKeys.has(c.key));
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const columnCount = visibleColumns.length + (rowActions ? 1 : 0);
  const exportColumns = visibleColumns.map((c) => ({ header: c.header, value: c.value }));

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="max-w-xs border-2 border-button/30"
        />
        <div className="relative flex items-center gap-2">
          {filters}
          <Button variant="outline" onClick={() => setColumnMenuOpen((v) => !v)}>
            Colonnes
          </Button>
          {columnMenuOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-56 rounded-lg border border-border bg-background p-2 shadow-lg">
              {columns.map((column) => (
                <label key={column.key} className="flex items-center gap-2 px-2 py-1 text-sm">
                  <input
                    type="checkbox"
                    checked={visibleKeys.has(column.key)}
                    onChange={() => toggleColumn(column.key)}
                  />
                  {column.header}
                </label>
              ))}
            </div>
          )}
          <ExportMenu
            fullDatasetNote={Boolean(onExportCsv || onExportExcel)}
            onCsv={() => (onExportCsv ? onExportCsv() : exportRowsToCsv(rows, exportColumns, exportFilename))}
            onXlsx={() => (onExportExcel ? onExportExcel() : exportRowsToXlsx(rows, exportColumns, exportFilename))}
            onPdf={() => void exportRowsToPdf(rows, exportColumns, exportFilename, exportTitle)}
            onCopy={() => void copyRowsToClipboard(rows, exportColumns)}
          />
          <Button variant="outline" onClick={() => window.print()}>
            Imprimer
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg bg-background text-foreground">
        <table className="w-full text-sm" style={{ borderCollapse: "separate", borderSpacing: "0 10px" }}>
          <colgroup>
            {visibleColumns.map((column) => (
              <col key={column.key} style={widths[column.key] ? { width: widths[column.key] } : undefined} />
            ))}
            {rowActions && <col />}
          </colgroup>
          <thead>
            <tr className="table-head-card">
              {visibleColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    "group relative select-none px-3 py-2 text-left font-medium text-secondary-foreground",
                    column.sortKey && onSortChange && "cursor-pointer"
                  )}
                  onClick={() => column.sortKey && onSortChange?.(column.sortKey)}
                >
                  {column.header}
                  {column.sortKey && sortKey === column.sortKey ? (sortDirection === "asc" ? " ▲" : " ▼") : ""}
                  <span
                    role="separator"
                    onMouseDown={startResize(column.key, widths[column.key] ?? 150)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-0 h-full w-1.5 cursor-col-resize opacity-0 hover:bg-primary/40 group-hover:opacity-100"
                  />
                </th>
              ))}
              {rowActions && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columnCount} className="px-3 py-6 text-center text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={columnCount} className="px-3 py-6 text-center text-muted-foreground">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={getRowId(row)}
                  className={cn("table-row-card", onRowDoubleClick && "cursor-pointer", rowClassName?.(row))}
                  onDoubleClick={() => onRowDoubleClick?.(row)}
                  onContextMenu={rowContextActions ? (e) => openMenu(e, row) : undefined}
                >
                  {visibleColumns.map((column) => (
                    <td key={column.key} className="truncate px-3 py-3">
                      {column.render ? column.render(row) : column.value(row)}
                    </td>
                  ))}
                  {rowActions && <td className="px-3 py-3 text-right">{rowActions(row)}</td>}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rowContextActions && <TableContextMenu menu={menu} items={rowContextActions} />}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {total === 0
            ? "0 résultat"
            : `${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)} sur ${total}`}
        </span>
        <div className="flex items-center gap-2">
          <Button variant="outline" disabled={page <= 1} onClick={() => onPageChange(Math.max(1, page - 1))}>
            Précédent
          </Button>
          <span>
            Page {page} / {pageCount}
          </span>
          <Button
            variant="outline"
            disabled={page >= pageCount}
            onClick={() => onPageChange(Math.min(pageCount, page + 1))}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}
