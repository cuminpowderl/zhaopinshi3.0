import { prisma } from "@/lib/prisma";
import Link from "next/link";

export default async function HomePage() {
  let candidateCount = 0;
  let fieldCount = 0;
  let assessmentCount = 0;
  let dataError: string | null = null;
  try {
    [candidateCount, fieldCount, assessmentCount] = await Promise.all([
      prisma.candidate.count(),
      prisma.customField.count(),
      prisma.assessment.count(),
    ]);
  } catch {
    dataError =
      "暂时无法读取数据库（请确认云上已挂载 /data 卷、启动日志里 prisma db push 成功，或稍后重试）。";
  }

  return (
    <div className="space-y-10">
      {dataError ? (
        <p className="rounded-xl border border-brand/40 bg-brand-soft/50 px-4 py-3 text-sm text-brand">
          {dataError}
        </p>
      ) : null}
      <section className="rounded-3xl border border-border bg-gradient-to-br from-surface-2 via-surface to-brand-soft/40 p-8 sm:p-10">
        <h1 className="font-display text-xl font-semibold tracking-tight text-fg sm:text-2xl lg:text-3xl">
          规则你定，筛选它做
        </h1>
        <p className="mt-3 font-display text-lg font-semibold tracking-tight text-fg sm:text-xl">
          不想再逐份翻简历了？让Agent帮你
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/candidates"
            className="inline-flex items-center justify-center rounded-xl bg-brand px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-hover"
          >
            进入候选人
          </Link>
          <Link
            href="/pipeline"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-fg hover:bg-surface-2"
          >
            流程看板
          </Link>
          <Link
            href="/settings"
            className="inline-flex items-center justify-center rounded-xl border border-border bg-surface px-5 py-2.5 text-sm font-medium text-fg hover:bg-surface-2"
          >
            筛选字段设置
          </Link>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">候选人</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-fg">
            {candidateCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">自定义字段</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-fg">
            {fieldCount}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">测评项</p>
          <p className="mt-2 font-display text-3xl font-semibold tabular-nums text-fg">
            {assessmentCount}
          </p>
        </div>
      </section>
    </div>
  );
}
