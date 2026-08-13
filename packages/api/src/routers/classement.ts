import { classementLigneSchema, getClassementInputSchema } from "@isac-erp/shared";
import { z } from "zod";
import * as classementService from "../services/classementService.js";
import { permissionProcedure, router } from "../trpc.js";

export const classementRouter = router({
  get: permissionProcedure("CLASSEMENT:LECTURE")
    .input(getClassementInputSchema)
    .output(z.array(classementLigneSchema))
    .query(({ input }) => classementService.obtenirClassement(input)),
});
