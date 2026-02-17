# Repository Guidelines

## Project Structure & Module Organization
The app is a Next.js App Router project focused on a single studio flow.
- `src/app/(studio)/layout.tsx`: shared sidebar shell (future tools plug in here)
- `src/app/(studio)/veo/page.tsx`: current Veo Studio UI
- `src/app/api/*`: orchestration APIs for planning, generation, run status, and clip access
- `src/lib/pipeline/*`: script segmentation, prompt building, generation pipeline
- `src/lib/storage/local.ts`: local artifact storage and collision-safe writes
- `convex/*`: logging schema and functions (`convex/logs.ts`, `convex/schema.ts`)

Keep all new video tools behind the existing sidebar layout instead of creating standalone app roots.

## Build, Test, and Development Commands
- `bun dev`: run local Next.js app (`/veo`)
- `bun convex:dev`: run Convex functions for generation logs
- `bun build`: production compile
- `bun lint`: Biome static checks
- `bun format`: auto-format with Biome

Always run `bun lint` and `bun build` before PRs.

## Coding Style & Naming Conventions
- Biome rules apply (`biome.json`): 2-space indentation, organized imports.
- Route names follow App Router conventions (`page.tsx`, `layout.tsx`, `route.ts`).
- Use descriptive module names (`segmenter.ts`, `run-generation.ts`).
- Keep model selector values stable and typed:
  - Orchestrator: `gemini | openai` (OpenAI currently disabled in UI and API)
  - Video: `veo-3.1-fast | veo-3.1`

## Pipeline & Storage Rules (Critical)
- Media artifacts must stay on local filesystem (`storage/`), not Convex.
- Convex is logging-only for runs/events/status.
- Never trust user filenames; always sanitize and generate IDs.
- Required path pattern:
  - `storage/projects/{projectId}/runs/{runId}/segments/{index}-{hash}.mp4`
- Use atomic temp-write then rename. On collision, append `-v2`, `-v3`, etc.

## Commit & Pull Request Guidelines
Use concise imperative commit subjects (example: `feat: add veo clip manifest endpoint`).
PRs should include:
- workflow impact summary
- API or type changes
- validation steps run locally
- UI screenshot for `/veo` changes

## Security & Configuration Tips
- Keep secrets in `.env.local`; never commit keys.
- Confirm required runtime vars before generation (`GEMINI_API_KEY`, Convex URL/deployment).
- Do not commit generated artifacts (`storage/`, `.next/`, `node_modules/`).
