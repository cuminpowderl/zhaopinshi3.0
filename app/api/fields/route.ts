import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

type FieldType = "SELECT" | "TEXT" | "NUMBER";

function slugKey(label: string): string {
  const base = label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_\u4e00-\u9fff]/g, "");
  return base || `field_${Date.now()}`;
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as {
    label: string;
    type: FieldType;
    options?: string[];
    key?: string;
  };

  if (!body.label?.trim()) {
    return NextResponse.json({ error: "字段名称必填" }, { status: 400 });
  }

  let key = body.key?.trim() || slugKey(body.label);
  const exists = await prisma.customField.findUnique({ where: { key } });
  if (exists) key = `${key}_${Date.now().toString(36)}`;

  const maxOrder = await prisma.customField.aggregate({ _max: { sortOrder: true } });

  const row = await prisma.customField.create({
    data: {
      key,
      label: body.label.trim(),
      type: body.type,
      options:
        body.type === "SELECT" && body.options?.length
          ? JSON.stringify(body.options)
          : null,
      sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
      inUse: true,
    },
  });

  return NextResponse.json(row);
}
