import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json()) as { inUse?: boolean };

  if (typeof body.inUse !== "boolean") {
    return NextResponse.json({ error: "需要 inUse 布尔值" }, { status: 400 });
  }

  try {
    const row = await prisma.assessment.update({
      where: { id },
      data: { inUse: body.inUse },
    });
    return NextResponse.json(row);
  } catch (e) {
    const staleInUse =
      e instanceof Prisma.PrismaClientValidationError &&
      String(e.message).includes("Unknown argument `inUse`");
    if (!staleInUse) throw e;
    await prisma.$executeRawUnsafe(
      "UPDATE Assessment SET inUse = ? WHERE id = ?",
      body.inUse ? 1 : 0,
      id,
    );
    const row = await prisma.assessment.findUnique({ where: { id } });
    if (!row) {
      return NextResponse.json({ error: "测评不存在" }, { status: 404 });
    }
    return NextResponse.json({ ...row, inUse: body.inUse });
  }
}

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const row = await prisma.assessment.findUnique({ where: { id } });
  if (!row) {
    return NextResponse.json({ error: "测评不存在" }, { status: 404 });
  }
  await prisma.assessment.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
