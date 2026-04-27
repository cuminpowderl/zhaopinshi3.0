import { prisma } from "@/lib/prisma";

/** 从 SQLite 读真实 inUse（避免 Prisma Client 未 generate 时 ORM 结果缺列） */
export async function loadFieldInUseMap(): Promise<Map<string, boolean>> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; inUse: number }>>(
    "SELECT id, inUse FROM CustomField",
  );
  return new Map(rows.map((r) => [r.id, Number(r.inUse) !== 0]));
}

export async function loadAssessmentInUseMap(): Promise<Map<string, boolean>> {
  const rows = await prisma.$queryRawUnsafe<Array<{ id: string; inUse: number }>>(
    "SELECT id, inUse FROM Assessment",
  );
  return new Map(rows.map((r) => [r.id, Number(r.inUse) !== 0]));
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
