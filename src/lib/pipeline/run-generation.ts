import { promises as fs } from "node:fs";
import path from "node:path";

import { fal } from "@fal-ai/client";

import { getRunSegmentsPath } from "@/lib/storage/local";

import { buildSegmentPrompt } from "./prompt-builder";
import { createSegmentPlan } from "./segmenter";
import type {
  AspectRatio,
  RunManifest,
  SegmentArtifact,
  VideoModel,
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

  await Promise.all(
    Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, () =>
      runWorker(),
    ),
  );
  return results;
}

async function uploadImagesToFal(files: File[]): Promise<string[]> {
  const urls: string[] = [];
  for (const file of files) {
    const url = await fal.storage.upload(file);
    urls.push(url);
  }
  return urls;
}

export async function runClipGeneration(params: {
  projectId: string;
  runId: string;
  script: string;
  videoModel: VideoModel;
  aspectRatio: AspectRatio;
  imageFiles: File[];
}) {
  const { projectId, runId, script, videoModel, aspectRatio, imageFiles } =
    params;

  console.log(`[run:${runId}] Building segment plan`);
  const planResult = await createSegmentPlan(script);

  const imageUrls =
    imageFiles.length > 0 ? await uploadImagesToFal(imageFiles) : [];
  const firstImageUrl = imageUrls[0] ?? undefined;

  const segments = planResult.segments.map((segment) => ({
    ...segment,
    prompt: buildSegmentPrompt({
      segment,
      hasImages: imageUrls.length > 0,
      videoModel,
    }),
  }));

  console.log(
    `[run:${runId}] Plan ready (source=${planResult.source}, segments=${segments.length})`,
  );

  const segmentsDir = getRunSegmentsPath(projectId, runId);
  await fs.mkdir(segmentsDir, { recursive: true });

  const artifacts = await mapWithConcurrency(segments, 2, async (segment) => {
    try {
      console.log(`[run:${runId}] Generating segment ${segment.index}`);

      const clipBuffer = await generateVeoClip({
        prompt: segment.prompt,
        videoModel,
        targetSeconds: segment.targetSeconds,
        aspectRatio,
        imageUrl: firstImageUrl,
      });

      const clipFileName = `segment-${String(segment.index).padStart(2, "0")}.mp4`;
      await fs.writeFile(path.join(segmentsDir, clipFileName), clipBuffer);

      return {
        index: segment.index,
        text: segment.text,
        status: "generated",
        clipFileName,
        downloadUrl: `/api/projects/${projectId}/runs/${runId}/clips/${clipFileName}`,
        error: null,
      } satisfies SegmentArtifact;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Unknown generation error";
      console.error(`[run:${runId}] Segment ${segment.index} failed: ${msg}`);

      return {
        index: segment.index,
        text: segment.text,
        status: "failed",
        clipFileName: null,
        downloadUrl: null,
        error: msg,
      } satisfies SegmentArtifact;
    }
  });

  const hasFailed = artifacts.some((a) => a.status === "failed");

  const manifest: RunManifest = {
    projectId,
    runId,
    videoModel,
    status: hasFailed ? "failed" : "completed",
    segments: artifacts,
  };

  console.log(`[run:${runId}] Generation finished (status=${manifest.status})`);
  return manifest;
}
