import {
  formatTime,
  type ReasonCode,
  type DetailedAvailabilityResult,
} from './availability';
import type { Room } from './availability';

export interface ExplanationRequest {
  roomLabel: string;
  start: number;
  end: number;
  isAvailable: boolean;
  reasonCode: ReasonCode;
}

export type ExplanationResponse = { explanation: string };

const KNOWN_REASON_CODES: ReasonCode[] = [
  'available',
  'invalid_time',
  'out_of_range',
  'start_not_before_end',
  'start_in_past',
  'slot_too_long',
  'room_blocked',
  'overlapping_booking',
];

export type ExplanationFault = 'timeout' | 'service_failure';

export class ExplanationValidationError extends Error {}

// Tracks which explain request is current so stale async completions
// (results, errors, loading updates) can be ignored after inputs change.
export class ExplanationGeneration {
  private current = 0;

  invalidate(): void {
    this.current += 1;
  }

  begin(): number {
    this.current += 1;
    return this.current;
  }

  isCurrent(token: number): boolean {
    return token === this.current;
  }
}

export function validateExplanationRequest(
  roomLabel: unknown,
  start: unknown,
  end: unknown,
  isAvailable: unknown,
  reasonCode: unknown,
  roomNames: readonly string[]
): asserts roomLabel is string {
  if (typeof roomLabel !== 'string' || roomLabel.length === 0) {
    throw new ExplanationValidationError('Room label must be a non-empty string.');
  }
  if (!roomNames.includes(roomLabel)) {
    throw new ExplanationValidationError('Unknown room label.');
  }
  if (typeof start !== 'number' || !Number.isFinite(start) || start < 0 || start > 1440) {
    throw new ExplanationValidationError('Start time out of range.');
  }
  if (typeof end !== 'number' || !Number.isFinite(end) || end < 0 || end > 1440) {
    throw new ExplanationValidationError('End time out of range.');
  }
  if (start >= end) {
    throw new ExplanationValidationError('Start time must be before end time.');
  }
  if (typeof isAvailable !== 'boolean') {
    throw new ExplanationValidationError('isAvailable must be a boolean.');
  }
  if (
    typeof reasonCode !== 'string' ||
    !KNOWN_REASON_CODES.includes(reasonCode as ReasonCode)
  ) {
    throw new ExplanationValidationError('Unknown reason code.');
  }
  if (isAvailable !== (reasonCode === 'available')) {
    throw new ExplanationValidationError('isAvailable and reasonCode disagree.');
  }
}

export function buildFallbackExplanation(
  request: ExplanationRequest
): ExplanationResponse {
  const window = `${formatTime(request.start)}–${formatTime(request.end)}`;
  const verdict = request.isAvailable
    ? `${request.roomLabel} is available from ${window}.`
    : `${request.roomLabel} is not available from ${window}.`;
  return { explanation: verdict };
}

export function selectValidationFailureGuidance(
  detailed: DetailedAvailabilityResult,
  request: ExplanationRequest
): ExplanationResponse {
  if (detailed.available === false && detailed.reason !== null) {
    return { explanation: `The availability check reported: ${detailed.reason}` };
  }
  return buildFallbackExplanation(request);
}

export class MockExplanationAdapter {
  private fault: ExplanationFault | null = null;

  setFault(fault: ExplanationFault | null) {
    this.fault = fault;
  }

  async explain(request: ExplanationRequest): Promise<ExplanationResponse> {
    if (this.fault === 'timeout') {
      await sleep(120);
      throw new Error('Simulated timeout');
    }
    if (this.fault === 'service_failure') {
      throw new Error('Simulated service failure');
    }
    await sleep(80);
    return { explanation: composeExplanation(request) };
  }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function composeExplanation(request: ExplanationRequest): string {
  const window = `${formatTime(request.start)}–${formatTime(request.end)}`;
  switch (request.reasonCode) {
    case 'available':
      return `${request.roomLabel} is free from ${window}. No existing booking conflicts with this slot.`;
    case 'room_blocked':
      return `${request.roomLabel} is not available from ${window}. The room is currently blocked and cannot be booked.`;
    case 'overlapping_booking':
      return `${request.roomLabel} is not available from ${window}. The requested slot overlaps an existing booking in this room.`;
    case 'slot_too_long':
      return `${request.roomLabel} is not available from ${window}. The requested slot is longer than the 120-minute maximum.`;
    case 'start_in_past':
      return `${request.roomLabel} is not available from ${window}. The start time is not after the current demo time.`;
    case 'start_not_before_end':
      return `${request.roomLabel} is not available from ${window}. The end time must be later than the start time.`;
    case 'out_of_range':
      return `${request.roomLabel} is not available from ${window}. Times must fall within the same day, between 00:00 and 24:00.`;
    case 'invalid_time':
      return `${request.roomLabel} is not available from ${window}. The entered times could not be interpreted as valid times.`;
  }
}

export function buildExplanationRequest(
  room: Room,
  start: number,
  end: number,
  detailed: { available: boolean; reasonCode: ReasonCode }
): ExplanationRequest {
  return {
    roomLabel: room.name,
    start,
    end,
    isAvailable: detailed.available,
    reasonCode: detailed.reasonCode,
  };
}
