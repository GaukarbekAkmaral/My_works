export interface Booking {
  start: number;
  end: number;
}

export interface Room {
  id: string;
  name: string;
  blocked: boolean;
  bookings: Booking[];
  capacity: number;
  equipment: string[];
}

export const CURRENT_TIME = 540; // 09:00 in minutes since midnight

export type AvailabilityResult =
  | { available: true }
  | { available: false; reason: string };

export type ReasonCode =
  | 'available'
  | 'invalid_time'
  | 'out_of_range'
  | 'start_not_before_end'
  | 'start_in_past'
  | 'slot_too_long'
  | 'room_blocked'
  | 'overlapping_booking';

export interface DetailedAvailabilityResult {
  available: boolean;
  reason: string | null;
  reasonCode: ReasonCode;
}

function evaluateAvailability(
  room: Room,
  start: number,
  end: number,
  now: number
): DetailedAvailabilityResult {
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return {
      available: false,
      reason: 'Please enter valid start and end times.',
      reasonCode: 'invalid_time',
    };
  }

  if (start < 0 || end > 1440) {
    return {
      available: false,
      reason: `Please pick a time between 00:00 and 24:00.`,
      reasonCode: 'out_of_range',
    };
  }

  if (start >= end) {
    return {
      available: false,
      reason: `The end time (${formatTime(end)}) must be later than the start time (${formatTime(start)}). Please choose an end time after your start time.`,
      reasonCode: 'start_not_before_end',
    };
  }

  if (start <= now) {
    return {
      available: false,
      reason: `Your start time (${formatTime(start)}) must be after the current demo time (${formatTime(now)}). Please choose a start time in the future.`,
      reasonCode: 'start_in_past',
    };
  }

  if (end - start > 120) {
    return {
      available: false,
      reason: `Your requested slot is ${end - start} minutes long, but the maximum is 120 minutes (2 hours). Please shorten your end time.`,
      reasonCode: 'slot_too_long',
    };
  }

  if (room.blocked) {
    return {
      available: false,
      reason: `This room is currently blocked and cannot be booked. Please select a different room.`,
      reasonCode: 'room_blocked',
    };
  }

  const overlap = room.bookings.find(
    (b) => start < b.end && end > b.start // touching endpoints allowed
  );
  if (overlap) {
    return {
      available: false,
      reason: `Your time slot (${formatTime(start)}–${formatTime(end)}) overlaps an existing booking (${formatTime(overlap.start)}–${formatTime(overlap.end)}). Please choose a time before or after it.`,
      reasonCode: 'overlapping_booking',
    };
  }

  return { available: true, reason: null, reasonCode: 'available' };
}

export function checkAvailabilityDetailed(
  room: Room,
  start: number,
  end: number,
  now: number = CURRENT_TIME
): DetailedAvailabilityResult {
  return evaluateAvailability(room, start, end, now);
}

export function checkAvailability(
  room: Room,
  start: number,
  end: number,
  now: number = CURRENT_TIME
): AvailabilityResult {
  const detailed = evaluateAvailability(room, start, end, now);
  if (detailed.available) return { available: true };
  return { available: false, reason: detailed.reason! };
}

export function formatTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
