import type { Assessment, Candidate, CustomField } from "@prisma/client";
import type { AgentRules } from "./agent-rules";
import { DEFAULT_RESUME_USE, parseSalaryRangeK } from "./agent-rules";

export type CandidateScreenInput = Candidate & {
  fieldValues: { value: string; field: CustomField }[];
  scores: { score: number; assessment: Assessment }[];
};

function fieldValue(c: CandidateScreenInput, key: string): string | null {
  const fv = c.fieldValues.find((x) => x.field.key === key);
  return fv?.value?.trim() ? fv.value.trim() : null;
}

/** 简历条件筛选（性格测评 key 仅走 personality 阶段，此处不计入最低分） */
export function evaluateAgentPass(
  c: CandidateScreenInput,
  rules: AgentRules,
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];
  const use = rules.resumeUse ?? DEFAULT_RESUME_USE;
  const pk = (rules.personalityAssessmentKey || "").trim();
  const autoMinKeys = Object.keys(rules.assessmentMins).filter((k) => k !== pk);
  const minKeySet = new Set(
    rules.resumeAssessmentMinKeys === undefined
      ? autoMinKeys
      : rules.resumeAssessmentMinKeys,
  );

  const edu = fieldValue(c, "education");
  if (use.education && rules.educations.length > 0) {
    if (!edu || !rules.educations.includes(edu)) {
      reasons.push(`学历不在白名单（当前：${edu ?? "未填"}）`);
    }
  }

  const city = fieldValue(c, "city");
  if (use.city && rules.cities.length > 0) {
    const hit = city && rules.cities.some((x) => city.includes(x) || x.includes(city));
    if (!hit) {
      reasons.push(`城市不匹配（当前：${city ?? "未填"}）`);
    }
  }

  const yearsRaw = fieldValue(c, "years");
  const years = yearsRaw != null ? Number(yearsRaw) : NaN;
  if (use.years) {
    if (rules.yearsMin != null) {
      if (Number.isNaN(years) || years < rules.yearsMin) {
        reasons.push(`工作年限低于下限（当前：${yearsRaw ?? "未填"}）`);
      }
    }
    if (rules.yearsMax != null) {
      if (Number.isNaN(years) || years > rules.yearsMax) {
        reasons.push(`工作年限高于上限（当前：${yearsRaw ?? "未填"}）`);
      }
    }
  }

  const { min: salMin, max: salMax } = parseSalaryRangeK(c.expectedSalary);
  if (use.salary && (rules.salaryMinK != null || rules.salaryMaxK != null)) {
    if (salMin == null && salMax == null) {
      reasons.push("期望薪资未填或无法解析");
    } else {
      const lo = salMin ?? salMax;
      const hi = salMax ?? salMin;
      if (rules.salaryMinK != null && hi != null && hi < rules.salaryMinK) {
        reasons.push(`期望薪资上限低于要求下限（${c.expectedSalary ?? ""}）`);
      }
      if (rules.salaryMaxK != null && lo != null && lo > rules.salaryMaxK) {
        reasons.push(`期望薪资下限高于要求上限（${c.expectedSalary ?? ""}）`);
      }
    }
  }

  for (const [key, minScore] of Object.entries(rules.assessmentMins)) {
    if (key === pk) continue;
    if (!minKeySet.has(key)) continue;
    if (minScore == null || Number.isNaN(minScore)) continue;
    const sc = c.scores.find((x) => x.assessment.key === key);
    if (!sc || sc.score < minScore) {
      reasons.push(
        `「${key}」未达 ${minScore} 分（当前：${sc ? sc.score : "未填"}）`,
      );
    }
  }

  return { pass: reasons.length === 0, reasons };
}

export function getPersonalityScore(
  c: CandidateScreenInput,
  assessmentKey: string,
): number | null {
  const sc = c.scores.find((x) => x.assessment.key === assessmentKey);
  if (!sc) return null;
  return sc.score;
}

/** 性格分是否在运行人配置的区间内（null 边界表示不限制该侧） */
export function personalityScoreInRange(
  score: number,
  rules: Pick<AgentRules, "personalityMinScore" | "personalityMaxScore">,
): boolean {
  if (rules.personalityMinScore != null && score < rules.personalityMinScore) return false;
  if (rules.personalityMaxScore != null && score > rules.personalityMaxScore) return false;
  return true;
}
