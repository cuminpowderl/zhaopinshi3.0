export type PipelineStage =
  | "RESUME_FIRST"
  | "PHONE"
  | "ONLINE_TEST"
  | "WRITTEN_EXAM"
  | "FIRST_INTERVIEW"
  | "SECOND_INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "TALENT_POOL";

export const PIPELINE_STAGES: PipelineStage[] = [
  "RESUME_FIRST",
  "PHONE",
  "ONLINE_TEST",
  "WRITTEN_EXAM",
  "FIRST_INTERVIEW",
  "SECOND_INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "TALENT_POOL",
];

/** Agent / 人工分流里可选的阶段（不含已入职） */
export const AGENT_STAGE_OPTIONS: PipelineStage[] = [
  "RESUME_FIRST",
  "PHONE",
  "ONLINE_TEST",
  "WRITTEN_EXAM",
  "FIRST_INTERVIEW",
  "SECOND_INTERVIEW",
  "OFFER",
  "REJECTED",
  "TALENT_POOL",
];

/** Agent / 人工可设为「通过后进入」的阶段 */
export const STAGE_PASS_TARGETS: PipelineStage[] = PIPELINE_STAGES.filter(
  (s) => s !== "REJECTED" && s !== "TALENT_POOL",
);

export const STAGE_LABEL: Record<PipelineStage, string> = {
  RESUME_FIRST: "简历初筛",
  PHONE: "电话沟通",
  ONLINE_TEST: "测试",
  WRITTEN_EXAM: "笔试",
  FIRST_INTERVIEW: "初试",
  SECOND_INTERVIEW: "复试",
  OFFER: "offer发放",
  HIRED: "入职",
  REJECTED: "未通过",
  TALENT_POOL: "人才库",
};
