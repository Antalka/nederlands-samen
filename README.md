# Nederlands Samen — v2 (unified question bank)

A friendly Dutch A1–A2 practice demo with Romanian explanations, three practice modes, local progress, and a placeholder for future multiplayer.

## Local setup

Requires Node.js 20.19+ or 22+. From this directory:

```bash
npm install
npm run dev
npm run build
```

## Structure

- `src/App.tsx`: navigation and application-level state.
- `src/components/Home.tsx`: dashboard and topic selection.
- `src/components/Practice.tsx`: exercise screen.
- `src/data/questions.json`: **the only question bank** (154 entries).
- `src/data/questions.ts`: typed entry point for the question bank; later replace with a database-backed service.
- `src/types/index.ts`: shared TypeScript types.
- `src/services/evaluate.ts`: answer evaluation rules (approximate, not a grammar checker).
- `src/services/storage.ts`: browser-only progress persistence.
- `src/styles/main.scss`: shared styling.

## Adding questions

Append a new object to `src/data/questions.json`, keeping a unique `id`. Use the existing entries as examples. Supported `type`: `choice`, `input`, `order`; `topic`: `negation`, `modal`, `verbs`, `vocab`, `situations`, `order`, `translation`, `general`; `level`: `A1`, `A2`.

## Limitations

The group game is **not implemented**; it is marked “Binnenkort beschikbaar.” Progress is saved only in the current browser, and the text evaluator uses approximate spelling/word overlap heuristics. No Supabase account or paid service is needed for this demo.

## Before publishing

Run `npm run build` locally. The package has been structurally checked, but a full dependency-installed production build could not be verified in the generation environment.
