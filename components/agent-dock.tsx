"use client";

import type { AgentRules } from "@/lib/agent-rules";
import { DEFAULT_AGENT_RULES, parseRulesJson } from "@/lib/agent-rules";
import {
  AGENT_STAGE_OPTIONS,
  STAGE_LABEL,
  STAGE_PASS_TARGETS,
  type PipelineStage,
} from "@/lib/pipeline-labels";
import { useCallback, useEffect, useState } from "react";
import { MascotWidget } from "./mascot-widget";

type AgentSettingsRow = {
  id: string;
  enabled: boolean;
  mascotHidden: boolean;
  rulesJson: string;
  lastRunAt: string | null;
  lastRunLog: string | null;
};

type AssessmentMeta = {
  key: string;
  label: string;
  maxScore: number;
};

export function AgentDock() {
  const [settings, setSettings] = useState<AgentSettingsRow | null>(null);
  const [assessments, setAssessments] = useState<AssessmentMeta[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [rules, setRules] = useState<AgentRules>(DEFAULT_AGENT_RULES);
  const [educationsText, setEducationsText] = useState("");
  const [citiesText, setCitiesText] = useState("");
  const [log, setLog] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [sRes, bRes] = await Promise.all([
      fetch("/api/agent/settings"),
      fetch("/api/bootstrap"),
    ]);
    if (sRes.ok) {
      const s = (await sRes.json()) as AgentSettingsRow;
      setSettings(s);
      const r = parseRulesJson(s.rulesJson);
      setRules(r);
      setEducationsText(r.educations.join("、"));
      setCitiesText(r.cities.join("、"));
    }
    if (bRes.ok) {
      const b = (await bRes.json()) as { assessments: AssessmentMeta[] };
      setAssessments(b.assessments);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const openPanel = () => {
      setOpen(true);
      void load();
    };
    window.addEventListener("chaopin:open-agent", openPanel);
    return () => window.removeEventListener("chaopin:open-agent", openPanel);
  }, [load]);

  useEffect(() => {
    if (open && !settings) void load();
  }, [open, settings, load]);

  const persistRules = async (next: AgentRules) => {
    const res = await fetch("/api/agent/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rulesJson: JSON.stringify(next) }),
    });
    if (res.ok) setSettings((await res.json()) as AgentSettingsRow);
  };

  const buildRulesFromForm = (): AgentRules => ({
    ...rules,
    educations: educationsText
      .split(/[,，、]/)
      .map((x) => x.trim())
      .filter(Boolean),
    cities: citiesText
      .split(/[,，、]/)
      .map((x) => x.trim())
      .filter(Boolean),
    assessmentMins: { ...rules.assessmentMins },
  });

  const saveRulesFromForm = async () => {
    const next = buildRulesFromForm();
    setRules(next);
    await persistRules(next);
  };

  const pushRules = async () => {
    const next = buildRulesFromForm();
    setRules(next);
    await persistRules(next);
  };

  const runAgent = async () => {
    setBusy(true);
    setLog(null);
    try {
      const res = await fetch("/api/agent/run", { method: "POST" });
      const j = (await res.json()) as { log?: string; message?: string; skipped?: boolean };
      setLog(j.log ?? j.message ?? "完成");
      await load();
    } catch {
      setLog("执行失败");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const id = setInterval(async () => {
      const sRes = await fetch("/api/agent/settings");
      if (!sRes.ok) return;
      const s = (await sRes.json()) as AgentSettingsRow;
      if (!s.enabled) return;
      await fetch("/api/agent/run", { method: "POST" });
      void load();
    }, 60000);
    return () => clearInterval(id);
  }, [load]);

  const toggleEnabled = async (v: boolean) => {
    const res = await fetch("/api/agent/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: v }),
    });
    if (res.ok) setSettings((await res.json()) as AgentSettingsRow);
  };

  const toggleMascotHidden = async (v: boolean) => {
    const res = await fetch("/api/agent/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mascotHidden: v }),
    });
    if (res.ok) setSettings((await res.json()) as AgentSettingsRow);
  };

  const mascotHidden = settings?.mascotHidden ?? false;

  const personalityKeyTrim = rules.personalityAssessmentKey.trim();
  const resumeMinKeyIncluded = (key: string) => {
    if (!key || key === personalityKeyTrim) return false;
    if (rules.resumeAssessmentMinKeys !== undefined) {
      return rules.resumeAssessmentMinKeys.includes(key);
    }
    return Object.prototype.hasOwnProperty.call(rules.assessmentMins, key);
  };

  const toggleResumeMinKey = (key: string, included: boolean) => {
    setRules((r) => {
      const pk = r.personalityAssessmentKey.trim();
      const auto = Object.keys(r.assessmentMins).filter((k) => k !== pk);
      const base = r.resumeAssessmentMinKeys !== undefined ? [...r.resumeAssessmentMinKeys] : [...auto];
      const next = included ? [...new Set([...base, key])] : base.filter((k) => k !== key);
      return { ...r, resumeAssessmentMinKeys: next };
    });
  };

  return (
    <>
      {mascotHidden ? (
        <button
          type="button"
          className="fixed bottom-5 right-4 z-[100] rounded-full border-2 border-brand/30 bg-surface px-4 py-2 text-sm font-medium text-brand shadow-lg hover:bg-brand-soft"
          onClick={() => {
            setOpen(true);
            void load();
          }}
        >
          筛选助手
        </button>
      ) : (
        <MascotWidget
          onOpenPanel={() => {
            setOpen(true);
            void load();
          }}
        />
      )}

      {open ? (
        <div className="fixed inset-0 z-[110] flex items-end justify-end p-3 sm:p-6">
          <button
            type="button"
            className="absolute inset-0 bg-fg/20 backdrop-blur-[1px]"
            aria-label="关闭"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
            <header className="flex items-center justify-between border-b border-border bg-brand-soft/50 px-4 py-3">
              <div>
                <p className="text-xs font-medium text-brand">初筛 Agent</p>
                <p className="text-sm font-semibold text-fg">噜噜 · 简历助手</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1 text-muted hover:bg-surface-2"
                aria-label="关闭"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-4 text-sm">
              <p className="rounded-lg bg-surface-2 px-3 py-2 text-xs text-fg-soft">
                打开方式：<strong className="text-fg">顶栏「筛选助手」</strong> 或点侧栏吉祥物「噜噜」。Agent 在简历通过/未通过、性格未过线时会发通知邮件，正文在「筛选字段设置 → Agent
                通知邮件」编辑；需配置 SMTP（SMTP_HOST / SMTP_USER / SMTP_PASS 等）。运行后下方日志每人均含一行「邮件：已发送 / 未发（未配置
                SMTP）/ 发送失败…」。
              </p>
              <label className="flex items-center justify-between gap-3">
                <span className="text-fg-soft">开启后每分钟自动跑一轮</span>
                <input
                  type="checkbox"
                  checked={settings?.enabled ?? false}
                  onChange={(e) => void toggleEnabled(e.target.checked)}
                />
              </label>
              <label className="flex items-center justify-between gap-3">
                <span className="text-fg-soft">隐藏侧栏噜噜（仍可用顶栏打开）</span>
                <input
                  type="checkbox"
                  checked={settings?.mascotHidden ?? false}
                  onChange={(e) => void toggleMascotHidden(e.target.checked)}
                />
              </label>
              <p className="text-xs text-muted">
                ① 先勾选「要处理哪些阶段」的候选人；② 再分别勾选做「简历条件」或「性格分数」的阶段。性格不够分 → 人才库；简历条件不够 → 未通过。
              </p>

              <StageCheckGroup
                label="① Agent 要扫描哪些阶段（候选人正在这些阶段里才会被处理）"
                stages={rules.targetStages}
                onChange={(next) => setRules((r) => ({ ...r, targetStages: next }))}
              />
              <StageCheckGroup
                label="② 哪些阶段做「简历条件」筛选（学历、年限、通用测评分等）"
                stages={rules.resumeRuleStages}
                onChange={(next) => setRules((r) => ({ ...r, resumeRuleStages: next }))}
              />
              <StageCheckGroup
                label="② 哪些阶段只看「性格测评」分数（与笔试分开）"
                stages={rules.personalityStages}
                onChange={(next) => setRules((r) => ({ ...r, personalityStages: next }))}
              />
              <p className="text-[11px] text-muted">
                建议两类阶段不要选同一个；若重复选了同一阶段，会优先按性格规则处理。
              </p>

              <div className="rounded-xl border border-border bg-surface-2/60 px-3 py-2.5">
                <p className="text-xs font-medium text-fg-soft">简历条件里启用哪些维度</p>
                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-xs text-fg">
                  {(
                    [
                      ["education", "学历白名单"],
                      ["city", "城市"],
                      ["years", "工作年限"],
                      ["salary", "期望薪资"],
                    ] as const
                  ).map(([k, label]) => (
                    <label key={k} className="inline-flex cursor-pointer items-center gap-1.5">
                      <input
                        type="checkbox"
                        checked={rules.resumeUse[k]}
                        onChange={(e) =>
                          setRules((r) => ({
                            ...r,
                            resumeUse: { ...r.resumeUse, [k]: e.target.checked },
                          }))
                        }
                        className="rounded border-border"
                      />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <label className="text-xs text-fg-soft">性格测试用哪一项测评</label>
                  <select
                    className="mt-0.5 w-full rounded-xl border border-border bg-surface-2 px-2 py-1.5 text-sm"
                    value={rules.personalityAssessmentKey}
                    onChange={(e) => {
                      const nk = e.target.value;
                      setRules((r) => ({
                        ...r,
                        personalityAssessmentKey: nk,
                        resumeAssessmentMinKeys: r.resumeAssessmentMinKeys?.filter((x) => x !== nk),
                      }));
                    }}
                  >
                    {assessments.length === 0 ? (
                      <option value="">请先在「筛选字段设置」里添加测评</option>
                    ) : null}
                    {assessments.map((a) => (
                      <option key={a.key} value={a.key}>
                        {a.label} ({a.key})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-fg-soft">性格分 ≥（空＝不限制）</label>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded-xl border border-border bg-surface-2 px-2 py-1.5 text-sm"
                    value={rules.personalityMinScore ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      setRules((r) => {
                        if (raw === "") return { ...r, personalityMinScore: null };
                        const n = Number(raw);
                        return {
                          ...r,
                          personalityMinScore: Number.isFinite(n) ? n : r.personalityMinScore,
                        };
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-fg-soft">性格分 ≤（空＝不限制）</label>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded-xl border border-border bg-surface-2 px-2 py-1.5 text-sm"
                    value={rules.personalityMaxScore ?? ""}
                    onChange={(e) => {
                      const raw = e.target.value.trim();
                      setRules((r) => {
                        if (raw === "") return { ...r, personalityMaxScore: null };
                        const n = Number(raw);
                        return {
                          ...r,
                          personalityMaxScore: Number.isFinite(n) ? n : r.personalityMaxScore,
                        };
                      });
                    }}
                  />
                </div>
                <div>
                  <label className="text-xs text-fg-soft">性格通过后进入</label>
                  <select
                    className="mt-0.5 w-full rounded-xl border border-border bg-surface-2 px-2 py-1.5 text-sm"
                    value={rules.personalityPassStage}
                    onChange={(e) =>
                      setRules((r) => ({
                        ...r,
                        personalityPassStage: e.target.value as PipelineStage,
                      }))
                    }
                  >
                    {STAGE_PASS_TARGETS.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-fg-soft">简历条件通过后进入</label>
                  <select
                    className="mt-0.5 w-full rounded-xl border border-border bg-surface-2 px-2 py-1.5 text-sm"
                    value={rules.resumePassStage}
                    onChange={(e) =>
                      setRules((r) => ({
                        ...r,
                        resumePassStage: e.target.value as PipelineStage,
                      }))
                    }
                  >
                    {STAGE_PASS_TARGETS.map((s) => (
                      <option key={s} value={s}>
                        {STAGE_LABEL[s]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-fg-soft">学历白名单（逗号分隔，留空不限制）</label>
                <input
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
                  value={educationsText}
                  onChange={(e) => setEducationsText(e.target.value)}
                  onBlur={() => void saveRulesFromForm()}
                  placeholder="本科,硕士"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-fg-soft">城市包含（逗号，留空不限制）</label>
                <input
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm"
                  value={citiesText}
                  onChange={(e) => setCitiesText(e.target.value)}
                  onBlur={() => void saveRulesFromForm()}
                  placeholder="上海,杭州"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-fg-soft">年限下限</label>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded-xl border border-border bg-surface-2 px-2 py-1.5 text-sm"
                    value={rules.yearsMin ?? ""}
                    onChange={(e) =>
                      setRules((r) => ({
                        ...r,
                        yearsMin: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-fg-soft">年限上限</label>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded-xl border border-border bg-surface-2 px-2 py-1.5 text-sm"
                    value={rules.yearsMax ?? ""}
                    onChange={(e) =>
                      setRules((r) => ({
                        ...r,
                        yearsMax: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-fg-soft">期望薪资下限(K)</label>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded-xl border border-border bg-surface-2 px-2 py-1.5 text-sm"
                    value={rules.salaryMinK ?? ""}
                    onChange={(e) =>
                      setRules((r) => ({
                        ...r,
                        salaryMinK: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="text-xs text-fg-soft">期望薪资上限(K)</label>
                  <input
                    type="number"
                    className="mt-0.5 w-full rounded-xl border border-border bg-surface-2 px-2 py-1.5 text-sm"
                    value={rules.salaryMaxK ?? ""}
                    onChange={(e) =>
                      setRules((r) => ({
                        ...r,
                        salaryMaxK: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <p className="text-xs font-medium text-fg-soft">
                简历最低分（不含上面选中的性格项；勾选才参与简历条件）
              </p>
              {assessments
                .filter((a) => a.key !== personalityKeyTrim)
                .map((a) => (
                  <div key={a.key} className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 text-xs text-fg-soft">
                      <input
                        type="checkbox"
                        checked={resumeMinKeyIncluded(a.key)}
                        onChange={(e) => toggleResumeMinKey(a.key, e.target.checked)}
                        className="rounded border-border"
                      />
                      {a.label}
                    </label>
                    <input
                      type="number"
                      placeholder="最低分"
                      className="w-28 rounded-xl border border-border bg-surface-2 px-2 py-1.5 text-sm"
                      value={rules.assessmentMins[a.key] ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setRules((r) => {
                          const m = { ...r.assessmentMins };
                          if (raw === "") delete m[a.key];
                          else m[a.key] = Number(raw);
                          return { ...r, assessmentMins: m };
                        });
                      }}
                    />
                  </div>
                ))}

              <button
                type="button"
                onClick={() => void pushRules()}
                className="w-full rounded-xl border border-border py-2 text-sm font-medium text-fg hover:bg-surface-2"
              >
                保存筛选规则
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => void runAgent()}
                className="w-full rounded-xl bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
              >
                {busy ? "执行中…" : "立即运行 Agent"}
              </button>

              {log || settings?.lastRunLog ? (
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-surface-2 p-3 text-xs text-fg-soft">
                  {log ?? settings?.lastRunLog}
                </pre>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function StageCheckGroup({
  label,
  stages,
  onChange,
}: {
  label: string;
  stages: PipelineStage[];
  onChange: (next: PipelineStage[]) => void;
}) {
  const toggle = (s: PipelineStage) => {
    if (stages.includes(s)) onChange(stages.filter((x) => x !== s));
    else onChange([...stages, s]);
  };
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-fg-soft">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {AGENT_STAGE_OPTIONS.map((s) => (
          <label
            key={s}
            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-border bg-surface-2 px-2 py-1 text-[11px] text-fg-soft"
          >
            <input
              type="checkbox"
              checked={stages.includes(s)}
              onChange={() => toggle(s)}
              className="rounded border-border"
            />
            {STAGE_LABEL[s]}
          </label>
        ))}
      </div>
    </div>
  );
}
