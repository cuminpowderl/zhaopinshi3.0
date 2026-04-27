import type { Assessment, Candidate, CustomField } from "@prisma/client";

export type CandidateWithRelations = Candidate & {
  fieldValues: {
    value: string;
    field: CustomField;
  }[];
  scores: {
    score: number;
    assessment: Assessment;
  }[];
};

export function parseSelectOptions(options: string | null): string[] {
  if (!options) return [];
  try {
    const v = JSON.parse(options) as unknown;
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function candidateMatchesFilters(
  c: CandidateWithRelations,
  params: URLSearchParams,
  fields: CustomField[],
  assessments: Assessment[],
): boolean {
  for (const f of fields) {
    const fv = c.fieldValues.find((x) => x.field.key === f.key);

    if (f.type === "SELECT") {
      const exact = params.get(`f_${f.key}`);
      if (exact != null && exact !== "") {
        if (!fv || fv.value !== exact) return false;
      }
    }

    if (f.type === "TEXT") {
      const exact = params.get(`f_${f.key}`);
      if (exact != null && exact !== "") {
        if (!fv || fv.value !== exact) return false;
      }
    }

    if (f.type === "NUMBER") {
      const min = params.get(`f_${f.key}_min`);
      const max = params.get(`f_${f.key}_max`);
      if (min != null && min !== "") {
        const n = fv ? Number(fv.value) : NaN;
        if (Number.isNaN(n) || n < Number(min)) return false;
      }
      if (max != null && max !== "") {
        const n = fv ? Number(fv.value) : NaN;
        if (Number.isNaN(n) || n > Number(max)) return false;
      }
    }
  }

  for (const a of assessments) {
    const min = params.get(`a_${a.key}_min`);
    const max = params.get(`a_${a.key}_max`);
    if ((min == null || min === "") && (max == null || max === "")) continue;
    const sc = c.scores.find((x) => x.assessment.key === a.key);
    if (!sc) return false;
    if (min != null && min !== "" && sc.score < Number(min)) return false;
    if (max != null && max !== "" && sc.score > Number(max)) return false;
  }

  return true;
}
