import type { CommunicationContactDto, CommunicationRecipientType } from "@isac-erp/shared";
import { Badge, DataTable, type DataTableColumn, Input, Select } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

const TYPE_LABELS: Record<CommunicationRecipientType, string> = {
  ETUDIANT: "Étudiant",
  PARENT: "Parent/tuteur",
  ENSEIGNANT: "Enseignant",
  PERSONNEL: "Personnel",
  AUTRE: "Autre",
};

/**
 * Carnet d'adresses intelligent (voir MODULE-12 §1.2/§1.3) — jamais une ressaisie : lecture
 * transverse sur Student/Guardian/Teacher/Employee, alimentée automatiquement par les autres modules.
 */
export function ContactsScreen() {
  const [search, setSearch] = useState("");
  const [type, setType] = useState<CommunicationRecipientType | "">("");
  const [page, setPage] = useState(1);

  const query = trpc.communicationContacts.list.useQuery({
    search: search || undefined,
    type: type || undefined,
    page,
    pageSize: 50,
  });

  const columns: DataTableColumn<CommunicationContactDto>[] = [
    { key: "nom", header: "Nom", value: (r) => `${r.lastName} ${r.firstName}` },
    { key: "type", header: "Type", value: (r) => TYPE_LABELS[r.type], render: (r) => <Badge variant="default">{TYPE_LABELS[r.type]}</Badge> },
    { key: "telephone", header: "Téléphone", value: (r) => r.phonePrimary ?? "—" },
    { key: "whatsapp", header: "WhatsApp", value: (r) => r.whatsapp ?? "—" },
    { key: "email", header: "E-mail", value: (r) => r.email ?? "—" },
    { key: "classe", header: "Classe", value: (r) => r.className ?? "—" },
    { key: "filiere", header: "Filière", value: (r) => r.filiereName ?? "—" },
    { key: "campus", header: "Campus", value: (r) => r.campus ?? "—" },
    { key: "fonction", header: "Fonction", value: (r) => r.fonction ?? "—" },
    {
      key: "statut",
      header: "Statut",
      value: (r) => r.statut,
      render: (r) => <Badge variant={r.statut === "Actif" ? "success" : "muted"}>{r.statut}</Badge>,
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Recherche</label>
          <Input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="Nom, téléphone, e-mail…" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs text-muted-foreground">Type</label>
          <Select value={type} onChange={(e) => { setType(e.target.value as CommunicationRecipientType | ""); setPage(1); }}>
            <option value="">Tous</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        rows={query.data?.rows ?? []}
        getRowId={(r) => r.id}
        exportFilename="carnet-adresses"
        emptyMessage={query.isLoading ? "Chargement…" : "Aucun contact."}
      />
      <p className="text-xs text-muted-foreground">
        {query.data?.total ?? 0} contact(s) au total — page {page}.
      </p>
    </div>
  );
}
