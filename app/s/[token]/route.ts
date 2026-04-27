import { prisma } from "@/lib/prisma";
import { shareCookieName } from "@/lib/share-access";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  const { token } = await ctx.params;
  if (!token || token.length > 200) {
    const res = NextResponse.redirect(new URL("/share-expired", req.url));
    res.cookies.delete(shareCookieName);
    return res;
  }

  const link = await prisma.shareLink.findFirst({
    where: { token, revoked: false },
  });

  const expired = link?.expiresAt != null && link.expiresAt <= new Date();
  if (!link || expired) {
    const res = NextResponse.redirect(new URL("/share-expired", req.url));
    res.cookies.delete(shareCookieName);
    return res;
  }

  const url = new URL("/candidates", req.url);

  const res = NextResponse.redirect(url);
  res.cookies.set(shareCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
    secure: process.env.NODE_ENV === "production",
  });
  return res;
}
