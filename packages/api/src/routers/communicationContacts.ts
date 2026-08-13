import { communicationContactPageSchema, listCommunicationContactsInputSchema } from "@isac-erp/shared";
import * as communicationContactService from "../services/communicationContactService.js";
import { permissionProcedure, router } from "../trpc.js";

export const communicationContactsRouter = router({
  list: permissionProcedure("COMMUNICATION:LECTURE")
    .input(listCommunicationContactsInputSchema)
    .output(communicationContactPageSchema)
    .query(({ input }) => communicationContactService.listCommunicationContacts(input)),
});
