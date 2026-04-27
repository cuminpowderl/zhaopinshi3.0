import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  let row = await prisma.agentSettings.findUnique({ where: { id: "default" } });
  if (!row) {
    row = await prisma.agentSettings.create({
      data: {
        id: "default",
        rulesJson: "{}",
      },
    });
  }
  return NextResponse.json(row);
}

export async function PATCH(req: NextRequest) {
  const body = (await req.json()) as {
    enabled?: boolean;
    mascotHidden?: boolean;
    rulesJson?: string;
  };

  const row = await prisma.agentSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      enabled: body.enabled ?? false,
      mascotHidden: body.mascotHidden ?? false,
      rulesJson: body.rulesJson ?? "{}",
    },
    update: {
      ...(body.enabled !== undefined ? { enabled: body.enabled } : {}),
      ...(body.mascotHidden !== undefined ? { mascotHidden: body.mascotHidden } : {}),
      ...(body.rulesJson !== undefined ? { rulesJson: body.rulesJson } : {}),
    },
  });

  return NextResponse.json(row);
}
