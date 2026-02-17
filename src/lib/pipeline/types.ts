export type VideoModel = "veo-3.1-fast" | "veo-3.1";
export type AspectRatio = "9:16" | "16:9";

export type SegmentPlanItem = {
  index: number;
  text: string;
  targetSeconds: number;
  continuityNotes: string;
};

export type SegmentPlanResult = {
  segments: SegmentPlanItem[];
  source: "llm" | "heuristic";
};

export type SegmentArtifact = {
  index: number;
  text: string;
  status: "generated" | "failed";
  clipFileName: string | null;
  downloadUrl: string | null;
  error: string | null;
};

export type RunManifest = {
  projectId: string;
  runId: string;
  videoModel: VideoModel;
  status: "completed" | "failed";
  segments: SegmentArtifact[];
};
