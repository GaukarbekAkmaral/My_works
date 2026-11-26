import type { Room } from './availability';

export function filterRooms(
  rooms: Room[],
  attendees: number,
  requiredEquipment: string[]
): Room[] {
  return rooms.filter(
    (room) =>
      room.capacity >= attendees &&
      requiredEquipment.every((item) => room.equipment.includes(item))
  );
}