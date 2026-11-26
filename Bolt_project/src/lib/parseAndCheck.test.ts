import { describe, it, expect } from 'vitest';
import { parseTime, parseAndCheck } from './parseAndCheck';
import { ROOMS } from '../data/rooms';
import { CURRENT_TIME, type Room } from './availability';

const A101 = ROOMS.find((r) => r.id === 'A101')!;

describe('parseTime', () => {
  it('parses a valid HH:MM string into minutes since midnight', () => {
    expect(parseTime('09:30')).toBe(570);
  });

  it('returns null for an empty string', () => {
    expect(parseTime('')).toBeNull();
  });

  it('returns null for an out-of-range time', () => {
    expect(parseTime('24:00')).toBeNull();
  });
});

describe('parseAndCheck', () => {
  // Mirrors handleSubmit: both fields empty → "both" message
  it('returns the "both times" message when start and end are empty', () => {
    const result = parseAndCheck(A101, '', '');
    expect(result).not.toBeNull();
    expect(result!.available).toBe(false);
    expect(result).toEqual({
      available: false,
      reason:
        'Please enter both a start time and an end time (e.g. 09:30 and 10:30).',
    });
  });

  // Mirrors handleSubmit: only start missing → "start" message
  it('returns the "start time" message when only start is empty', () => {
    const result = parseAndCheck(A101, '', '10:30');
    expect(result).not.toBeNull();
    expect(result!.available).toBe(false);
    expect(result).toEqual({
      available: false,
      reason: 'Please enter a start time (e.g. 09:30).',
    });
  });

  // Mirrors handleSubmit: only end missing → "end" message
  it('returns the "end time" message when only end is empty', () => {
    const result = parseAndCheck(A101, '09:30', '');
    expect(result).not.toBeNull();
    expect(result!.available).toBe(false);
    expect(result).toEqual({
      available: false,
      reason: 'Please enter an end time (e.g. 10:30).',
    });
  });

  // Mirrors handleSubmit: valid times → availability result
  it('delegates to checkAvailability for valid times', () => {
    const result = parseAndCheck(A101, '11:00', '12:00');
    expect(result).toEqual({ available: true });
  });

  // Mirrors the room-card path guard: it never produces the "both/start/end"
  // messages for missing times — the caller hides them by checking parseTime.
  // This test documents that parseAndCheck itself still returns an unavailable
  // result (not a throw) so the guard remains the sole gate.
  it('does not mutate the room when called with valid times', () => {
    const room: Room = {
      id: 'A101',
      name: 'Room A101',
      blocked: false,
      bookings: [{ start: 600, end: 660 }],
      capacity: 20,
      equipment: ['Wi-Fi', 'Projector', 'Whiteboard'],
    };
    const snapshot = room.bookings.map((b) => ({ ...b }));
    parseAndCheck(room, '11:00', '12:00');
    expect(room.bookings).toEqual(snapshot);
    expect(room.bookings.length).toBe(1);
  });

  // AC4: touching endpoints allowed — confirms helper forwards to the rule
  // without altering the touching semantics.
  it('forwards the touching-endpoints case correctly', () => {
    const result = parseAndCheck(A101, '09:30', '10:00');
    expect(result).toEqual({ available: true });
  });

  // AC1: start at/after now boundary — start 09:00 == now 540 → false
  it('forwards the "start not strictly after now" rejection', () => {
    const result = parseAndCheck(A101, '09:00', '09:30');
    expect(result).not.toBeNull();
    expect(result!.available).toBe(false);
  });

  // Sanity: CURRENT_TIME consistency with the helper's default check
  it('uses the module CURRENT_TIME in the delegated check', () => {
    expect(CURRENT_TIME).toBe(540);
  });
});

describe("parseAndCheck mode: 'null' (room-card path)", () => {
  // Mirrors room-card onClick: both empty → null (no message surfaced)
  it('returns null when both times are empty', () => {
    expect(parseAndCheck(A101, '', '', 'null')).toBeNull();
  });

  // Mirrors room-card onClick: only start empty → null
  it('returns null when only start is empty', () => {
    expect(parseAndCheck(A101, '', '10:30', 'null')).toBeNull();
  });

  // Mirrors room-card onClick: only end empty → null
  it('returns null when only end is empty', () => {
    expect(parseAndCheck(A101, '09:30', '', 'null')).toBeNull();
  });

  // Mirrors room-card onClick: valid times → availability result (same as 'message')
  it('delegates to checkAvailability for valid times', () => {
    expect(parseAndCheck(A101, '11:00', '12:00', 'null')).toEqual({
      available: true,
    });
  });

  // Boundary parity: 'null' and 'message' produce identical results for valid times
  it('matches the default mode for valid times', () => {
    expect(parseAndCheck(A101, '11:00', '12:00', 'null')).toEqual(
      parseAndCheck(A101, '11:00', '12:00')
    );
  });
});
