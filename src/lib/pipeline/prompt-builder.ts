import type { SegmentPlanItem, VideoModel } from "./types";

const GENERATION_SYSTEM_PROMPT = `Generate a UGC-style vertical video ad clip. One real-looking person speaks directly to camera in a casual setting. Natural lighting, handheld feel, authentic delivery. Lip-sync must match the narration exactly.`;

export function buildSegmentPrompt(params: {
  segment: SegmentPlanItem;
  hasImages: boolean;
  videoModel: VideoModel;
}) {
  const { segment, hasImages, videoModel } = params;

  const imageHint = hasImages
    ? "Preserve same face identity, hairstyle, outfit tone, and room style from the reference image."
    : "Keep a consistent single UGC creator identity.";

  const qualityHint =
    videoModel === "veo-3.1-fast"
      ? "Prioritize fast generation while keeping realistic face and lip sync."
      : "Prioritize maximum realism, stable facial identity and natural mouth movement.";

  return [
    GENERATION_SYSTEM_PROMPT,
    imageHint,
    qualityHint,
    `Narration line to speak exactly: ${segment.text}`,
    `Target duration around ${segment.targetSeconds} seconds.`,
    `Continuity requirements: ${segment.continuityNotes}`,
  ].join(" ");
}
