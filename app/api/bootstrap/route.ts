import {
  applyAssessmentInUse,
  applyFieldInUse,
  loadAssessmentInUseMap,
  loadFieldInUseMap,
} from "@/lib/in-use-from-db";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const [fieldsRaw, assessmentsRaw, fieldInMap, assessInMap] = await Promise.all([
    prisma.customField.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.assessment.findMany({ orderBy: { sortOrder: "asc" } }),
    loadFieldInUseMap(),
    loadAssessmentInUseMap(),
  ]);
  const fields = applyFieldInUse(fieldsRaw, fieldInMap);
  const assessments = applyAssessmentInUse(assessmentsRaw, assessInMap);
  return NextResponse.json({ fields, assessments });
}
