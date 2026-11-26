import {
  checkAvailability,
  type AvailabilityResult,
  type Room,
} from './availability';

export type ParseAndCheckMode = 'message' | 'null';

export function parseTime(value: string): number | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const h = parseInt(match[1], 10);
  const m = parseInt(match[2], 10);
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
}

export function parseAndCheck(
  room: Room,
  startStr: string,
  endStr: string,
  mode: ParseAndCheckMode = 'message'
): AvailabilityResult | null {
  const startMin = parseTime(startStr);
  const endMin = parseTime(endStr);

  if (startMin === null || endMin === null) {
    if (mode === 'null') return null;
    if (startMin === null && endMin === null) {
      return {
        available: false,
        reason:
          'Please enter both a start time and an end time (e.g. 09:30 and 10:30).',
      };
    }
    if (startMin === null) {
      return {
        available: false,
        reason: 'Please enter a start time (e.g. 09:30).',
      };
    }
    return {
      available: false,
      reason: 'Please enter an end time (e.g. 10:30).',
    };
  }

  return checkAvailability(room, startMin, endMin);
}
