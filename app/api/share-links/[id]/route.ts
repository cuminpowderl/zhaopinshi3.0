import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as {
    revoked?: boolean;
    rotateToken?: boolean;
  };

  if (body.rotateToken === true) {
    try {
      const token = randomBytes(24).toString("base64url");
      const row = await prisma.shareLink.update({
        where: { id },
        // 新 token 视为重新发放：旧地址作废，且本条恢复为可访问（若需再关，可再点「设为私密」）
        data: { token, revoked: false, expiresAt: null },
      });
      return NextResponse.json({ link: row });
    } catch {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
  }

  if (typeof body.revoked === "boolean") {
    try {
      const row = await prisma.shareLink.update({
        where: { id },
        data: { revoked: body.revoked },
      });
      return NextResponse.json({ link: row });
    } catch {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }
  }

  return NextResponse.json(
    { error: "请传 revoked: true/false，或 rotateToken: true（换新 token，旧链接失效）" },
    { status: 400 },
  );
}
