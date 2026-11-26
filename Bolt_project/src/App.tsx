import { useState, useRef } from 'react';
import { ROOMS } from '@/data/rooms';
import { filterRooms } from '@/lib/roomFilters';
import { CheckCircle2, XCircle, Clock, DoorClosed, CalendarClock, Building2, Sparkles } from 'lucide-react';
import {
  CURRENT_TIME,
  checkAvailabilityDetailed,
  formatTime,
  type AvailabilityResult,
} from '@/lib/availability';
import { parseAndCheck, parseTime } from '@/lib/parseAndCheck';
import {
  MockExplanationAdapter,
  ExplanationValidationError,
  ExplanationGeneration,
  validateExplanationRequest,
  buildFallbackExplanation,
  buildExplanationRequest,
  selectValidationFailureGuidance,
} from '@/lib/explanation';

const explanationAdapter = new MockExplanationAdapter();

function App() {
  const [roomId, setRoomId] = useState(ROOMS[0].id);
  const [attendees, setAttendees] = useState(0);
  const [requiredEquipment, setRequiredEquipment] = useState<string[]>([]);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [result, setResult] = useState<AvailabilityResult | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);
  const explanationGeneration = useRef(new ExplanationGeneration());

  const filteredRooms = filterRooms(ROOMS, attendees, requiredEquipment);
  const equipmentOptions = [
  ...new Set(ROOMS.flatMap((room) => room.equipment)),
];
  const selectedRoom = ROOMS.find((r) => r.id === roomId)!;

  function clearExplanation() {
    setExplanation(null);
    setExplaining(false);
  }

  function handleExplain() {
    if (result === null) return;
    const startMin = parseTime(start);
    const endMin = parseTime(end);
    if (startMin === null || endMin === null) return;
    const detailed = checkAvailabilityDetailed(selectedRoom, startMin, endMin);
    const request = buildExplanationRequest(selectedRoom, startMin, endMin, detailed);
    const token = explanationGeneration.current.begin();
    setExplaining(true);
    try {
      validateExplanationRequest(
        request.roomLabel,
        request.start,
        request.end,
        request.isAvailable,
        request.reasonCode,
        ROOMS.map((room) => room.name)
      );
    } catch (err) {
      if (err instanceof ExplanationValidationError) {
        if (explanationGeneration.current.isCurrent(token)) {
          setExplanation(
            selectValidationFailureGuidance(detailed, request).explanation
          );
          setExplaining(false);
        }
        return;
      }
      throw err;
    }
    explanationAdapter
      .explain(request)
      .then((res) => {
        if (!explanationGeneration.current.isCurrent(token)) return;
        setExplanation(res.explanation);
      })
      .catch(() => {
        if (!explanationGeneration.current.isCurrent(token)) return;
        setExplanation(buildFallbackExplanation(request).explanation);
      })
      .finally(() => {
        if (explanationGeneration.current.isCurrent(token)) {
          setExplaining(false);
        }
      });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(parseAndCheck(selectedRoom, start, end));
    clearExplanation();
  }

  function handleReset() {
    setStart('');
    setEnd('');
    setResult(null);
    explanationGeneration.current.invalidate();
    clearExplanation();
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {/* Header */}
        <header className="mb-8 text-center">
          <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/25">
            <Building2 className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
            Smart Campus Room Availability
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Check if a room is free for your desired time slot.
          </p>
        </header>

        {/* Demo info banner */}
        <div className="mb-6 flex items-center gap-3 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          <Clock className="h-5 w-5 shrink-0 text-blue-600" />
          <span>
            Demo current time is fixed at{' '}
            <strong>{formatTime(CURRENT_TIME)}</strong> for consistent testing.
          </span>
        </div>

        {/* Form card */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
        >
          {/* Room selector */}
          <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <DoorClosed className="h-4 w-4 text-slate-400" />
            Select a room
          </label>
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="attendees"
                className="mb-2 block text-sm font-semibold text-slate-700">
                Number of attendees </label>
              <input
                id="attendees"
                type="number"
                min="0"
                value={attendees}
                onChange={(e) => {
                  setAttendees(Number(e.target.value));
                  setResult(null);
                  explanationGeneration.current.invalidate();
                  clearExplanation();
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5"
              />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700">Required equipment</legend>
              <div className="flex flex-wrap gap-3">
                {equipmentOptions.map((item) => (
                  <label key={item} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={requiredEquipment.includes(item)}
                      onChange={(e) => {
                        setRequiredEquipment((current) =>
                          e.target.checked
                            ? [...current, item]
                            : current.filter((selected) => selected !== item)
                        );
                        setResult(null);
                        explanationGeneration.current.invalidate();
                        clearExplanation();
                      }}
                    />
                    {item}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {filteredRooms.length === 0 ? (
              <p className="text-sm text-slate-500 sm:col-span-2">
                No rooms match these filters. Try changing the number of attendees or required equipment.
              </p>
            ) : (
              filteredRooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => {
                  setRoomId(room.id);
                  setResult(parseAndCheck(room, start, end, 'null'));
                  explanationGeneration.current.invalidate();
                  clearExplanation();
                }}
                className={`flex items-center justify-between rounded-xl border-2 px-4 py-3 text-left transition ${
                  roomId === room.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <p className="font-semibold text-slate-900">{room.name}</p>
                  <p className={`text-xs ${room.blocked ? 'text-red-500' : 'text-slate-500'}`}>
                    {room.blocked ? 'Blocked' : 'Not blocked — check time availability'}
                  </p>
                </div>
                <span
                  className={`h-3 w-3 rounded-full ${
                    room.blocked ? 'bg-red-400' : 'bg-green-400'
                  }`}
                />
              </button>
            )))}
          </div>

          {/* Existing bookings for selected room */}
          {filteredRooms.length > 0 && selectedRoom.bookings.length > 0 && (
            <div className="mb-6 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-600">
              <p className="mb-1 flex items-center gap-2 font-medium text-slate-700">
                <CalendarClock className="h-4 w-4 text-slate-400" />
                Existing bookings
              </p>
              <ul className="ml-6 list-disc">
                {selectedRoom.bookings.map((b, i) => (
                  <li key={i}>
                    {formatTime(b.start)} – {formatTime(b.end)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Time inputs */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="start" className="mb-2 block text-sm font-semibold text-slate-700">
                Start time
              </label>
              <input
                id="start"
                type="time"
                value={start}
                onChange={(e) => {
                  setStart(e.target.value);
                  setResult(null);
                  explanationGeneration.current.invalidate();
                  clearExplanation();
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="09:00"
              />
            </div>
            <div>
              <label htmlFor="end" className="mb-2 block text-sm font-semibold text-slate-700">
                End time
              </label>
              <input
                id="end"
                type="time"
                value={end}
                onChange={(e) => {
                  setEnd(e.target.value);
                  setResult(null);
                  explanationGeneration.current.invalidate();
                  clearExplanation();
                }}
                className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="10:00"
              />
            </div>
          </div>

          <p className="mb-6 text-xs text-slate-400">
            Times are in 24-hour format. The interval must be within the same day, after the
            current time, and no longer than 2 hours.
          </p>

          {/* Buttons */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="submit"
              disabled={filteredRooms.length === 0}
              className="flex-1 rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Check Availability
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-xl border border-slate-300 px-6 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Clear
            </button>
          </div>
        </form>

        {/* Result */}
        {result && (
          <div
            className={`mt-6 flex items-start gap-4 rounded-2xl border p-5 shadow-sm transition ${
              result.available
                ? 'border-green-200 bg-green-50'
                : 'border-red-200 bg-red-50'
            }`}
          >
              {result.available ? (
                <CheckCircle2 className="h-7 w-7 shrink-0 text-green-600" />
              ) : (
                <XCircle className="h-7 w-7 shrink-0 text-red-600" />
              )}
              <div className="flex-1">
              <p
                className={`text-lg font-bold ${
                  result.available ? 'text-green-700' : 'text-red-700'
                }`}
              >
                {result.available ? 'Available' : 'Unavailable'}
              </p>
              <p
                className={`mt-0.5 text-sm ${
                  result.available ? 'text-green-600' : 'text-red-600'
                }`}
              >
                  {result.available
                    ? 'This room is free for the selected time slot.'
                    : result.reason}
                </p>

                {/* Explain availability */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={handleExplain}
                    disabled={explaining}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                    {explaining ? 'Explaining…' : 'Explain availability'}
                  </button>
                  {explanation && (
                    <div
                      className={`mt-3 rounded-xl border px-4 py-3 text-sm ${
                        result.available
                          ? 'border-green-200 bg-white/70 text-green-900'
                          : 'border-red-200 bg-white/70 text-red-900'
                      }`}
                    >
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        Mock explanation — no real service configured
                      </p>
                      <p>{explanation}</p>
                    </div>
                  )}
                </div>
              </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
