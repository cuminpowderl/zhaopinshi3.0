import { candidateMatchesFilters, parseSelectOptions } from "@/lib/filters";
import {
  applyAssessmentInUse,
  applyFieldInUse,
  loadAssessmentInUseMap,
  loadFieldInUseMap,
} from "@/lib/in-use-from-db";
import { prisma } from "@/lib/prisma";
import { parsePipelineStage } from "@/lib/stage-guard";
import { FieldType, type CandidateSource, type PipelineStage } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const include = {
  fieldValues: { include: { field: true } },
  scores: { include: { assessment: true } },
} as const;

export async function GET(req: NextRequest) {
  const stageFilter = parsePipelineStage(req.nextUrl.searchParams.get("stage"));

  const where = stageFilter ? { stage: stageFilter as PipelineStage } : {};

  const [rows, fieldsAll, assessmentsAll, fieldInMap, assessInMap] = await Promise.all([
    prisma.candidate.findMany({
      where,
      include: include,
      orderBy: { createdAt: "desc" },
    }),
    prisma.customField.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.assessment.findMany({ orderBy: { sortOrder: "asc" } }),
    loadFieldInUseMap(),
    loadAssessmentInUseMap(),
  ]);

  const fields = applyFieldInUse(fieldsAll, fieldInMap).filter((f) => f.inUse !== false);
  const assessments = applyAssessmentInUse(assessmentsAll, assessInMap).filter(
    (a) => a.inUse !== false,
  );

  const params = req.nextUrl.searchParams;
  const filtered = rows.filter((c) =>
    candidateMatchesFilters(c, params, fields, assessments),
  );

  return NextResponse.json({ candidates: filtered, fields, assessments });
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    name: string;
    email: string;
    phone?: string;
    note?: string;
    stage?: PipelineStage;
    source?: CandidateSource;
    expectedSalary?: string;
    resumeImageUrl?: string;
    fields: Record<string, string>;
    scores: Record<string, number>;
  };

  if (!body.name?.trim() || !body.email?.trim()) {
    return NextResponse.json({ error: "姓名与邮箱必填" }, { status: 400 });
  }

  const [fieldDefsAll, assessDefsAll, fieldInMap, assessInMap] = await Promise.all([
    prisma.customField.findMany(),
    prisma.assessment.findMany(),
    loadFieldInUseMap(),
    loadAssessmentInUseMap(),
  ]);
  const fieldDefs = applyFieldInUse(fieldDefsAll, fieldInMap).filter((f) => f.inUse !== false);
  const assessDefs = applyAssessmentInUse(assessDefsAll, assessInMap).filter(
    (a) => a.inUse !== false,
  );

  const fieldCreates = fieldDefs
    .map((f) => {
      const raw = body.fields[f.key];
      if (raw == null || String(raw).trim() === "") return null;
      const value = String(raw).trim();
      if (f.type === FieldType.SELECT) {
        const opts = parseSelectOptions(f.options);
        if (!opts.includes(value)) return null;
      }
      if (f.type === FieldType.NUMBER) {
        const n = Number(value);
        if (Number.isNaN(n)) return null;
        if (f.numberMin != null && n < f.numberMin) return null;
        if (f.numberMax != null && n > f.numberMax) return null;
      }
      return { fieldId: f.id, value };
    })
    .filter(Boolean) as { fieldId: string; value: string }[];

  const scoreCreates = assessDefs
    .map((a) => {
      const v = body.scores[a.key];
      if (v == null || Number.isNaN(Number(v))) return null;
      const num = Number(v);
      if (num < 0 || num > a.maxScore) return null;
      return { assessmentId: a.id, score: num };
    })
    .filter(Boolean) as { assessmentId: string; score: number }[];

  const c = await prisma.candidate.create({
    data: {
      name: body.name.trim(),
      email: body.email.trim(),
      phone: body.phone?.trim() || null,
      note: body.note?.trim() || null,
      stage: body.stage ?? "RESUME_FIRST",
      source: body.source ?? "OTHER",
      expectedSalary: body.expectedSalary?.trim() || null,
      resumeImageUrl: body.resumeImageUrl?.trim() || null,
      agentProcessedAt: null,
      fieldValues: { create: fieldCreates },
      scores: { create: scoreCreates },
    },
    include: include,
  });

  return NextResponse.json(c);
}
