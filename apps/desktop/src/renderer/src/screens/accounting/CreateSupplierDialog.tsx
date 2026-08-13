import { Button, Dialog, Input, Label } from "@isac-erp/ui";
import { useState } from "react";
import { trpc } from "../../lib/trpc";

/** Fournisseur (MODULE-07 §1.8/§8.10). */
export function CreateSupplierDialog({ onClose }: { onClose: () => void }) {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactPerson, setContactPerson] = useState("");
  const [category, setCategory] = useState("");
  const utils = trpc.useUtils();

  const create = trpc.suppliers.create.useMutation({
    onSuccess: () => {
      void utils.suppliers.list.invalidate();
      onClose();
    },
  });

  return (
    <Dialog open onClose={onClose} title="Nouveau fournisseur">
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Code</Label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Nom</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Adresse</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Téléphone</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Email</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Personne de contact</Label>
            <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Catégorie</Label>
            <Input value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
        </div>
        {create.error && <p className="text-sm text-destructive">{create.error.message}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Annuler
          </Button>
          <Button
            disabled={!code || !name || create.isPending}
            onClick={() =>
              create.mutate({
                code,
                name,
                address: address || undefined,
                phone: phone || undefined,
                email: email || undefined,
                contactPerson: contactPerson || undefined,
                category: category || undefined,
              })
            }
          >
            {create.isPending ? "Création…" : "Créer"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
