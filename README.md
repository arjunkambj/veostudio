# Veo Studio

Veo Studio is a localhost-first Next.js app for generating UGC-style ad clips for mobile reels.

Current scope is intentionally narrow:
- one workflow (`/veo`)
- script + reference image(s) input
- model selectors for orchestration and generation
- OpenAI orchestrator toggle visible but disabled for now
- clip-only output (no stitched final video yet)
- local filesystem artifacts + Convex generation logs

## Architecture

- App shell + sidebar: `src/app/(studio)/layout.tsx`
- Studio screen: `src/app/(studio)/veo/page.tsx`
- API orchestration:
  - `POST /api/segments/plan`
  - `POST /api/generate`
  - `GET /api/projects/:projectId/runs/:runId`
  - `GET /api/projects/:projectId/runs/:runId/manifest`
- Local storage utilities: `src/lib/storage/local.ts`
- Pipeline modules: `src/lib/pipeline/*`
- Convex logging functions: `convex/logs.ts`

## Local Setup

1. Install dependencies:
```bash
pnpm install
```
2. Run Convex (required for logs):
```bash
pnpm convex:dev
```
3. Run the app:
```bash
pnpm dev
```
4. Open `http://localhost:3000` (redirects to `/veo`).

## Environment Variables

Set in `.env.local`:

```bash
NEXT_PUBLIC_CONVEX_URL=...
CONVEX_DEPLOYMENT=...

# Required for Veo generation requests
GEMINI_API_KEY=...

# Optional overrides
GEMINI_ORCHESTRATOR_MODEL=gemini-2.0-flash
OPENAI_API_KEY=...
OPENAI_ORCHESTRATOR_MODEL=gpt-4.1-mini
VEO_API_BASE_URL=https://generativelanguage.googleapis.com/v1beta
```

## Storage Behavior

Artifacts are saved to:

```text
storage/projects/{projectId}/runs/{runId}/
  inputs/script.txt
  inputs/reference-01.jpg
  segments/segment-01-<hash>.mp4
  manifest.json
```

Duplicate-safe guarantees:
- UUID-based `projectId` and `runId`
- segment filename hash + version suffix fallback (`-v2`, `-v3`)
- atomic temp-file writes before rename

## Validation

Before opening a PR:

```bash
pnpm lint
pnpm build
```
