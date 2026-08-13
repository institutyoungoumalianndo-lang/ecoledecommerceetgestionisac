import { z } from "zod";

/** Salle — référentiel minimal (voir MODULE-05.2 §1.7). Remplace à terme Class.mainRoom (texte libre). */
export const roomSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  capacity: z.number().int().nullable(),
  isActive: z.boolean(),
});
export type RoomDto = z.infer<typeof roomSchema>;

export const createRoomInputSchema = z.object({
  label: z.string().min(1),
  capacity: z.number().int().positive().nullish(),
});
export type CreateRoomInput = z.infer<typeof createRoomInputSchema>;

export const updateRoomInputSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).optional(),
  capacity: z.number().int().positive().nullish(),
  isActive: z.boolean().optional(),
});
export type UpdateRoomInput = z.infer<typeof updateRoomInputSchema>;

export const roomIdInputSchema = z.object({ id: z.string().uuid() });

export const listRoomsInputSchema = z.object({ activeOnly: z.boolean().optional() });
export type ListRoomsInput = z.infer<typeof listRoomsInputSchema>;
