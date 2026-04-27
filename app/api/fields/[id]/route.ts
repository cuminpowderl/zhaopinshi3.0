import { prisma } from "@/lib/prisma";
import { FieldType, Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as {
    inUse?: boolean;
    label?: string;
    options?: string[];
    numberMin?: number | null;
    numberMax?: number | null;
  };

  const row = await prisma.customField.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "字段不存在" }, { status: 404 });
  }

  const data: {
    inUse?: boolean;
    label?: string;
    options?: string | null;
    numberMin?: number | null;
    numberMax?: number | null;
  } = {};

  if (typeof body.inUse === "boolean") data.inUse = body.inUse;
  if (typeof body.label === "string" && body.label.trim()) {
    data.label = body.label.trim();
  }

  if (row.type === FieldType.SELECT && body.options !== undefined) {
    const opts = body.options.map((s) => String(s).trim()).filter(Boolean);
    data.options = opts.length ? JSON.stringify(opts) : null;
  }

  if (row.type === FieldType.NUMBER) {
    if (body.numberMin !== undefined) {
      data.numberMin =
        body.numberMin === null || Number.isNaN(Number(body.numberMin))
          ? null
          : Number(body.numberMin);
    }
    if (body.numberMax !== undefined) {
      data.numberMax =
        body.numberMax === null || Number.isNaN(Number(body.numberMax))
          ? null
          : Number(body.numberMax);
    }
    if (
      data.numberMin != null &&
      data.numberMax != null &&
      data.numberMin > data.numberMax
    ) {
      return NextResponse.json({ error: "数字下限不能大于上限" }, { status: 400 });
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "无有效更新字段" }, { status: 400 });
  }

  let updated;
  try {
    updated = await prisma.customField.update({
      where: { id },
      data,
    });
  } catch (e) {
    const staleInUse =
      e instanceof Prisma.PrismaClientValidationError &&
      typeof data.inUse === "boolean" &&
      String(e.message).includes("Unknown argument `inUse`");
    if (!staleInUse) throw e;
    await prisma.$executeRawUnsafe(
      "UPDATE CustomField SET inUse = ? WHERE id = ?",
      data.inUse ? 1 : 0,
      id,
    );
    const rest = { ...data } as typeof data & { inUse?: boolean };
    delete rest.inUse;
    if (Object.keys(rest).length > 0) {
      updated = await prisma.customField.update({ where: { id }, data: rest });
    } else {
      updated = await prisma.customField.findUnique({ where: { id } });
    }
    if (!updated) {
      return NextResponse.json({ error: "字段不存在" }, { status: 404 });
    }
    return NextResponse.json({ ...updated, inUse: data.inUse });
  }
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const row = await prisma.customField.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "字段不存在" }, { status: 404 });
  }
  await prisma.customField.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
