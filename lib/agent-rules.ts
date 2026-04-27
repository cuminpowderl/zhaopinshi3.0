import {
  applyNameToMailBody,
  MAIL_DEFAULTS,
  parseEmailNotify,
  type AgentEmailNotify,
} from "./agent-mail-templates";
import { AGENT_STAGE_OPTIONS, PIPELINE_STAGES, type PipelineStage } from "./pipeline-labels";

export type { AgentEmailNotify } from "./agent-mail-templates";

/** Agent 简历条件里是否启用各项（与「筛选字段设置」里字段是否展示无关） */
export type ResumeRuleUse = {
  education: boolean;
  city: boolean;
  years: boolean;
  salary: boolean;
};

export const DEFAULT_RESUME_USE: ResumeRuleUse = {
  education: true,
  city: true,
  years: true,
  salary: true,
};

export type AgentRules = {
  educations: string[];
  cities: string[];
  yearsMin: number | null;
  yearsMax: number | null;
  salaryMinK: number | null;
  salaryMaxK: number | null;
  /** 简历条件里的测评最低分；性格所用 key 见 personalityAssessmentKey，不计入简历最低分 */
  assessmentMins: Record<string, number>;

  /** 为 undefined 时：自动采用「assessmentMins 里除性格 key 外的全部 key」 */
  resumeAssessmentMinKeys: string[] | undefined;

  /** 是否把学历白名单/城市/年限/期望薪资纳入简历条件 */
  resumeUse: ResumeRuleUse;

  /** Agent 扫描的候选人阶段（多选） */
  targetStages: PipelineStage[];
  /** 在这些阶段做「学历/年限/城市/薪资 + 通用测评」筛选 */
  resumeRuleStages: PipelineStage[];
  /** 通过后进入的阶段 */
  resumePassStage: PipelineStage;
  /** 在这些阶段仅做「性格测试」门槛（与笔试/面试分离） */
  personalityStages: PipelineStage[];
  /** 用作性格区间判断的测评 key（在筛选助手中从已有测评里选一项） */
  personalityAssessmentKey: string;
  /** 性格分下限（含）；null 表示不限制 */
  personalityMinScore: number | null;
  /** 性格分上限（含）；null 表示不限制 */
  personalityMaxScore: number | null;
  /** 性格测试通过后进入 */
  personalityPassStage: PipelineStage;

  /** Agent 自动通知邮件（未配置则用内置文案） */
  emailNotify?: AgentEmailNotify;
};

export const DEFAULT_AGENT_RULES: AgentRules = {
  educations: [],
  cities: [],
  yearsMin: null,
  yearsMax: null,
  salaryMinK: null,
  salaryMaxK: null,
  assessmentMins: {},
  resumeAssessmentMinKeys: undefined,
  resumeUse: { ...DEFAULT_RESUME_USE },
  targetStages: ["RESUME_FIRST", "ONLINE_TEST"],
  resumeRuleStages: ["RESUME_FIRST"],
  resumePassStage: "PHONE",
  personalityStages: ["ONLINE_TEST"],
  personalityAssessmentKey: "personality",
  personalityMinScore: 60,
  personalityMaxScore: null,
  personalityPassStage: "WRITTEN_EXAM",
  emailNotify: undefined,
};

function isStage(x: string): x is PipelineStage {
  return PIPELINE_STAGES.includes(x as PipelineStage);
}

function parseStageArray(raw: unknown, fallback: PipelineStage[]): PipelineStage[] {
  if (!Array.isArray(raw)) return fallback;
  const out = raw.filter((x) => typeof x === "string" && isStage(x)) as PipelineStage[];
  return out.length ? out : fallback;
}

export function parseRulesJson(raw: string | null | undefined): AgentRules {
  const base = { ...DEFAULT_AGENT_RULES, assessmentMins: {} as Record<string, number> };
  if (!raw?.trim()) return base;
  try {
    const j = JSON.parse(raw) as Partial<AgentRules>;
    const assessmentMins =
      j.assessmentMins && typeof j.assessmentMins === "object"
        ? Object.fromEntries(
            Object.entries(j.assessmentMins).map(([k, v]) => [k, Number(v)]),
          )
        : {};

    const targetStages = parseStageArray(
      j.targetStages,
      DEFAULT_AGENT_RULES.targetStages,
    ).filter((s) => AGENT_STAGE_OPTIONS.includes(s));

    const resumeRuleStages = parseStageArray(
      j.resumeRuleStages,
      DEFAULT_AGENT_RULES.resumeRuleStages,
    ).filter((s) => AGENT_STAGE_OPTIONS.includes(s));

    const personalityStages = parseStageArray(
      j.personalityStages,
      DEFAULT_AGENT_RULES.personalityStages,
    ).filter((s) => AGENT_STAGE_OPTIONS.includes(s));

    const resumePassStage =
      typeof j.resumePassStage === "string" && isStage(j.resumePassStage)
        ? (j.resumePassStage as PipelineStage)
        : DEFAULT_AGENT_RULES.resumePassStage;

    const personalityPassStage =
      typeof j.personalityPassStage === "string" && isStage(j.personalityPassStage)
        ? (j.personalityPassStage as PipelineStage)
        : DEFAULT_AGENT_RULES.personalityPassStage;

    const personalityAssessmentKey =
      typeof j.personalityAssessmentKey === "string" && j.personalityAssessmentKey.trim()
        ? j.personalityAssessmentKey.trim()
        : DEFAULT_AGENT_RULES.personalityAssessmentKey;

    const personalityMinScore =
      j.personalityMinScore === null
        ? null
        : typeof j.personalityMinScore === "number" && !Number.isNaN(j.personalityMinScore)
          ? j.personalityMinScore
          : DEFAULT_AGENT_RULES.personalityMinScore;

    let personalityMaxScore: number | null = DEFAULT_AGENT_RULES.personalityMaxScore;
    if ("personalityMaxScore" in j) {
      if (j.personalityMaxScore === null) personalityMaxScore = null;
      else if (
        typeof j.personalityMaxScore === "number" &&
        !Number.isNaN(j.personalityMaxScore)
      ) {
        personalityMaxScore = j.personalityMaxScore;
      }
    }

    const resumeAssessmentMinKeys = Array.isArray(j.resumeAssessmentMinKeys)
      ? j.resumeAssessmentMinKeys.filter((x): x is string => typeof x === "string")
      : undefined;

    const resumeUseRaw = j.resumeUse as Partial<ResumeRuleUse> | undefined;
    const resumeUse: ResumeRuleUse = {
      education:
        typeof resumeUseRaw?.education === "boolean"
          ? resumeUseRaw.education
          : DEFAULT_RESUME_USE.education,
      city:
        typeof resumeUseRaw?.city === "boolean" ? resumeUseRaw.city : DEFAULT_RESUME_USE.city,
      years:
        typeof resumeUseRaw?.years === "boolean" ? resumeUseRaw.years : DEFAULT_RESUME_USE.years,
      salary:
        typeof resumeUseRaw?.salary === "boolean"
          ? resumeUseRaw.salary
          : DEFAULT_RESUME_USE.salary,
    };

    const emailNotify = parseEmailNotify(j.emailNotify);

    return {
      educations: Array.isArray(j.educations) ? j.educations.map(String) : [],
      cities: Array.isArray(j.cities) ? j.cities.map(String) : [],
      yearsMin: typeof j.yearsMin === "number" ? j.yearsMin : null,
      yearsMax: typeof j.yearsMax === "number" ? j.yearsMax : null,
      salaryMinK: typeof j.salaryMinK === "number" ? j.salaryMinK : null,
      salaryMaxK: typeof j.salaryMaxK === "number" ? j.salaryMaxK : null,
      assessmentMins,
      resumeAssessmentMinKeys,
      resumeUse,
      targetStages:
        targetStages.length > 0 ? targetStages : DEFAULT_AGENT_RULES.targetStages,
      resumeRuleStages:
        resumeRuleStages.length > 0
          ? resumeRuleStages
          : DEFAULT_AGENT_RULES.resumeRuleStages,
      resumePassStage,
      personalityStages:
        personalityStages.length > 0
          ? personalityStages
          : DEFAULT_AGENT_RULES.personalityStages,
      personalityAssessmentKey,
      personalityMinScore,
      personalityMaxScore,
      personalityPassStage,
      emailNotify,
    };
  } catch {
    return base;
  }
}

export function resolveNotifyMail(
  rules: AgentRules,
  kind: "resumePass" | "resumeFail" | "talentPool",
  name: string,
): { subject: string; text: string } {
  const n = rules.emailNotify;
  if (kind === "resumePass") {
    const subject =
      n?.resumePassSubject?.trim() || MAIL_DEFAULTS.resumePassSubject;
    const bodyTpl = n?.resumePassBody?.trim() || MAIL_DEFAULTS.resumePassBody;
    return { subject, text: applyNameToMailBody(bodyTpl, name) };
  }
  if (kind === "resumeFail") {
    const subject = n?.resumeFailSubject?.trim() || MAIL_DEFAULTS.resumeFailSubject;
    const bodyTpl = n?.resumeFailBody?.trim() || MAIL_DEFAULTS.resumeFailBody;
    return { subject, text: applyNameToMailBody(bodyTpl, name) };
  }
  const subject = n?.talentPoolSubject?.trim() || MAIL_DEFAULTS.talentPoolSubject;
  const bodyTpl = n?.talentPoolBody?.trim() || MAIL_DEFAULTS.talentPoolBody;
  return { subject, text: applyNameToMailBody(bodyTpl, name) };
}

export function parseSalaryRangeK(text: string | null | undefined): {
  min: number | null;
  max: number | null;
} {
  if (!text?.trim()) return { min: null, max: null };
  const t = text.replace(/\s/g, "").toUpperCase();
  const nums = t.match(/\d+(\.\d+)?/g)?.map(Number) ?? [];
  if (nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0], max: nums[0] };
  return { min: Math.min(...nums), max: Math.max(...nums) };
}
