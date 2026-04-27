import {
  applyAssessmentInUse,
  applyFieldInUse,
  loadAssessmentInUseMap,
  loadFieldInUseMap,
} from "@/lib/in-use-from-db";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  // 串行查询：避免 SQLite 单连接+多路并发在 Windows 上长时间等待或阻塞
  const fieldsRaw = await prisma.customField.findMany({ orderBy: { sortOrder: "asc" } });
  const assessmentsRaw = await prisma.assessment.findMany({ orderBy: { sortOrder: "asc" } });
  const fieldInMap = await loadFieldInUseMap();
  const assessInMap = await loadAssessmentInUseMap();
  const fields = applyFieldInUse(fieldsRaw, fieldInMap);
  const assessments = applyAssessmentInUse(assessmentsRaw, assessInMap);
  return NextResponse.json({ fields, assessments });
}
