# Project

Smart Campus Room Availability Checker. The app checks fictional room availability using a fixed demo time, and generates a plain-language explanation of each availability verdict.

# Project structure
- `src/lib/availability.ts` contains the availability rules.
- `src/lib/parseAndCheck.ts` contains the time-parsing and availability-check helper.
- `src/lib/roomFilters.ts` contains room-filtering logic.
- `src/lib/explanation.ts` contains explanation request validation, the mock explanation adapter with fault simulation, the fallback explanation builder, and the generation guard that ignores stale async completions after inputs change.
- `src/data/rooms.ts` contains the room fixtures.
- `src/App.tsx` contains the user interface.
- `src/lib/availability.test.ts` tests availability behavior.
- `src/lib/parseAndCheck.test.ts` tests the parse-and-check helper.
- `src/lib/roomFilters.test.ts` tests room-filter behavior.
- `src/lib/explanation.test.ts` tests explanation validation, the mock adapter, the fallback builder, and validation parity with the availability check.
- `src/lib/explanationGeneration.test.ts` tests the generation guard that ignores stale async completions.

# Setup

Dependencies are locked in `package-lock.json` (lockfileVersion 3). Direct dependencies:
- Runtime: `@supabase/supabase-js` ^2.57.4, `lucide-react` ^0.446.0, `react` ^18.3.1, `react-dom` ^18.3.1
- Dev: `typescript` ^5.5.3, `vite` ^5.4.2, `vitest` ^2.1.9, `eslint` ^9.9.1 with `@eslint/js`, `typescript-eslint` ^8.3.0, `eslint-plugin-react-hooks` ^5.1.0-rc.0, `eslint-plugin-react-refresh` ^0.4.11, `@vitejs/plugin-react` ^4.3.1, `tailwindcss` ^3.4.1, `postcss` ^8.4.35, `autoprefixer` ^10.4.18, `globals` ^15.9.0, `@types/react` ^18.3.5, `@types/react-dom` ^18.3.0

Install with `npm install` (or `npm ci` for a clean lockfile-exact install). Do not upgrade, add, or remove packages without approval.
Start the local development server with `npm run dev`.

# Coding conventions
- TypeScript with strict typing; annotate function parameters and return types explicitly.
- React 18 function components with hooks only; no class components.
- Style with Tailwind CSS classes; icons from `lucide-react`.
- Import project modules with the `@/` alias (maps to `src/`), not deep relative paths.
- Keep library code in `src/lib/` with a matching colocated test file (`<module>.test.ts`) using Vitest and plain `describe`/`it`/`expect`.
- Keep changes minimal and matched to the style of neighboring code; no comments unless a non-obvious constraint requires one.

# Test expectations
- All tests must pass: `npx vitest run` currently reports 5 files and 69 tests.
- New behavior needs a colocated regression test before it is accepted.
- Do not weaken, skip, or delete existing tests to make a change pass.
- Validation rules and the UI must stay consistent: explanation requests are validated against the room fixtures, and stale async results are never rendered.

# Safety rules
- Never expose secrets, API keys, tokens, or `.env` values in code, logs, diffs, or documentation.
- Do not deploy to production or publish the app to a host.
- Never run destructive commands (deleting files, dropping data, force-writes, removing dependencies).
- Do not add, upgrade, or remove dependencies without explicit review of the change.
- Every proposed diff requires human review before it is accepted; do not treat an unreviewed change as done.

# Acceptance criteria
- AC1: Reject non-finite or out-of-range times, invalid intervals where start is greater than or equal to end, and requests that start at or before the current demo time.
- AC2: Reject requests longer than 120 minutes; allow exactly 120 minutes.
- AC3: Reject rooms marked as blocked.
- AC4: Reject overlapping bookings; allow intervals that only touch at endpoints.
- AC5: Checking availability must not change room or booking data.
- AC6: Preserve clear feedback and a usable layout on desktop and mobile.

# Constraints
- Make the smallest justified changes.
- Preserve the current UI, room fixtures, and filtering behavior.
- Do not add login, a backend, a database, an API, or booking creation.
- Do not mutate fixture or booking data during availability checks.
- Do not add design patterns without a concrete reason.
- Do not weaken or remove existing tests.

# Verification
Run and report the exact results of:
- `npx vitest run`
- `npx tsc --noEmit -p tsconfig.app.json`
- `npm run lint`
- `npm run build`

Report every changed file and every remaining failure accurately. Do not claim that these instructions were automatically loaded; read this file explicitly when asked.
