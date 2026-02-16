import path from "node:path";

import { logRunCreated, logRunEvent, logRunStatus } from "@/lib/convex/logger";
import {
  getRunInputsPath,
  getRunManifestPath,
  getRunSegmentsPath,
  hashForSegment,
  readJsonFile,
  toRelativeWorkspacePath,
  writeBufferCollisionSafe,
  writeJsonAtomic,
  writeTextAtomic,
} from "@/lib/storage/local";

import { buildSegmentPrompt } from "./prompt-builder";
import { createSegmentPlan } from "./segmenter";
import type {
  GenerationInput,
  RunManifest,
  SegmentArtifact,
  SegmentPlanItem,
} from "./types";
import { generateVeoClip } from "./veo";

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function runWorker() {
    while (nextIndex < items.length) {
      const current = nextIndex;
      nextIndex += 1;
      results[current] = await worker(items[current], current);
    }
  }

  const workers = Array.from(
    { length: Math.max(1, Math.min(limit, items.length)) },
    () => runWorker(),
  );

  await Promise.all(workers);
  return results;
}

export async function saveScript(params: {
  projectId: string;
  runId: string;
  script: string;
}) {
  const scriptPath = path.join(
    getRunInputsPath(params.projectId, params.runId),
    "script.txt",
  );
  await writeTextAtomic(scriptPath, `${params.script.trim()}\n`);
  return scriptPath;
}

export async function saveImageFiles(params: {
  projectId: string;
  runId: string;
  files: File[];
}) {
  const outputs: string[] = [];
  const inputsPath = getRunInputsPath(params.projectId, params.runId);

  for (let i = 0; i < params.files.length; i += 1) {
    const file = params.files[i];
    const ext = file.type.includes("png") ? "png" : "jpg";
    const bytes = Buffer.from(await file.arrayBuffer());
    const baseName = `reference-${String(i + 1).padStart(2, "0")}`;
    const saved = await writeBufferCollisionSafe({
      dir: inputsPath,
      baseName,
      extension: ext,
      buffer: bytes,
    });

    outputs.push(saved.filePath);
  }

  return outputs;
}

function toInitialArtifact(segment: SegmentPlanItem): SegmentArtifact {
  return {
    index: segment.index,
    text: segment.text,
    targetSeconds: segment.targetSeconds,
    continuityNotes: segment.continuityNotes,
    prompt: segment.prompt,
    status: "pending",
    clipPath: null,
    clipFileName: null,
    downloadUrl: null,
    durationSec: null,
    error: null,
  };
}

function manifestCounts(segments: SegmentArtifact[]) {
  const successfulSegments = segments.filter(
    (segment) => segment.status === "generated",
  ).length;
  const failedSegments = segments.filter(
    (segment) => segment.status === "failed",
  ).length;

  return {
    successfulSegments,
    failedSegments,
  };
}

export async function runClipGeneration(params: {
  projectId: string;
  runId: string;
  input: GenerationInput;
  scriptPath: string;
}) {
  const { projectId, runId, input, scriptPath } = params;

  await logRunCreated({
    projectId,
    runId,
    selectedModels: {
      orchestratorModel: input.orchestratorModel,
      videoModel: input.videoModel,
    },
    scriptPreview: input.script.slice(0, 180),
    referenceImageCount: input.imagePaths.length,
  });

  await logRunStatus({ projectId, runId, status: "planning" });
  await logRunEvent({
    projectId,
    runId,
    level: "info",
    stage: "planning",
    message: "Building segment plan",
  });

  const planResult = await createSegmentPlan({
    script: input.script,
    orchestratorModel: input.orchestratorModel,
  });

  const segments = planResult.segments.map((segment) => ({
    ...segment,
    prompt: buildSegmentPrompt({
      segment,
      imageLabels: input.imagePaths.map((filePath) => path.basename(filePath)),
      videoModel: input.videoModel,
    }),
  }));

  const artifacts = segments.map(toInitialArtifact);

  let manifest: RunManifest = {
    projectId,
    runId,
    createdAt: new Date().toISOString(),
    scriptPath: toRelativeWorkspacePath(scriptPath),
    referenceImages: input.imagePaths.map(toRelativeWorkspacePath),
    status: "generating",
    selectedModels: {
      orchestratorModel: input.orchestratorModel,
      videoModel: input.videoModel,
    },
    segments: artifacts,
    totalSegments: artifacts.length,
    successfulSegments: 0,
    failedSegments: 0,
  };

  const manifestPath = getRunManifestPath(projectId, runId);
  await writeJsonAtomic(manifestPath, manifest);

  await logRunStatus({ projectId, runId, status: "generating" });
  await logRunEvent({
    projectId,
    runId,
    level: "info",
    stage: "planning",
    message: "Segment plan finalized",
    metadata: {
      source: planResult.source,
      totalSegments: artifacts.length,
    },
  });

  const segmentsDir = getRunSegmentsPath(projectId, runId);

  const generatedArtifacts = await mapWithConcurrency(
    segments,
    2,
    async (segment, index) => {
      try {
        await logRunEvent({
          projectId,
          runId,
          level: "info",
          stage: "generation",
          message: `Generating segment ${segment.index}`,
        });

        const result = await generateVeoClip({
          prompt: segment.prompt,
          videoModel: input.videoModel,
          targetSeconds: segment.targetSeconds,
        });

        const baseName = `segment-${String(segment.index).padStart(2, "0")}-${hashForSegment(segment.prompt)}`;
        const saved = await writeBufferCollisionSafe({
          dir: segmentsDir,
          baseName,
          extension: result.extension,
          buffer: result.clipBuffer,
        });

        const clipPath = saved.filePath;
        const clipFileName = saved.fileName;

        return {
          ...artifacts[index],
          status: "generated",
          clipPath: toRelativeWorkspacePath(clipPath),
          clipFileName,
          downloadUrl: `/api/projects/${projectId}/runs/${runId}/clips/${encodeURIComponent(clipFileName)}`,
          durationSec: result.durationSec,
          error: null,
        } satisfies SegmentArtifact;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown generation error";

        await logRunEvent({
          projectId,
          runId,
          level: "error",
          stage: "generation",
          message: `Segment ${segment.index} failed`,
          metadata: { error: errorMessage },
        });

        return {
          ...artifacts[index],
          status: "failed",
          error: errorMessage,
          clipPath: null,
          clipFileName: null,
          downloadUrl: null,
          durationSec: null,
        } satisfies SegmentArtifact;
      }
    },
  );

  const counts = manifestCounts(generatedArtifacts);
  const finalStatus = counts.failedSegments > 0 ? "failed" : "completed";

  manifest = {
    ...manifest,
    status: finalStatus,
    segments: generatedArtifacts,
    successfulSegments: counts.successfulSegments,
    failedSegments: counts.failedSegments,
  };

  await writeJsonAtomic(manifestPath, manifest);
  await logRunStatus({
    projectId,
    runId,
    status: finalStatus,
    errorMessage:
      finalStatus === "failed"
        ? "One or more segments failed. See generation events."
        : undefined,
  });

  await logRunEvent({
    projectId,
    runId,
    level: "info",
    stage: "complete",
    message: "Generation run finished",
    metadata: {
      finalStatus,
      successfulSegments: counts.successfulSegments,
      failedSegments: counts.failedSegments,
    },
  });

  return manifest;
}

export async function loadManifest(projectId: string, runId: string) {
  return readJsonFile<RunManifest>(getRunManifestPath(projectId, runId));
}
