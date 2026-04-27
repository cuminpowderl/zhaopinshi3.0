import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

function slugKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\u4e00-\u9fff]/g, "");
  return base || `test_${Date.now()}`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    label: string;
    maxScore?: number;
    key?: string;
  };

  if (!body.label?.trim()) {
    return NextResponse.json({ error: "测评名称必填" }, { status: 400 });
  }

  let key = body.key?.trim() || slugKey(body.label);
  const exists = await prisma.assessment.findUnique({ where: { key } });
  if (exists) key = `${key}_${Date.now().toString(36)}`;

  const maxOrder = await prisma.assessment.aggregate({ _max: { sortOrder: true } });
  const maxScore = body.maxScore != null && !Number.isNaN(Number(body.maxScore)) ? Number(body.maxScore) : 100;

  const row = await prisma.assessment.create({
    data: {
      key,
      label: body.label.trim(),
      maxScore,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      inUse: true,
    },
  });

  return NextResponse.json(row);
}
