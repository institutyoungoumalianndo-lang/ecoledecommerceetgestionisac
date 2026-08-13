import { prisma } from "@isac-erp/db";
import type { CreateRoomInput, ListRoomsInput, RoomDto, UpdateRoomInput } from "@isac-erp/shared";

/** Salle — référentiel minimal (voir MODULE-05.2 §1.7). Remplace à terme Class.mainRoom (texte libre). */
export async function listRooms(input: ListRoomsInput): Promise<RoomDto[]> {
  return prisma.room.findMany({
    where: input.activeOnly ? { isActive: true } : undefined,
    orderBy: { label: "asc" },
  });
}

export async function createRoom(input: CreateRoomInput): Promise<RoomDto> {
  return prisma.room.create({
    data: { label: input.label, capacity: input.capacity ?? null },
  });
}

export async function updateRoom(input: UpdateRoomInput): Promise<RoomDto> {
  return prisma.room.update({
    where: { id: input.id },
    data: {
      label: input.label,
      capacity: input.capacity === undefined ? undefined : input.capacity,
      isActive: input.isActive,
    },
  });
}

/** Jamais supprimée physiquement — des séances/modèles de récurrence peuvent référencer cette salle. */
export async function deactivateRoom(id: string): Promise<RoomDto> {
  return prisma.room.update({ where: { id }, data: { isActive: false } });
}

export async function reactivateRoom(id: string): Promise<RoomDto> {
  return prisma.room.update({ where: { id }, data: { isActive: true } });
}
