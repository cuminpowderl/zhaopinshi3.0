import { prisma } from "@/lib/prisma";

/** 读取真实 inUse（Postgres/SQLite 通用） */
export async function loadFieldInUseMap(): Promise<Map<string, boolean>> {
  const rows = await prisma.customField.findMany({
    select: { id: true, inUse: true },
  });
  return new Map(rows.map((r) => [r.id, r.inUse !== false]));
}

export async function loadAssessmentInUseMap(): Promise<Map<string, boolean>> {
  const rows = await prisma.assessment.findMany({
    select: { id: true, inUse: true },
  });
  return new Map(rows.map((r) => [r.id, r.inUse !== false]));
}

export function applyFieldInUse<T extends { id: string }>(
  rows: T[],
  map: Map<string, boolean>,
): (T & { inUse: boolean })[] {
  return rows.map((r) => ({ ...r, inUse: map.get(r.id) ?? true }));
}

export function applyAssessmentInUse<T extends { id: string }>(
  rows: T[],
  map: Map<string, boolean>,
): (T & { inUse: boolean })[] {
  return rows.map((r) => ({ ...r, inUse: map.get(r.id) ?? true }));
}
