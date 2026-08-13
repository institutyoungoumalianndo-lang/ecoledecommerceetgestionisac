import type { CommunicationRecipientType } from "@isac-erp/shared";
import { Input, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

const TYPE_LABELS: Record<CommunicationRecipientType, string> = {
  ETUDIANT: "Étudiant",
  PARENT: "Parent/tuteur",
  ENSEIGNANT: "Enseignant",
  PERSONNEL: "Personnel",
  AUTRE: "Autre",
};

/** Sélecteur de contacts réutilisable — carnet d'adresses transverse (voir MODULE-12 §1.3/§1.4/§1.5). */
export function ContactPicker({
  selectedIds,
  onChange,
}: {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<CommunicationRecipientType | "">("");

  const query = trpc.communicationContacts.list.useQuery({
    search: search || undefined,
    type: type || undefined,
    page: 1,
    pageSize: 200,
  });

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((i) => i !== id) : [...selectedIds, id]);
  }

  const rows = query.data?.rows ?? [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input placeholder="Rechercher un nom, téléphone…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={type} onChange={(e) => setType(e.target.value as CommunicationRecipientType | "")}>
          <option value="">Tous les types</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </Select>
      </div>
      <div className="flex max-h-72 flex-col gap-1 overflow-auto rounded-lg border border-border p-2">
        {query.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
        {!query.isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">Aucun contact.</p>}
        {rows.map((c) => (
          <label key={c.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm hover:bg-muted">
            <input
              type="checkbox"
              checked={selectedIds.includes(c.id)}
              onChange={() => toggle(c.id)}
              className="h-4 w-4 rounded border-border text-primary"
            />
            <span className="flex-1">
              {c.lastName} {c.firstName}
              <span className="text-muted-foreground"> — {TYPE_LABELS[c.type]}{c.className ? ` — ${c.className}` : ""}</span>
            </span>
            <span className="text-xs text-muted-foreground">{c.phonePrimary ?? c.email ?? "—"}</span>
          </label>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">{selectedIds.length} destinataire(s) sélectionné(s).</p>
    </div>
  );
}
