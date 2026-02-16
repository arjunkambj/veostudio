import { ConvexHttpClient } from "convex/browser";
import { makeFunctionReference } from "convex/server";

import type { GenerationStatus, SelectedModels } from "@/lib/pipeline/types";

type LogBase = {
  projectId: string;
  runId: string;
};

function getConvexUrl() {
  return process.env.NEXT_PUBLIC_CONVEX_URL ?? process.env.CONVEX_URL;
}

async function callMutation(
  functionName: string,
  args: Record<string, unknown>,
) {
  const convexUrl = getConvexUrl();
  if (!convexUrl) {
    return;
  }

  const client = new ConvexHttpClient(convexUrl);
  const reference = makeFunctionReference<
    "mutation",
    Record<string, unknown>,
    unknown
  >(functionName);
  try {
    await client.mutation(reference, args);
  } catch (error) {
    console.error("Convex logging mutation failed", functionName, error);
  }
}

export async function logRunCreated(
  payload: LogBase & {
    selectedModels: SelectedModels;
    scriptPreview: string;
    referenceImageCount: number;
  },
) {
  await callMutation("logs:createProjectLog", payload);
}

export async function logRunStatus(
  payload: LogBase & {
    status: GenerationStatus;
    errorMessage?: string;
  },
) {
  await callMutation("logs:setJobState", payload);
}

export async function logRunEvent(
  payload: LogBase & {
    level: "info" | "error";
    stage: string;
    message: string;
    metadata?: Record<string, unknown>;
  },
) {
  await callMutation("logs:appendJobEvent", payload);
}
