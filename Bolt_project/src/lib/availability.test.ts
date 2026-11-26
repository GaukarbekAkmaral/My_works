import { describe, it, expect } from 'vitest';
import { CURRENT_TIME, checkAvailability, type Room } from './availability';
import { ROOMS } from '../data/rooms';

const A101 = ROOMS.find((r) => r.id === 'A101')!;
const NOW = CURRENT_TIME;

// Deep clone helper to detect mutations
function cloneRoom(room: Room): Room {
  return {
    id: room.id,
    name: room.name,
    blocked: room.blocked,
    capacity: room.capacity,
    equipment: [...room.equipment],
    bookings: room.bookings.map((b) => ({ ...b })),
  };
}

describe('checkAvailability', () => {
  // T01: 11:00–12:00, after existing booking, valid — available
  it('T01: 660–720 → true', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 660, 720, NOW);
    expect(result.available).toBe(true);
  });

  // T02: start equals now (540), not strictly after — false
  it('T02: 540–570 → false (start not strictly after now)', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 540, 570, NOW);
    expect(result.available).toBe(false);
  });

  // T03: start equals end — false
  it('T03: 720–720 → false (start === end)', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 720, 720, NOW);
    expect(result.available).toBe(false);
  });

  // T04: end before start — false
  it('T04: 750–720 → false (end before start)', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 750, 720, NOW);
    expect(result.available).toBe(false);
  });

  // T05: end exceeds 1440 — false (AC1 upper bound)
  it('T05: 1380–1441 → false (end > 1440)', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 1380, 1441, NOW);
    expect(result.available).toBe(false);
  });

  // T06: 120-minute slot, no overlap, after now — true
  it('T06: 720–840 → true (exactly 120 min, valid)', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 720, 840, NOW);
    expect(result.available).toBe(true);
  });

  // T07: 121-minute slot exceeds 120 max — false (AC2)
  it('T07: 720–841 → false (interval > 120 min)', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 720, 841, NOW);
    expect(result.available).toBe(false);
  });

  // T08: 09:30–10:00, touches existing booking start — true (touching allowed, AC4)
  it('T08: 570–600 → true (touches booking start, no overlap)', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 570, 600, NOW);
    expect(result.available).toBe(true);
  });

  // T09: 10:30–11:30, overlaps existing booking 600–660 — false (AC4)
  it('T09: 630–690 → false (overlaps existing booking)', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 630, 690, NOW);
    expect(result.available).toBe(false);
  });

  // T10: 09:30–11:30, overlaps existing booking 600–660 — false (AC4)
  it('T10: 570–690 → false (overlaps existing booking)', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 570, 690, NOW);
    expect(result.available).toBe(false);
  });

  // T11: 10:15–10:45, fully inside existing booking — false (AC4)
  it('T11: 615–645 → false (inside existing booking)', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 615, 645, NOW);
    expect(result.available).toBe(false);
  });

  // T12: exactly matches existing booking 600–660 — false (AC4)
  it('T12: 600–660 → false (same as existing booking)', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, 600, 660, NOW);
    expect(result.available).toBe(false);
  });

  // T13: blocked room B202 — false (AC3)
  it('T13: blocked room → false', () => {
    const blockedRoom = cloneRoom({
      id: 'B202',
      name: 'Room B202',
      blocked: true,
      bookings: [{ start: 600, end: 660 }],
      capacity: 12,
      equipment: ['Wi-Fi', 'Projector'],

    });
    const result = checkAvailability(blockedRoom, 660, 720, NOW);
    expect(result.available).toBe(false);
  });

  // T14: unblocked room with no bookings, valid slot — true
  it('T14: no bookings, valid slot → true', () => {
    const emptyRoom = cloneRoom({
      id: 'C303',
      name: 'Room C303',
      blocked: false,
      bookings: [],
      capacity: 30,
      equipment: [],
    });
    const result = checkAvailability(emptyRoom, 660, 720, NOW);
    expect(result.available).toBe(true);
  });

  // AC1: negative start — false
  it('AC1: negative start → false', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, -30, 600, NOW);
    expect(result.available).toBe(false);
  });

  // AC1: NaN time — false
  it('AC1: NaN time → false', () => {
    const r = cloneRoom(A101);
    const result = checkAvailability(r, NaN, 720, NOW);
    expect(result.available).toBe(false);
  });

  // Booking data unchanged after checks (AC5: no modification)
  it('booking data is unchanged after check', () => {
    const r = cloneRoom(A101);
    const snapshot = r.bookings.map((b) => ({ ...b }));
    checkAvailability(r, 660, 720, NOW);
    checkAvailability(r, 615, 645, NOW);
    checkAvailability(r, 300, 900, NOW);
    expect(r.bookings).toEqual(snapshot);
    expect(r.bookings.length).toBe(1);
    expect(r.bookings[0].start).toBe(600);
    expect(r.bookings[0].end).toBe(660);
  });
});
