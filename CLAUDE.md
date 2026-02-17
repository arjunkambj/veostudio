# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
bun dev              # Next.js dev server (http://localhost:3000, redirects to /veo)
bun build            # Production build
bun lint             # Biome check (biome check)
bun format           # Biome auto-format (biome format --write)
```

Run `bun lint` and `bun build` before PRs. No test framework is configured.

## Architecture

Veo Studio is a localhost-first Next.js 16 (App Router) application for generating UGC-style vertical video ad clips using Google's Veo 3.1 model via fal.ai. It uses React 19, HeroUI components, Tailwind CSS 4, and the React Compiler.

### Core Pipeline Flow

1. **Script input** → user enters script + optional reference images + aspect ratio on `/veo`
2. **Segment planning** (`POST /api/segments/plan`) → AI SDK `generateObject` with Gemini 2.0 Flash (falls back to heuristic if <70 words or API fails)
3. **Clip generation** (`POST /api/generate`) → creates projectId/runId inline, uploads images to fal.ai storage, calls fal.ai Veo endpoints per segment (text-to-video or image-to-video), saves MP4 clips
4. **Retrieval** → clips served via `GET /api/projects/{projectId}/runs/{runId}/clips/{clipFile}`

### Key Directories

- `src/app/(studio)/` — Route group with shared sidebar layout; `/veo` is the main (and only) studio page
- `src/app/api/` — API routes for planning, generation, and clip download
- `src/lib/pipeline/` — Core pipeline modules: `segmenter.ts`, `prompt-builder.ts`, `veo.ts`, `run-generation.ts`, `types.ts`
- `src/lib/storage/local.ts` — Local filesystem storage helpers (project/run IDs, segment paths)

### Storage Rules

All media artifacts live on local filesystem under `storage/projects/{projectId}/runs/{runId}/segments/`.

### Model Types

- Video: `"veo-3.1-fast" | "veo-3.1"` (routed through fal.ai)
- Aspect ratio: `"9:16" | "16:9"`

## Code Style

- Biome enforces all linting/formatting: 2-space indentation, organized imports, Next.js + React recommended rules
- New video tools should be added behind the existing `(studio)` sidebar layout, not as standalone app roots
- Commit messages: concise imperative subjects (e.g., `feat: add veo clip manifest endpoint`)

## Environment

Required in `.env.local`:
- `GOOGLE_GENERATIVE_AI_API_KEY` — for AI SDK (Gemini planning)
- `FAL_KEY` — for fal.ai (Veo generation)
