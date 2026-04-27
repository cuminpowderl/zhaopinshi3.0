import { prisma } from "@/lib/prisma";
import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const rows = await prisma.shareLink.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json({ links: rows });
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => ({}))) as { note?: string; expiresInDays?: number };
  const token = randomBytes(24).toString("base64url");

  let expiresAt: Date | null = null;
  const d = body.expiresInDays;
  if (typeof d === "number" && Number.isFinite(d) && d > 0 && d <= 3650) {
    expiresAt = new Date(Date.now() + Math.floor(d) * 24 * 60 * 60 * 1000);
  }

  const row = await prisma.shareLink.create({
    data: {
      token,
      note: typeof body.note === "string" && body.note.trim() ? body.note.trim().slice(0, 200) : null,
      expiresAt,
    },
  });
  return NextResponse.json({ link: row });
}
