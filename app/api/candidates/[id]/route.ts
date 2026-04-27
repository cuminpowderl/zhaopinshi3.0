import { parseSelectOptions } from "@/lib/filters";
import {
  applyAssessmentInUse,
  applyFieldInUse,
  loadAssessmentInUseMap,
  loadFieldInUseMap,
} from "@/lib/in-use-from-db";
import { prisma } from "@/lib/prisma";
import { FieldType, type CandidateSource, type PipelineStage } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

const include = {
  fieldValues: { include: { field: true } },
  scores: { include: { assessment: true } },
} as const;

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    name?: string;
    email?: string;
    phone?: string;
    note?: string;
    stage?: PipelineStage;
    source?: CandidateSource;
    expectedSalary?: string;
    resumeImageUrl?: string;
    resetAgent?: boolean;
    fields?: Record<string, string>;
    scores?: Record<string, number>;
  };

  const existing = await prisma.candidate.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  const [fieldInMap, assessInMap] = await Promise.all([
    loadFieldInUseMap(),
    loadAssessmentInUseMap(),
  ]);

  await prisma.$transaction(async (tx) => {
    const top: Record<string, unknown> = {};
    if (body.name != null) top.name = body.name.trim();
    if (body.email != null) top.email = body.email.trim();
    if (body.phone !== undefined) top.phone = body.phone?.trim() || null;
    if (body.note !== undefined) top.note = body.note?.trim() || null;
    if (body.stage != null) top.stage = body.stage;
    if (body.source != null) top.source = body.source;
    if (body.expectedSalary !== undefined) {
      top.expectedSalary = body.expectedSalary?.trim() || null;
    }
    if (body.resumeImageUrl !== undefined) {
      top.resumeImageUrl = body.resumeImageUrl?.trim() || null;
    }
    if (body.resetAgent === true) {
      top.agentProcessedAt = null;
    }

    if (Object.keys(top).length > 0) {
      await tx.candidate.update({ where: { id }, data: top });
    }

    if (body.fields) {
      const fieldDefsAll = await tx.customField.findMany();
      const fieldDefs = applyFieldInUse(fieldDefsAll, fieldInMap).filter((f) => f.inUse !== false);
      for (const f of fieldDefs) {
        if (!(f.key in body.fields)) continue;
        const raw = body.fields[f.key];
        if (raw == null || String(raw).trim() === "") {
          await tx.candidateFieldValue.deleteMany({
            where: { candidateId: id, fieldId: f.id },
          });
          continue;
        }
        const value = String(raw).trim();
        if (f.type === FieldType.SELECT) {
          const opts = parseSelectOptions(f.options);
          if (!opts.includes(value)) continue;
        }
        if (f.type === FieldType.NUMBER) {
          const n = Number(value);
          if (Number.isNaN(n)) continue;
          if (f.numberMin != null && n < f.numberMin) continue;
          if (f.numberMax != null && n > f.numberMax) continue;
        }

        await tx.candidateFieldValue.upsert({
          where: { candidateId_fieldId: { candidateId: id, fieldId: f.id } },
          create: { candidateId: id, fieldId: f.id, value },
          update: { value },
        });
      }
    }

    if (body.scores) {
      const assessDefsAll = await tx.assessment.findMany();
      const assessDefs = applyAssessmentInUse(assessDefsAll, assessInMap).filter(
        (a) => a.inUse !== false,
      );
      for (const a of assessDefs) {
        if (!(a.key in body.scores)) continue;
        const v = body.scores[a.key];
        if (v == null || Number.isNaN(Number(v))) {
          await tx.candidateScore.deleteMany({
            where: { candidateId: id, assessmentId: a.id },
          });
          continue;
        }
        const num = Number(v);
        if (num < 0 || num > a.maxScore) continue;
        await tx.candidateScore.upsert({
          where: {
            candidateId_assessmentId: { candidateId: id, assessmentId: a.id },
          },
          create: { candidateId: id, assessmentId: a.id, score: num },
          update: { score: num },
        });
      }
    }
  });

  const c = await prisma.candidate.findUnique({
    where: { id },
    include: include,
  });
  return NextResponse.json(c);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  await prisma.candidate.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
}
