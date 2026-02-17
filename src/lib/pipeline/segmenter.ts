import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

import type { SegmentPlanItem, SegmentPlanResult } from "./types";

const SEGMENT_TARGET_SECONDS = 8;
const MIN_WORDS_FOR_LLM = 70;
const WORDS_PER_SECOND = 2.2;

const PLANNING_SYSTEM_PROMPT = `You are a UGC video ad planner. Break ad scripts into 4-8 second speaking segments for vertical mobile reels. Each segment should be a natural phrase boundary. Maintain continuity notes so every segment looks like the same shoot.`;

const segmentsSchema = z.object({
  segments: z.array(
    z.object({
      text: z.string(),
      targetSeconds: z.number().min(4).max(8),
      continuityNotes: z.string(),
    }),
  ),
});

function countWords(text: string) {
  return text.match(/\S+/g)?.length ?? 0;
}

function toSeconds(text: string) {
  const raw = Math.round(countWords(text) / WORDS_PER_SECOND);
  return Math.min(8, Math.max(4, raw));
}

function buildHeuristicSegments(script: string): SegmentPlanItem[] {
  const sentences = script
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const wordsPerSegment = Math.round(SEGMENT_TARGET_SECONDS * WORDS_PER_SECOND);
  const segments: SegmentPlanItem[] = [];
  let current = "";
  let currentWords = 0;

  for (const sentence of sentences) {
    const w = countWords(sentence);
    if (current && currentWords + w > wordsPerSegment + 3) {
      const text = current.trim();
      segments.push({
        index: segments.length + 1,
        text,
        targetSeconds: toSeconds(text),
        continuityNotes:
          segments.length === 0
            ? "Open with direct hook and clear speaking subject."
            : "Maintain same character, wardrobe, camera distance, and room lighting.",
      });
      current = sentence;
      currentWords = w;
      continue;
    }
    current = current ? `${current} ${sentence}` : sentence;
    currentWords += w;
  }

  if (current.trim()) {
    const text = current.trim();
    segments.push({
      index: segments.length + 1,
      text,
      targetSeconds: toSeconds(text),
      continuityNotes:
        segments.length === 0
          ? "Open with direct hook and clear speaking subject."
          : "Preserve identity and delivery continuity from previous segment.",
    });
  }

  if (segments.length === 0) {
    return [
      {
        index: 1,
        text: script.trim(),
        targetSeconds: SEGMENT_TARGET_SECONDS,
        continuityNotes: "Single segment narrative delivery.",
      },
    ];
  }

  return segments;
}

export async function createSegmentPlan(
  script: string,
): Promise<SegmentPlanResult> {
  const trimmed = script.trim();
  if (!trimmed) return { segments: [], source: "heuristic" };

  if (countWords(trimmed) < MIN_WORDS_FOR_LLM) {
    return { segments: buildHeuristicSegments(trimmed), source: "heuristic" };
  }

  try {
    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      system: PLANNING_SYSTEM_PROMPT,
      prompt: `Segment this ad script into coherent 4-8 second speaking segments for a single mobile reel.\n\nScript:\n${trimmed}`,
      schema: segmentsSchema,
      temperature: 0.2,
    });

    const segments: SegmentPlanItem[] = object.segments.map((s, i) => ({
      index: i + 1,
      text: s.text.trim(),
      targetSeconds: Math.min(8, Math.max(4, Math.round(s.targetSeconds))),
      continuityNotes:
        s.continuityNotes.trim() ||
        (i === 0
          ? "Open with the same spokesperson identity."
          : "Keep same spokesperson identity, camera angle and lighting."),
    }));

    return segments.length > 0
      ? { segments, source: "llm" }
      : { segments: buildHeuristicSegments(trimmed), source: "heuristic" };
  } catch {
    return { segments: buildHeuristicSegments(trimmed), source: "heuristic" };
  }
}
