import { parseRulesJson, resolveNotifyMail } from "@/lib/agent-rules";
import { sendCandidateEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { sendEmail?: boolean };

  const c = await prisma.candidate.findUnique({ where: { id } });
  if (!c) {
    return NextResponse.json({ error: "未找到" }, { status: 404 });
  }

  const sendEmail = body.sendEmail !== false;

  await prisma.candidate.update({
    where: { id },
    data: {
      stage: "TALENT_POOL",
      agentProcessedAt: new Date(),
    },
  });

  let mail: { ok: boolean; skipped?: boolean; error?: string } = { ok: true };
  if (sendEmail) {
    const settings = await prisma.agentSettings.findUnique({ where: { id: "default" } });
    const rules = parseRulesJson(settings?.rulesJson);
    const { subject, text } = resolveNotifyMail(rules, "talentPool", c.name);
    mail = await sendCandidateEmail({
      to: c.email,
      subject,
      text,
    });
  }

  return NextResponse.json({
    ok: true,
    email: sendEmail ? mail : { skipped: true },
  });
}
