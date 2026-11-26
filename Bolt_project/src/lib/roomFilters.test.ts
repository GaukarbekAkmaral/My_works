import { describe, it, expect } from 'vitest';
import { ROOMS } from '../data/rooms';
import { checkAvailability, CURRENT_TIME } from './availability';
import { filterRooms } from './roomFilters';

function roomIds(attendees: number, equipment: string[] = []): string[] {
  return filterRooms(ROOMS, attendees, equipment).map((room) => room.id);
}

describe('filterRooms', () => {
  it('includes rooms whose capacity exactly matches the request', () => {
    expect(roomIds(20)).toEqual(['A101', 'C303']);
  });

  it('excludes rooms below the requested capacity', () => {
    expect(roomIds(21)).toEqual(['C303']);
  });

  it('returns no rooms when the requested capacity is too high', () => {
    expect(roomIds(31)).toEqual([]);
  });

  it('keeps rooms that have all required equipment', () => {
    expect(roomIds(8, ['Wi-Fi', 'Projector'])).toEqual([
      'A101',
      'B202',
      'C303',
    ]);
  });

  it('requires every selected equipment item', () => {
    expect(roomIds(8, ['Projector', 'Whiteboard'])).toEqual([
      'A101',
      'C303',
    ]);
  });

  it('filters by video conferencing equipment', () => {
    expect(roomIds(8, ['Video conferencing'])).toEqual(['C303']);
  });

  it('applies the capacity filter when no equipment is selected', () => {
    expect(roomIds(8)).toEqual(['A101', 'B202', 'C303', 'D404']);
  });

  it('returns no rooms for equipment that is not in the catalogue', () => {
    expect(roomIds(8, ['HDMI'])).toEqual([]);
  });

  it('does not mutate the room catalogue', () => {
    const before = ROOMS.map((room) => ({
      ...room,
      bookings: room.bookings.map((booking) => ({ ...booking })),
      equipment: [...room.equipment],
    }));

    filterRooms(ROOMS, 20, ['Projector']);

    expect(ROOMS).toEqual(before);
  });

  it('allows an available filtered room to pass the availability check', () => {
    const room = filterRooms(ROOMS, 20, ['Projector']).find(
      (item) => item.id === 'A101'
    );

    expect(room).toBeDefined();
    if (!room) return;

    expect(checkAvailability(room, 750, 810, CURRENT_TIME)).toEqual({
      available: true,
    });
  });

  it('still rejects a filtered room that is blocked', () => {
    const room = filterRooms(ROOMS, 8, ['Wi-Fi', 'Projector']).find(
      (item) => item.id === 'B202'
    );

    expect(room).toBeDefined();
    if (!room) return;

    expect(checkAvailability(room, 750, 810, CURRENT_TIME).available).toBe(
      false
    );
  });
});