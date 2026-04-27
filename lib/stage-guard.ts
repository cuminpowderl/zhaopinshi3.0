import { PIPELINE_STAGES, type PipelineStage } from "./pipeline-labels";

export function parsePipelineStage(
  raw: string | null | undefined,
): PipelineStage | undefined {
  if (!raw) return undefined;
  return PIPELINE_STAGES.includes(raw as PipelineStage)
    ? (raw as PipelineStage)
    : undefined;
}
