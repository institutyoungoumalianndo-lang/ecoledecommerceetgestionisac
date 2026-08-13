import { Button, Card, CardContent, CardHeader, CardTitle, Input, Label } from "@isac-erp/ui";
import { useEffect, useState } from "react";
import { trpc } from "../../lib/trpc";

/**
 * Réglages de l'évaluation (MODULE-06 §1.2/§1.6) — pondérations des composantes et seuils de
 * mention/admission, jamais codés en dur (le système existant les codait en dur).
 */
export function EvaluationSettingsScreen() {
  const utils = trpc.useUtils();
  const query = trpc.evaluationSettings.get.useQuery();

  const [poidsOrale, setPoidsOrale] = useState("");
  const [poidsEcrite, setPoidsEcrite] = useState("");
  const [poidsComposition, setPoidsComposition] = useState("");
  const [seuilAdmission, setSeuilAdmission] = useState("");
  const [seuilPassable, setSeuilPassable] = useState("");
  const [seuilAssezBien, setSeuilAssezBien] = useState("");
  const [seuilBien, setSeuilBien] = useState("");
  const [seuilTresBien, setSeuilTresBien] = useState("");
  const [seuilAbsencesIrregulier, setSeuilAbsencesIrregulier] = useState("");

  useEffect(() => {
    if (!query.data) return;
    setPoidsOrale(query.data.poidsOrale.toString());
    setPoidsEcrite(query.data.poidsEcrite.toString());
    setPoidsComposition(query.data.poidsComposition.toString());
    setSeuilAdmission(query.data.seuilAdmission.toString());
    setSeuilPassable(query.data.seuilPassable.toString());
    setSeuilAssezBien(query.data.seuilAssezBien.toString());
    setSeuilBien(query.data.seuilBien.toString());
    setSeuilTresBien(query.data.seuilTresBien.toString());
    setSeuilAbsencesIrregulier(query.data.seuilAbsencesIrregulier.toString());
  }, [query.data]);

  const update = trpc.evaluationSettings.update.useMutation({
    onSuccess: () => void utils.evaluationSettings.get.invalidate(),
  });

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold text-foreground">Réglages de l'évaluation</h2>

      <Card>
        <CardHeader>
          <CardTitle>Pondération des composantes de la note finale</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            La note finale d'une matière est la moyenne pondérée des composantes renseignées (orale, écrite,
            composition) — une composante non saisie ne compte pas.
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Poids — orale</Label>
              <Input type="number" min={0} step="0.5" value={poidsOrale} onChange={(e) => setPoidsOrale(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Poids — écrite</Label>
              <Input type="number" min={0} step="0.5" value={poidsEcrite} onChange={(e) => setPoidsEcrite(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Poids — composition</Label>
              <Input type="number" min={0} step="0.5" value={poidsComposition} onChange={(e) => setPoidsComposition(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seuils de mention et de décision</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <div className="flex flex-col gap-1.5">
              <Label>Seuil d'admission</Label>
              <Input type="number" min={0} max={20} step="0.5" value={seuilAdmission} onChange={(e) => setSeuilAdmission(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Passable à partir de</Label>
              <Input type="number" min={0} max={20} step="0.5" value={seuilPassable} onChange={(e) => setSeuilPassable(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Assez Bien à partir de</Label>
              <Input type="number" min={0} max={20} step="0.5" value={seuilAssezBien} onChange={(e) => setSeuilAssezBien(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Bien à partir de</Label>
              <Input type="number" min={0} max={20} step="0.5" value={seuilBien} onChange={(e) => setSeuilBien(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Très Bien à partir de</Label>
              <Input type="number" min={0} max={20} step="0.5" value={seuilTresBien} onChange={(e) => setSeuilTresBien(e.target.value)} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Régularité</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Au-delà de ce nombre d'absences non justifiées sur la période (ou l'année pour le bulletin annuel), la
            mention "Irrégulier" remplace "Régulier" sur le bulletin de l'étudiant.
          </p>
          <div className="w-fit">
            <div className="flex flex-col gap-1.5">
              <Label>Seuil d'absences non justifiées</Label>
              <Input
                type="number"
                min={0}
                value={seuilAbsencesIrregulier}
                onChange={(e) => setSeuilAbsencesIrregulier(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {update.error && <p className="text-sm text-destructive">{update.error.message}</p>}
      <div className="flex justify-end">
        <Button
          disabled={update.isPending}
          onClick={() =>
            update.mutate({
              poidsOrale: Number(poidsOrale),
              poidsEcrite: Number(poidsEcrite),
              poidsComposition: Number(poidsComposition),
              seuilAdmission: Number(seuilAdmission),
              seuilPassable: Number(seuilPassable),
              seuilAssezBien: Number(seuilAssezBien),
              seuilBien: Number(seuilBien),
              seuilTresBien: Number(seuilTresBien),
              seuilAbsencesIrregulier: Number(seuilAbsencesIrregulier),
            })
          }
        >
          {update.isPending ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </div>
    </div>
  );
}
