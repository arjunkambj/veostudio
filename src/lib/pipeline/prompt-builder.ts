import type { SegmentPlanItem, VideoModel } from "./types";

export function buildSegmentPrompt(params: {
  segment: SegmentPlanItem;
  imageLabels: string[];
  videoModel: VideoModel;
  generationSystemPrompt: string;
}) {
  const { segment, imageLabels, videoModel, generationSystemPrompt } = params;

  const imageHint =
    imageLabels.length > 0
      ? `Reference identity/style images: ${imageLabels.join(", ")}. Preserve same face identity, hairstyle, outfit tone, and room style.`
      : "No reference image provided. Keep a consistent single UGC creator identity.";

  const qualityHint =
    videoModel === "veo-3.1-fast"
      ? "Prioritize fast generation while keeping realistic face and lip sync."
      : "Prioritize maximum realism, stable facial identity and natural mouth movement.";

  return [
    generationSystemPrompt,
    imageHint,
    qualityHint,
    `Narration line to speak exactly: ${segment.text}`,
    `Target duration around ${segment.targetSeconds} seconds.`,
    `Continuity requirements: ${segment.continuityNotes}`,
  ].join(" ");
}
