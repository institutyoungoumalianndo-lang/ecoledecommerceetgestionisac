import { z } from "zod";
import {
  createRoomInputSchema,
  listRoomsInputSchema,
  roomIdInputSchema,
  roomSchema,
  updateRoomInputSchema,
} from "@isac-erp/shared";
import * as roomService from "../services/roomService.js";
import { logAction } from "../services/auditService.js";
import { permissionProcedure, router } from "../trpc.js";

export const roomsRouter = router({
  list: permissionProcedure("SALLES:LECTURE")
    .input(listRoomsInputSchema)
    .output(z.array(roomSchema))
    .query(({ input }) => roomService.listRooms(input)),

  create: permissionProcedure("SALLES:MODIFICATION")
    .input(createRoomInputSchema)
    .output(roomSchema)
    .mutation(async ({ input, ctx }) => {
      const room = await roomService.createRoom(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ROOM_CREATE",
        module: "SALLES",
        entityType: "Room",
        entityId: room.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return room;
    }),

  update: permissionProcedure("SALLES:MODIFICATION")
    .input(updateRoomInputSchema)
    .output(roomSchema)
    .mutation(async ({ input, ctx }) => {
      const room = await roomService.updateRoom(input);
      await logAction({
        userId: ctx.session.userId,
        action: "ROOM_UPDATE",
        module: "SALLES",
        entityType: "Room",
        entityId: room.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return room;
    }),

  deactivate: permissionProcedure("SALLES:MODIFICATION")
    .input(roomIdInputSchema)
    .output(roomSchema)
    .mutation(async ({ input, ctx }) => {
      const room = await roomService.deactivateRoom(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "ROOM_DEACTIVATE",
        module: "SALLES",
        entityType: "Room",
        entityId: room.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return room;
    }),

  reactivate: permissionProcedure("SALLES:MODIFICATION")
    .input(roomIdInputSchema)
    .output(roomSchema)
    .mutation(async ({ input, ctx }) => {
      const room = await roomService.reactivateRoom(input.id);
      await logAction({
        userId: ctx.session.userId,
        action: "ROOM_REACTIVATE",
        module: "SALLES",
        entityType: "Room",
        entityId: room.id,
        result: "SUCCES",
        ipAddress: ctx.ipAddress,
      });
      return room;
    }),
});
