import { zodResolver } from "@hookform/resolvers/zod";
import {
  type CreateGuardianInput,
  type GuardianDto,
  type GuardianRelationship,
  createGuardianInputSchema,
} from "@isac-erp/shared";
import { Button, Checkbox, Dialog, FormField, Input, Label, Select } from "@isac-erp/ui";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { trpc } from "../../lib/trpc";

const RELATIONSHIP_OPTIONS: { value: string; label: string }[] = [
  { value: "PERE", label: "Père" },
  { value: "MERE", label: "Mère" },
  { value: "TUTEUR_LEGAL", label: "Tuteur légal" },
  { value: "FRERE", label: "Frère" },
  { value: "SOEUR", label: "Sœur" },
  { value: "ONCLE", label: "Oncle" },
  { value: "TANTE", label: "Tante" },
  { value: "GRAND_PARENT", label: "Grand-parent" },
  { value: "AUTRE", label: "Autre" },
];

export function LinkGuardianDialog({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const [mode, setMode] = useState<"existing" | "new">("existing");
  const [search, setSearch] = useState("");
  const [selectedGuardian, setSelectedGuardian] = useState<GuardianDto | null>(null);
  const [relationship, setRelationship] = useState<GuardianRelationship>("PERE");
  const [relationshipOther, setRelationshipOther] = useState("");
  const [isPrimaryContact, setIsPrimaryContact] = useState(false);

  const utils = trpc.useUtils();
  const searchQuery = trpc.guardians.search.useQuery({ search }, { enabled: search.trim().length > 0 });
  const link = trpc.guardians.link.useMutation({
    onSuccess: () => {
      void utils.guardians.listByStudent.invalidate({ studentId });
      onClose();
    },
  });

  const {
    register,
    getValues,
    formState: { errors },
  } = useForm<CreateGuardianInput>({ resolver: zodResolver(createGuardianInputSchema) });

  function submit() {
    if (mode === "existing" && selectedGuardian) {
      link.mutate({
        studentId,
        guardianId: selectedGuardian.id,
        relationship,
        relationshipOther: relationship === "AUTRE" ? relationshipOther : undefined,
        isPrimaryContact,
      });
    } else if (mode === "new") {
      link.mutate({
        studentId,
        newGuardian: getValues(),
        relationship,
        relationshipOther: relationship === "AUTRE" ? relationshipOther : undefined,
        isPrimaryContact,
      });
    }
  }

  return (
    <Dialog open onClose={onClose} title="Lier un responsable">
      <div className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Button type="button" variant={mode === "existing" ? "primary" : "outline"} onClick={() => setMode("existing")}>
            Responsable existant
          </Button>
          <Button type="button" variant={mode === "new" ? "primary" : "outline"} onClick={() => setMode("new")}>
            Nouveau responsable
          </Button>
        </div>

        {mode === "existing" ? (
          <div className="flex flex-col gap-2">
            <FormField label="Rechercher (nom, prénom ou téléphone)">
              <Input value={search} onChange={(e) => { setSearch(e.target.value); setSelectedGuardian(null); }} />
            </FormField>
            {searchQuery.data && searchQuery.data.length > 0 && (
              <ul className="flex flex-col gap-1 rounded-md border border-border p-1">
                {searchQuery.data.map((g) => (
                  <li key={g.id}>
                    <button
                      type="button"
                      className={`w-full rounded px-2 py-1 text-left text-sm ${
                        selectedGuardian?.id === g.id ? "bg-primary/10" : "hover:bg-muted"
                      }`}
                      onClick={() => setSelectedGuardian(g)}
                    >
                      {g.lastName} {g.firstName} {g.phonePrimary ? `— ${g.phonePrimary}` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Nom" required error={errors.lastName?.message}>
              <Input {...register("lastName")} />
            </FormField>
            <FormField label="Prénom" required error={errors.firstName?.message}>
              <Input {...register("firstName")} />
            </FormField>
            <FormField label="Profession">
              <Input {...register("profession")} />
            </FormField>
            <FormField label="Employeur">
              <Input {...register("employer")} />
            </FormField>
            <FormField label="Téléphone principal">
              <Input {...register("phonePrimary")} />
            </FormField>
            <FormField label="Téléphone secondaire">
              <Input {...register("phoneSecondary")} />
            </FormField>
            <FormField label="WhatsApp">
              <Input {...register("whatsapp")} />
            </FormField>
            <FormField label="E-mail">
              <Input type="email" {...register("email")} />
            </FormField>
            <FormField label="Adresse" className="col-span-2">
              <Input {...register("address")} />
            </FormField>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Lien avec l'étudiant" required>
            <Select value={relationship} onChange={(e) => setRelationship(e.target.value as GuardianRelationship)}>
              {RELATIONSHIP_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </Select>
          </FormField>
          {relationship === "AUTRE" && (
            <FormField label="Précisez" required>
              <Input value={relationshipOther} onChange={(e) => setRelationshipOther(e.target.value)} />
            </FormField>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Checkbox checked={isPrimaryContact} onChange={(e) => setIsPrimaryContact(e.target.checked)} />
          <Label>Contact officiel (reçoit les communications)</Label>
        </div>

        {link.error && <p className="text-sm text-destructive">{link.error.message}</p>}

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={link.isPending || (mode === "existing" && !selectedGuardian)}
          >
            {link.isPending ? "Enregistrement…" : "Lier"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
