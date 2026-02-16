import { Buffer } from "node:buffer";

import type { VideoModel } from "./types";

type VeoGenerationResult = {
  clipBuffer: Buffer;
  extension: "mp4";
  durationSec: number;
};

type GeneratedVideo = {
  bytesBase64Encoded?: string;
  uri?: string;
};

type GeneratedVideoPayload = {
  generatedVideos?: Array<{ video?: GeneratedVideo }>;
  response?: {
    generatedVideos?: Array<{ video?: GeneratedVideo }>;
  };
  done?: boolean;
  error?: {
    message?: string;
  };
  name?: string;
};

function modelToEndpointModel(videoModel: VideoModel) {
  if (videoModel === "veo-3.1-fast") {
    return "veo-3.1-fast-generate-preview";
  }

  return "veo-3.1-generate-preview";
}

function decodeBase64OrThrow(base64: string) {
  try {
    return Buffer.from(base64, "base64");
  } catch {
    throw new Error("Unable to decode Veo base64 payload");
  }
}

async function fetchVideoFromUri(uri: string) {
  const response = await fetch(uri);
  if (!response.ok) {
    throw new Error(
      `Failed to download generated clip from URI: ${response.status}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

function pickGeneratedVideo(payload: unknown) {
  const parsed = payload as GeneratedVideoPayload;
  const direct = parsed.generatedVideos?.[0]?.video;
  if (direct) {
    return direct;
  }

  const nested = parsed.response?.generatedVideos?.[0]?.video;
  if (nested) {
    return nested;
  }

  return null;
}

async function pollOperation(params: {
  baseUrl: string;
  operationName: string;
  apiKey: string;
}) {
  const { baseUrl, operationName, apiKey } = params;

  for (let i = 0; i < 90; i += 1) {
    const operationUrl = `${baseUrl}/${operationName}?key=${apiKey}`;
    const response = await fetch(operationUrl);
    if (!response.ok) {
      throw new Error(`Veo operation poll failed: ${response.status}`);
    }

    const payload = await response.json();
    if (payload?.done) {
      if (payload?.error?.message) {
        throw new Error(`Veo generation failed: ${payload.error.message}`);
      }

      return payload;
    }

    await new Promise((resolve) => {
      setTimeout(resolve, 2000);
    });
  }

  throw new Error("Timed out waiting for Veo operation completion");
}

async function generateWithGoogleApi(params: {
  prompt: string;
  videoModel: VideoModel;
  targetSeconds: number;
}) {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing GEMINI_API_KEY/GOOGLE_GENAI_API_KEY for Veo generation",
    );
  }

  const baseUrl =
    process.env.VEO_API_BASE_URL ??
    "https://generativelanguage.googleapis.com/v1beta";
  const modelName = modelToEndpointModel(params.videoModel);
  const endpoint = `${baseUrl}/models/${modelName}:generateVideos?key=${apiKey}`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: params.prompt,
      config: {
        aspectRatio: "9:16",
        durationSeconds: params.targetSeconds,
        generateAudio: true,
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Veo request failed (${response.status}): ${message}`);
  }

  const payload = await response.json();

  const generated = pickGeneratedVideo(payload);
  if (generated) {
    if (generated.bytesBase64Encoded) {
      return decodeBase64OrThrow(generated.bytesBase64Encoded);
    }

    if (generated.uri) {
      return fetchVideoFromUri(generated.uri);
    }
  }

  const operationName = payload?.name;
  if (!operationName || typeof operationName !== "string") {
    throw new Error("Veo response missing generated video and operation name");
  }

  const operationPayload = await pollOperation({
    baseUrl,
    operationName,
    apiKey,
  });
  const asyncGenerated = pickGeneratedVideo(operationPayload);

  if (asyncGenerated?.bytesBase64Encoded) {
    return decodeBase64OrThrow(asyncGenerated.bytesBase64Encoded);
  }

  if (asyncGenerated?.uri) {
    return fetchVideoFromUri(asyncGenerated.uri);
  }

  throw new Error("Veo operation completed without video payload");
}

export async function generateVeoClip(params: {
  prompt: string;
  videoModel: VideoModel;
  targetSeconds: number;
}): Promise<VeoGenerationResult> {
  const durationSec = Math.max(
    7,
    Math.min(10, Math.round(params.targetSeconds)),
  );

  const clipBuffer = await generateWithGoogleApi({
    prompt: params.prompt,
    videoModel: params.videoModel,
    targetSeconds: durationSec,
  });

  return {
    clipBuffer,
    extension: "mp4",
    durationSec,
  };
}
