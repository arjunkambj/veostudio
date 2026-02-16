import { getSystemPrompts } from "../config/system-prompts";
import type {
  OrchestratorModel,
  SegmentPlanItem,
  SegmentPlanResult,
} from "./types";

const SEGMENT_TARGET_SECONDS = 8;
const SEGMENT_MIN_SECONDS = 7;
const SEGMENT_MAX_SECONDS = 10;
const MIN_WORDS_FOR_LLM_SEGMENTER = 70;
const WORDS_PER_SECOND = 2.2;

function countWords(text: string) {
  const words = text.match(/\S+/g);
  return words ? words.length : 0;
}

function splitSentences(script: string) {
  const parts = script
    .split(/(?<=[.!?])\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length > 0) {
    return parts;
  }

  return [script.trim()].filter(Boolean);
}

function toSecondsByWords(text: string) {
  const words = countWords(text);
  const seconds = Math.round(words / WORDS_PER_SECOND);
  return Math.min(SEGMENT_MAX_SECONDS, Math.max(SEGMENT_MIN_SECONDS, seconds));
}

function buildHeuristicSegments(script: string): SegmentPlanItem[] {
  const sentences = splitSentences(script);
  const wordsPerSegment = Math.round(SEGMENT_TARGET_SECONDS * WORDS_PER_SECOND);

  const segments: SegmentPlanItem[] = [];
  let current = "";
  let currentWords = 0;

  for (const sentence of sentences) {
    const sentenceWords = countWords(sentence);
    const nextWords = currentWords + sentenceWords;

    if (current && nextWords > wordsPerSegment + 3) {
      const index = segments.length + 1;
      const segmentText = current.trim();
      segments.push({
        index,
        text: segmentText,
        targetSeconds: toSecondsByWords(segmentText),
        continuityNotes:
          index === 1
            ? "Open with direct hook and clear speaking subject."
            : "Maintain same character, wardrobe, camera distance, and room lighting.",
        prompt: "",
      });

      current = sentence;
      currentWords = sentenceWords;
      continue;
    }

    current = current ? `${current} ${sentence}` : sentence;
    currentWords = nextWords;
  }

  if (current.trim()) {
    const index = segments.length + 1;
    const segmentText = current.trim();
    segments.push({
      index,
      text: segmentText,
      targetSeconds: toSecondsByWords(segmentText),
      continuityNotes:
        index === 1
          ? "Open with direct hook and clear speaking subject."
          : "Preserve identity and delivery continuity from previous segment.",
      prompt: "",
    });
  }

  if (segments.length === 0) {
    return [
      {
        index: 1,
        text: script.trim(),
        targetSeconds: SEGMENT_TARGET_SECONDS,
        continuityNotes: "Single segment narrative delivery.",
        prompt: "",
      },
    ];
  }

  return segments;
}

type RawLLMSegment = {
  text?: string;
  targetSeconds?: number;
  continuityNotes?: string;
};

function normalizeLLMSegments(rawSegments: RawLLMSegment[]): SegmentPlanItem[] {
  const normalized = rawSegments
    .map((item, index) => {
      const text = (item.text ?? "").trim();
      if (!text) {
        return null;
      }

      const requested = Number(item.targetSeconds ?? SEGMENT_TARGET_SECONDS);
      return {
        index: index + 1,
        text,
        targetSeconds: Math.min(
          SEGMENT_MAX_SECONDS,
          Math.max(SEGMENT_MIN_SECONDS, Math.round(requested)),
        ),
        continuityNotes:
          item.continuityNotes?.trim() ||
          (index === 0
            ? "Open with the same spokesperson identity from reference image."
            : "Keep same spokesperson identity, camera angle and lighting."),
        prompt: "",
      } satisfies SegmentPlanItem;
    })
    .filter((item): item is SegmentPlanItem => item !== null);

  return normalized.length > 0 ? normalized : [];
}

async function callGeminiSegmenter(
  script: string,
  planningSystemPrompt: string,
): Promise<RawLLMSegment[] | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.GEMINI_ORCHESTRATOR_MODEL ?? "gemini-2.0-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const prompt = [
    `System instructions: ${planningSystemPrompt}`,
    "Segment this ad script into coherent 7-10 second speaking segments.",
    'Return strict JSON with this shape: {"segments":[{"text":string,"targetSeconds":number,"continuityNotes":string}]}',
    "Keep flow natural for a single mobile reel.",
    "Script:",
    script,
  ].join("\n");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== "string") {
    return null;
  }

  const parsed = JSON.parse(text) as { segments?: RawLLMSegment[] };
  return parsed.segments ?? null;
}

async function callOpenAISegmenter(
  script: string,
  planningSystemPrompt: string,
): Promise<RawLLMSegment[] | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }

  const model = process.env.OPENAI_ORCHESTRATOR_MODEL ?? "gpt-4.1-mini";
  const prompt = [
    "Segment this ad script into coherent 7-10 second speaking segments.",
    'Return strict JSON with this shape: {"segments":[{"text":string,"targetSeconds":number,"continuityNotes":string}]}',
    "Keep flow natural for one vertical reel video.",
    "Script:",
    script,
  ].join("\n");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: planningSystemPrompt,
        },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json();
  const text = payload?.choices?.[0]?.message?.content;
  if (!text || typeof text !== "string") {
    return null;
  }

  const parsed = JSON.parse(text) as { segments?: RawLLMSegment[] };
  return parsed.segments ?? null;
}

async function callLLMSegmenter(
  script: string,
  orchestratorModel: OrchestratorModel,
  planningSystemPrompt: string,
): Promise<RawLLMSegment[] | null> {
  if (orchestratorModel === "openai") {
    return callOpenAISegmenter(script, planningSystemPrompt);
  }

  return callGeminiSegmenter(script, planningSystemPrompt);
}

export async function createSegmentPlan(params: {
  script: string;
  orchestratorModel: OrchestratorModel;
}): Promise<SegmentPlanResult> {
  const script = params.script.trim();
  if (!script) {
    return { segments: [], source: "heuristic" };
  }

  const totalWords = countWords(script);
  if (totalWords < MIN_WORDS_FOR_LLM_SEGMENTER) {
    return { segments: buildHeuristicSegments(script), source: "heuristic" };
  }

  try {
    const { planningSystemPrompt } = await getSystemPrompts();
    const llmSegments = await callLLMSegmenter(
      script,
      params.orchestratorModel,
      planningSystemPrompt,
    );
    if (!llmSegments || llmSegments.length === 0) {
      return { segments: buildHeuristicSegments(script), source: "heuristic" };
    }

    const normalized = normalizeLLMSegments(llmSegments);
    if (normalized.length === 0) {
      return { segments: buildHeuristicSegments(script), source: "heuristic" };
    }

    return { segments: normalized, source: "llm" };
  } catch {
    return { segments: buildHeuristicSegments(script), source: "heuristic" };
  }
}
