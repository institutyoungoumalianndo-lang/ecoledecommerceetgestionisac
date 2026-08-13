import { feuilleSaisieSchema, getFeuilleSaisieInputSchema } from "@isac-erp/shared";
import * as feuilleSaisieService from "../services/feuilleSaisieService.js";
import { permissionProcedure, router } from "../trpc.js";

export const feuilleSaisieRouter = router({
  get: permissionProcedure("NOTES:LECTURE")
    .input(getFeuilleSaisieInputSchema)
    .output(feuilleSaisieSchema)
    .query(({ input }) => feuilleSaisieService.getFeuilleSaisie(input)),
});
