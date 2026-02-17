import { fal } from "@fal-ai/client";

import type { AspectRatio, VideoModel } from "./types";

type Duration = "4s" | "6s" | "8s";

function mapDuration(seconds: number): Duration {
  if (seconds <= 5) return "4s";
  if (seconds <= 7) return "6s";
  return "8s";
}

export async function generateVeoClip(params: {
  prompt: string;
  videoModel: VideoModel;
  targetSeconds: number;
  aspectRatio: AspectRatio;
  imageUrl?: string;
}): Promise<Buffer> {
  const duration = mapDuration(params.targetSeconds);
  const base = {
    prompt: params.prompt,
    aspect_ratio: params.aspectRatio,
    duration,
    generate_audio: true,
  };

  let videoUrl: string;

  if (params.imageUrl) {
    const input = { ...base, image_url: params.imageUrl };
    const endpointId =
      params.videoModel === "veo-3.1-fast"
        ? ("fal-ai/veo3.1/fast/image-to-video" as const)
        : ("fal-ai/veo3.1/image-to-video" as const);
    const result = await fal.subscribe(endpointId, { input });
    videoUrl = result.data.video.url;
  } else {
    const endpointId =
      params.videoModel === "veo-3.1-fast"
        ? ("fal-ai/veo3.1/fast" as const)
        : ("fal-ai/veo3.1" as const);
    const result = await fal.subscribe(endpointId, { input: base });
    videoUrl = result.data.video.url;
  }

  const res = await fetch(videoUrl);
  return Buffer.from(await res.arrayBuffer());
}
