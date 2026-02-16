import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

const CONFIG_FILE_PATH = path.join(
  process.cwd(),
  "config",
  "system-prompts.json",
);
const MAX_PROMPT_LENGTH = 20_000;

export type SystemPromptsConfig = {
  planningSystemPrompt: string;
  generationSystemPrompt: string;
};

export const DEFAULT_SYSTEM_PROMPTS: SystemPromptsConfig = {
  planningSystemPrompt:
    "You are a precise video segmentation planner for short vertical ads. Segment the script into coherent spoken chunks that feel natural for one mobile reel. Keep each segment between 7 and 10 seconds, preserve narrative flow, and include continuity notes that keep the same spokesperson identity, framing, and lighting across segments. Output only strict JSON matching the requested schema.",
  generationSystemPrompt:
    "Create one vertical UGC talking-head ad clip for a Meta reel. Output format must be 9:16 portrait with smartphone-style framing and chest-up composition. Keep a single speaker addressing camera with natural handheld feel and soft indoor lighting. Preserve realistic facial identity and natural lip sync. Avoid jump cuts, face changes, and burned-in subtitles.",
};

type PromptKey = keyof SystemPromptsConfig;

function parsePrompt(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_PROMPT_LENGTH) {
    return null;
  }

  return trimmed;
}

function parseConfig(value: unknown): SystemPromptsConfig | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const raw = value as Partial<Record<PromptKey, unknown>>;
  const planningSystemPrompt = parsePrompt(raw.planningSystemPrompt);
  const generationSystemPrompt = parsePrompt(raw.generationSystemPrompt);

  if (!planningSystemPrompt || !generationSystemPrompt) {
    return null;
  }

  return {
    planningSystemPrompt,
    generationSystemPrompt,
  };
}

async function writeJsonAtomic(filePath: string, data: unknown) {
  const tmpPath = `${filePath}.tmp-${randomUUID()}`;
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmpPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
  await fs.rename(tmpPath, filePath);
}

export async function getSystemPrompts(): Promise<SystemPromptsConfig> {
  try {
    const raw = await fs.readFile(CONFIG_FILE_PATH, "utf8");
    const parsed = parseConfig(JSON.parse(raw));
    return parsed ?? DEFAULT_SYSTEM_PROMPTS;
  } catch {
    return DEFAULT_SYSTEM_PROMPTS;
  }
}

export async function saveSystemPrompts(
  value: unknown,
): Promise<SystemPromptsConfig> {
  const parsed = parseConfig(value);
  if (!parsed) {
    throw new Error(
      "Invalid prompt configuration. Provide non-empty planningSystemPrompt and generationSystemPrompt strings.",
    );
  }

  await writeJsonAtomic(CONFIG_FILE_PATH, parsed);
  return parsed;
}
