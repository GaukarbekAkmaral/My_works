import { describe, it, expect } from 'vitest';
import {
  MockExplanationAdapter,
  ExplanationValidationError,
  validateExplanationRequest,
  buildFallbackExplanation,
  buildExplanationRequest,
  selectValidationFailureGuidance,
} from './explanation';
import { checkAvailabilityDetailed } from './availability';
import { ROOMS } from '../data/rooms';

const A101 = ROOMS.find((r) => r.id === 'A101')!;
const ROOM_NAMES = ROOMS.map((r) => r.name);

function validRequest() {
  return buildExplanationRequest(A101, 660, 720, {
    available: true,
    reasonCode: 'available',
  });
}

describe('validateExplanationRequest', () => {
  it('accepts a valid request built from a real room', () => {
    expect(() =>
      validateExplanationRequest(
        'Room A101',
        660,
        720,
        true,
        'available',
        ROOM_NAMES
      )
    ).not.toThrow();
  });

  it('rejects an empty room label', () => {
    expect(() =>
      validateExplanationRequest('', 660, 720, true, 'available', ROOM_NAMES)
    ).toThrow(ExplanationValidationError);
  });

  it('rejects a label that is not in the room fixtures', () => {
    expect(() =>
      validateExplanationRequest(
        'Free-text prompt',
        660,
        720,
        true,
        'available',
        ROOM_NAMES
      )
    ).toThrow(ExplanationValidationError);
  });

  it('rejects an oversized room label (10000 characters)', () => {
    expect(() =>
      validateExplanationRequest(
        'A'.repeat(10000),
        660,
        720,
        true,
        'available',
        ROOM_NAMES
      )
    ).toThrow(ExplanationValidationError);
  });

  it('rejects non-finite or out-of-range times', () => {
    expect(() =>
      validateExplanationRequest(
        'Room A101',
        NaN,
        720,
        true,
        'available',
        ROOM_NAMES
      )
    ).toThrow(ExplanationValidationError);
    expect(() =>
      validateExplanationRequest(
        'Room A101',
        -10,
        720,
        true,
        'available',
        ROOM_NAMES
      )
    ).toThrow(ExplanationValidationError);
    expect(() =>
      validateExplanationRequest(
        'Room A101',
        660,
        1441,
        true,
        'available',
        ROOM_NAMES
      )
    ).toThrow(ExplanationValidationError);
  });

  it('rejects start >= end', () => {
    expect(() =>
      validateExplanationRequest(
        'Room A101',
        720,
        720,
        true,
        'available',
        ROOM_NAMES
      )
    ).toThrow(ExplanationValidationError);
  });

  it('rejects a non-boolean isAvailable', () => {
    expect(() =>
      validateExplanationRequest(
        'Room A101',
        660,
        720,
        'yes',
        'available',
        ROOM_NAMES
      )
    ).toThrow(ExplanationValidationError);
  });

  it('rejects an unknown reason code', () => {
    expect(() =>
      validateExplanationRequest(
        'Room A101',
        660,
        720,
        false,
        'teleported',
        ROOM_NAMES
      )
    ).toThrow(ExplanationValidationError);
  });

  it('rejects isAvailable and reasonCode disagreeing', () => {
    expect(() =>
      validateExplanationRequest(
        'Room A101',
        660,
        720,
        true,
        'room_blocked',
        ROOM_NAMES
      )
    ).toThrow(ExplanationValidationError);
  });

  it('guidance for the reversed interval 11:30–11:00 shows the checker reason, not the generic fallback', () => {
    const detailed = checkAvailabilityDetailed(A101, 690, 660);
    expect(detailed.available).toBe(false);
    expect(detailed.reasonCode).toBe('start_not_before_end');
    const request = buildExplanationRequest(A101, 690, 660, detailed);
    expect(() =>
      validateExplanationRequest(
        request.roomLabel,
        request.start,
        request.end,
        request.isAvailable,
        request.reasonCode,
        ROOM_NAMES
      )
    ).toThrow(ExplanationValidationError);
    const guidance = selectValidationFailureGuidance(detailed, request);
    expect(guidance.explanation).toContain('must be later than the start time');
    expect(guidance.explanation).not.toBe(
      buildFallbackExplanation(request).explanation
    );
  });
});

describe('MockExplanationAdapter', () => {
  it('returns an explanation agreeing with an available verdict', async () => {
    const adapter = new MockExplanationAdapter();
    const res = await adapter.explain(validRequest());
    expect(res.explanation).toContain('Room A101');
    expect(res.explanation).toContain('11:00–12:00');
    expect(res.explanation).toMatch(/free|available/i);
    expect(res.explanation.split(/[.!?]/).filter((s) => s.trim()).length).toBeLessThanOrEqual(2);
  });

  it('returns an explanation agreeing with an unavailable verdict', async () => {
    const adapter = new MockExplanationAdapter();
    const res = await adapter.explain(
      buildExplanationRequest(A101, 600, 660, {
        available: false,
        reasonCode: 'overlapping_booking',
      })
    );
    expect(res.explanation).toContain('not available');
    expect(res.explanation).not.toMatch(/free from/i);
  });

  it('never exceeds two sentences for any reason code', async () => {
    const adapter = new MockExplanationAdapter();
    const codes = [
      'available',
      'invalid_time',
      'out_of_range',
      'start_not_before_end',
      'start_in_past',
      'slot_too_long',
      'room_blocked',
      'overlapping_booking',
    ] as const;
    for (const code of codes) {
      const req = buildExplanationRequest(A101, 600, 660, {
        available: code === 'available',
        reasonCode: code,
      });
      const res = await adapter.explain(req);
      const sentences = res.explanation
        .split(/[.!?]/)
        .filter((s) => s.trim().length > 0);
      expect(sentences.length, `reasonCode=${code}`).toBeLessThanOrEqual(2);
    }
  });

  it('simulated timeout rejects and never resolves with fabricated text', async () => {
    const adapter = new MockExplanationAdapter();
    adapter.setFault('timeout');
    await expect(adapter.explain(validRequest())).rejects.toThrow(
      /Simulated timeout/
    );
  });

  it('simulated service failure rejects', async () => {
    const adapter = new MockExplanationAdapter();
    adapter.setFault('service_failure');
    await expect(adapter.explain(validRequest())).rejects.toThrow(
      /Simulated service failure/
    );
  });

  it('recovers after the fault is cleared', async () => {
    const adapter = new MockExplanationAdapter();
    adapter.setFault('service_failure');
    await expect(adapter.explain(validRequest())).rejects.toThrow();
    adapter.setFault(null);
    const res = await adapter.explain(validRequest());
    expect(res.explanation).toContain('Room A101');
  });
});

describe('buildFallbackExplanation', () => {
  it('produces a single deterministic sentence for unavailable verdicts', () => {
    const res = buildFallbackExplanation(
      buildExplanationRequest(A101, 600, 660, {
        available: false,
        reasonCode: 'room_blocked',
      })
    );
    expect(res.explanation).toBe(
      'Room A101 is not available from 10:00–11:00.'
    );
  });

  it('produces a single deterministic sentence for available verdicts', () => {
    const res = buildFallbackExplanation(validRequest());
    expect(res.explanation).toBe('Room A101 is available from 11:00–12:00.');
  });
});

describe('checkAvailabilityDetailed parity with checkAvailability', () => {
  it('reports reasonCode available for a free slot', () => {
    const detailed = checkAvailabilityDetailed(A101, 660, 720);
    expect(detailed).toEqual({
      available: true,
      reason: null,
      reasonCode: 'available',
    });
  });

  it('reports overlapping_booking for a conflicting slot', () => {
    const detailed = checkAvailabilityDetailed(A101, 630, 690);
    expect(detailed.available).toBe(false);
    expect(detailed.reasonCode).toBe('overlapping_booking');
    expect(typeof detailed.reason).toBe('string');
  });

  it('reports room_blocked for the blocked fixture', () => {
    const b202 = ROOMS.find((r) => r.id === 'B202')!;
    const detailed = checkAvailabilityDetailed(b202, 660, 720);
    expect(detailed.reasonCode).toBe('room_blocked');
  });
});
