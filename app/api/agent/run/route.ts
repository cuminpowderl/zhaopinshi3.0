import { formatMailLogLine } from "@/lib/agent-mail-templates";
import { parseRulesJson, resolveNotifyMail } from "@/lib/agent-rules";
import {
  evaluateAgentPass,
  getPersonalityScore,
  personalityScoreInRange,
} from "@/lib/agent-screening";
import { sendCandidateEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const include = {
  fieldValues: { include: { field: true } },
  scores: { include: { assessment: true } },
} as const;

export async function POST() {
  const settings = await prisma.agentSettings.findUnique({ where: { id: "default" } });
  if (!settings?.enabled) {
    return NextResponse.json({ ok: true, skipped: true, message: "Agent 未开启" });
  }

  const rules = parseRulesJson(settings.rulesJson);
  const assessments = await prisma.assessment.findMany();

  const pending = await prisma.candidate.findMany({
    where: {
      stage: { in: rules.targetStages },
      agentProcessedAt: null,
    },
    include,
    orderBy: { createdAt: "asc" },
  });

  const lines: string[] = [];
  const now = new Date();
  const personalityKeyConfigured =
    rules.personalityAssessmentKey.trim().length > 0 &&
    assessments.some((a) => a.key === rules.personalityAssessmentKey);

  for (const c of pending) {
    const S = c.stage;

    if (rules.personalityStages.includes(S) && personalityKeyConfigured) {
      const score = getPersonalityScore(c, rules.personalityAssessmentKey);
      if (score == null) {
        lines.push(`「${c.name}」跳过：未填写性格测试分数`);
        continue;
      }
      if (!personalityScoreInRange(score, rules)) {
        await prisma.candidate.update({
          where: { id: c.id },
          data: { stage: "TALENT_POOL", agentProcessedAt: now },
        });
        const { subject, text } = resolveNotifyMail(rules, "talentPool", c.name);
        const mail = await sendCandidateEmail({
          to: c.email,
          subject,
          text,
        });
        const band =
          rules.personalityMinScore != null || rules.personalityMaxScore != null
            ? `要求 ${rules.personalityMinScore ?? "—"}～${rules.personalityMaxScore ?? "—"}（含）`
            : "";
        lines.push(
          `「${c.name}」性格分不在区间（当前 ${score} ${band}）→ 人才库。${formatMailLogLine(mail, c.email)}`,
        );
      } else {
        await prisma.candidate.update({
          where: { id: c.id },
          data: { stage: rules.personalityPassStage, agentProcessedAt: now },
        });
        lines.push(
          `「${c.name}」性格测试通过（${score}）→ ${rules.personalityPassStage}（本阶段不发邮件）`,
        );
      }
      continue;
    }

    if (rules.resumeRuleStages.includes(S)) {
      const { pass, reasons } = evaluateAgentPass(c, rules);
      if (pass) {
        await prisma.candidate.update({
          where: { id: c.id },
          data: { stage: rules.resumePassStage, agentProcessedAt: now },
        });
        const { subject, text } = resolveNotifyMail(rules, "resumePass", c.name);
        const mail = await sendCandidateEmail({
          to: c.email,
          subject,
          text,
        });
        lines.push(
          `「${c.name}」简历条件通过 → ${rules.resumePassStage}。${formatMailLogLine(mail, c.email)}`,
        );
      } else {
        await prisma.candidate.update({
          where: { id: c.id },
          data: { stage: "REJECTED", agentProcessedAt: now },
        });
        const { subject, text } = resolveNotifyMail(rules, "resumeFail", c.name);
        const mail = await sendCandidateEmail({
          to: c.email,
          subject,
          text,
        });
        lines.push(
          `「${c.name}」简历条件未通过：${reasons.join("；")}。${formatMailLogLine(mail, c.email)}`,
        );
      }
      continue;
    }

    lines.push(
      `「${c.name}」跳过：阶段「${S}」未勾选简历规则或性格规则，或性格测评 key 未配置`,
    );
  }

  if (pending.length === 0) {
    lines.push("暂无待处理候选人（请检查「Agent 作用阶段」与候选人 agent 处理标记）。");
  }

  lines.push(
    "",
    "—— 邮件说明：简历通过 / 未通过 / 性格未过线会各发一封（若已配置 SMTP）。性格通过进入下一阶段不发邮件。模板在「筛选字段设置 → Agent 通知邮件」。",
  );

  const logText = lines.join("\n");
  await prisma.agentSettings.update({
    where: { id: "default" },
    data: { lastRunAt: now, lastRunLog: logText },
  });

  return NextResponse.json({
    ok: true,
    processed: pending.length,
    log: logText,
  });
}
