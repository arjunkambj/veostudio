export type OrchestratorModel = "gemini" | "openai";

export type VideoModel = "veo-3.1-fast" | "veo-3.1";

export type SegmentStatus = "pending" | "generated" | "failed";

export type GenerationStatus =
  | "queued"
  | "planning"
  | "generating"
  | "completed"
  | "failed";

export type SegmentPlanItem = {
  index: number;
  text: string;
  targetSeconds: number;
  continuityNotes: string;
  prompt: string;
};

export type SegmentArtifact = {
  index: number;
  text: string;
  targetSeconds: number;
  continuityNotes: string;
  prompt: string;
  status: SegmentStatus;
  clipPath: string | null;
  clipFileName: string | null;
  downloadUrl: string | null;
  durationSec: number | null;
  error: string | null;
};

export type SelectedModels = {
  orchestratorModel: OrchestratorModel;
  videoModel: VideoModel;
};

export type RunManifest = {
  projectId: string;
  runId: string;
  createdAt: string;
  scriptPath: string;
  referenceImages: string[];
  status: GenerationStatus;
  selectedModels: SelectedModels;
  segments: SegmentArtifact[];
  totalSegments: number;
  successfulSegments: number;
  failedSegments: number;
};

export type SegmentPlanResult = {
  segments: SegmentPlanItem[];
  source: "llm" | "heuristic";
};

export type GenerationInput = {
  script: string;
  orchestratorModel: OrchestratorModel;
  videoModel: VideoModel;
  imagePaths: string[];
  projectId?: string;
};
