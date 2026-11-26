# Smart Campus Room Availability Checker

A demo app that checks whether a campus room is free for a requested time slot
against a fixed demo time (09:00), and generates a plain-language explanation of
each verdict. Availability rules live in `src/lib/`, room fixtures in
`src/data/rooms.ts`, and the UI in `src/App.tsx`.

## Setup

Install dependencies exactly as locked in `package-lock.json`:

```
npm ci
```

Start the local development server:

```
npm run dev
```

## Verification

Run and report the results of all four before considering any change done:

```
npx vitest run
npx tsc --noEmit -p tsconfig.app.json
npm run lint
npm run build
```
