"use client";

import type { Assessment, CustomField } from "@prisma/client";
import { useCallback, useEffect, useState } from "react";
import { MAIL_DEFAULTS } from "@/lib/agent-mail-templates";
import { parseRulesJson, type AgentRules } from "@/lib/agent-rules";
import { fetchBootstrapCached } from "@/lib/bootstrap-client";
import { parseSelectOptions } from "@/lib/filters";

type FieldType = "SELECT" | "TEXT" | "NUMBER";

type Payload = { fields: CustomField[]; assessments: Assessment[] };

type AgentSettingsRow = { rulesJson: string };

function notifyCandidatesReload() {
  window.dispatchEvent(new Event("chaopin:candidates-reload"));
}

export function SettingsView() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [fieldLabel, setFieldLabel] = useState("");
  const [fieldType, setFieldType] = useState<FieldType>("TEXT");
  const [fieldOptions, setFieldOptions] = useState("本科,硕士,博士");
  const [assessLabel, setAssessLabel] = useState("");
  const [assessMax, setAssessMax] = useState("100");
  const [msg, setMsg] = useState<string | null>(null);
  const [mailSaving, setMailSaving] = useState(false);

  const [editFieldId, setEditFieldId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");
  const [editOptions, setEditOptions] = useState("");
  const [editNumMin, setEditNumMin] = useState("");
  const [editNumMax, setEditNumMax] = useState("");

  const [mPassSub, setMPassSub] = useState<string>(MAIL_DEFAULTS.resumePassSubject);
  const [mPassBody, setMPassBody] = useState<string>(MAIL_DEFAULTS.resumePassBody);
  const [mFailSub, setMFailSub] = useState<string>(MAIL_DEFAULTS.resumeFailSubject);
  const [mFailBody, setMFailBody] = useState<string>(MAIL_DEFAULTS.resumeFailBody);
  const [mPoolSub, setMPoolSub] = useState<string>(MAIL_DEFAULTS.talentPoolSubject);
  const [mPoolBody, setMPoolBody] = useState<string>(MAIL_DEFAULTS.talentPoolBody);

  const syncMailFromRules = useCallback((rules: AgentRules) => {
    const e = rules.emailNotify;
    setMPassSub(e?.resumePassSubject ?? MAIL_DEFAULTS.resumePassSubject);
    setMPassBody(e?.resumePassBody ?? MAIL_DEFAULTS.resumePassBody);
    setMFailSub(e?.resumeFailSubject ?? MAIL_DEFAULTS.resumeFailSubject);
    setMFailBody(e?.resumeFailBody ?? MAIL_DEFAULTS.resumeFailBody);
    setMPoolSub(e?.talentPoolSubject ?? MAIL_DEFAULTS.talentPoolSubject);
    setMPoolBody(e?.talentPoolBody ?? MAIL_DEFAULTS.talentPoolBody);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bootstrap, aRes] = await Promise.all([
        fetchBootstrapCached(),
        fetch("/api/agent/settings"),
      ]);
      setData(bootstrap);
      if (aRes.ok) {
        const s = (await aRes.json()) as AgentSettingsRow;
        syncMailFromRules(parseRulesJson(s.rulesJson));
      }
    } finally {
      setLoading(false);
    }
  }, [syncMailFromRules]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveAgentMail = async () => {
    setMsg(null);
    setMailSaving(true);
    try {
      const aRes = await fetch("/api/agent/settings");
      if (!aRes.ok) {
        setMsg("无法读取 Agent 设置");
        return;
      }
      const s = (await aRes.json()) as AgentSettingsRow;
      const r = parseRulesJson(s.rulesJson);
      const next: AgentRules = {
        ...r,
        emailNotify: {
          resumePassSubject: mPassSub.trim(),
          resumePassBody: mPassBody,
          resumeFailSubject: mFailSub.trim(),
          resumeFailBody: mFailBody,
          talentPoolSubject: mPoolSub.trim(),
          talentPoolBody: mPoolBody,
        },
      };
      const patch = await fetch("/api/agent/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rulesJson: JSON.stringify(next) }),
      });
      if (!patch.ok) {
        const j = (await patch.json()) as { error?: string };
        setMsg(j.error ?? "保存邮件模板失败");
        return;
      }
      setMsg("已保存 Agent 通知邮件模板。");
    } finally {
      setMailSaving(false);
    }
  };

  const resetAgentMail = () => {
    setMPassSub(MAIL_DEFAULTS.resumePassSubject);
    setMPassBody(MAIL_DEFAULTS.resumePassBody);
    setMFailSub(MAIL_DEFAULTS.resumeFailSubject);
    setMFailBody(MAIL_DEFAULTS.resumeFailBody);
    setMPoolSub(MAIL_DEFAULTS.talentPoolSubject);
    setMPoolBody(MAIL_DEFAULTS.talentPoolBody);
  };

  const openFieldEditor = (f: CustomField) => {
    setMsg(null);
    setEditFieldId(f.id);
    setEditLabel(f.label);
    setEditOptions(parseSelectOptions(f.options).join("，"));
    setEditNumMin(f.numberMin != null ? String(f.numberMin) : "");
    setEditNumMax(f.numberMax != null ? String(f.numberMax) : "");
  };

  const saveFieldEditor = async () => {
    if (!editFieldId) return;
    const f = data?.fields.find((x) => x.id === editFieldId);
    if (!f) return;
    setMsg(null);
    if (!editLabel.trim()) {
      setMsg("显示名称不能为空");
      return;
    }
    const body: Record<string, unknown> = { label: editLabel.trim() };
    if (f.type === "SELECT") {
      body.options = editOptions
        .split(/[,，]/)
        .map((s) => s.trim())
        .filter(Boolean);
    }
    if (f.type === "NUMBER") {
      body.numberMin = editNumMin.trim() === "" ? null : Number(editNumMin);
      body.numberMax = editNumMax.trim() === "" ? null : Number(editNumMax);
    }
    const res = await fetch(`/api/fields/${editFieldId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "保存失败");
      return;
    }
    setEditFieldId(null);
    await load();
    notifyCandidatesReload();
  };

  const deleteField = async (f: CustomField) => {
    if (!window.confirm(`确定删除字段「${f.label}」？已有候选人上的该字段值会一并删除。`)) return;
    setMsg(null);
    const res = await fetch(`/api/fields/${f.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "删除失败");
      return;
    }
    if (editFieldId === f.id) setEditFieldId(null);
    await load();
    notifyCandidatesReload();
  };

  const deleteAssessment = async (a: Assessment) => {
    if (!window.confirm(`确定删除测评「${a.label}」？已有分数会一并删除。`)) return;
    setMsg(null);
    const res = await fetch(`/api/assessments/${a.id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "删除失败");
      return;
    }
    await load();
    notifyCandidatesReload();
  };

  const patchFieldInUse = async (id: string, inUse: boolean) => {
    setMsg(null);
    // 受控勾选：先乐观更新，否则在 PATCH 返回前 React 会用旧 props 把勾拉回
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map((f) => (f.id === id ? { ...f, inUse } : f)),
      };
    });
    const res = await fetch(`/api/fields/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inUse }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "更新显示开关失败，请确认已 prisma db push 并重启 dev。");
      await load();
      return;
    }
    const updated = (await res.json()) as CustomField;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map((f) => (f.id === id ? updated : f)),
      };
    });
    notifyCandidatesReload();
  };

  const patchAssessmentInUse = async (id: string, inUse: boolean) => {
    setMsg(null);
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        assessments: prev.assessments.map((a) => (a.id === id ? { ...a, inUse } : a)),
      };
    });
    const res = await fetch(`/api/assessments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inUse }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "更新失败，请确认数据库已迁移。");
      await load();
      return;
    }
    const updated = (await res.json()) as Assessment;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        assessments: prev.assessments.map((a) => (a.id === id ? updated : a)),
      };
    });
    notifyCandidatesReload();
  };

  const addField = async () => {
    setMsg(null);
    const options =
      fieldType === "SELECT"
        ? fieldOptions
            .split(/[,，]/)
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined;
    const res = await fetch("/api/fields", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: fieldLabel,
        type: fieldType,
        options,
      }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "添加失败");
      return;
    }
    setFieldLabel("");
    setFieldOptions("本科,硕士,博士");
    setFieldType("TEXT");
    await load();
    notifyCandidatesReload();
  };

  const addAssessment = async () => {
    setMsg(null);
    const res = await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: assessLabel,
        maxScore: Number(assessMax),
      }),
    });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      setMsg(j.error ?? "添加失败");
      return;
    }
    setAssessLabel("");
    setAssessMax("100");
    await load();
    notifyCandidatesReload();
  };

  const typeLabel = (t: string) => {
    if (t === "SELECT") return "选项";
    if (t === "NUMBER") return "数字";
    return "文本";
  };

  if (loading && !data) {
    return <p className="text-sm text-muted">加载中…</p>;
  }

  const fields = data?.fields ?? [];
  const assessments = data?.assessments ?? [];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-display text-xl font-semibold text-fg">筛选字段设置</h1>
        <p className="mt-1 text-sm text-muted">
          仅<strong className="text-fg">勾选「在候选人中显示」</strong>的字段/测评会出现在候选人列表、筛选与编辑里；取消勾选即隐藏。修改后请到候选人页刷新。
        </p>
      </div>

      {msg ? (
        <p className="rounded-xl bg-brand-soft/80 px-3 py-2 text-sm text-brand">{msg}</p>
      ) : null}

      <section className="rounded-2xl border border-border bg-surface p-5">
        <h2 className="font-display text-base font-semibold text-fg">Agent 通知邮件</h2>
        <p className="mt-1 text-xs text-muted">
          Agent 在「简历通过 / 简历未通过 / 性格未过线进人才库」时会发信（需配置 SMTP）。正文可用占位符{" "}
          <code className="rounded bg-surface-2 px-1">{"{{name}}"}</code>。保存后筛选助手运行日志中会逐条显示「已发送 / 未发（未配置
          SMTP）/ 发送失败」。
        </p>
        <div className="mt-4 space-y-4 text-sm">
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-xs font-medium text-fg-soft">简历条件通过</p>
            <input
              className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
              value={mPassSub}
              onChange={(e) => setMPassSub(e.target.value)}
              placeholder="主题"
            />
            <textarea
              rows={4}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
              value={mPassBody}
              onChange={(e) => setMPassBody(e.target.value)}
            />
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-xs font-medium text-fg-soft">简历条件未通过</p>
            <input
              className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
              value={mFailSub}
              onChange={(e) => setMFailSub(e.target.value)}
            />
            <textarea
              rows={4}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
              value={mFailBody}
              onChange={(e) => setMFailBody(e.target.value)}
            />
          </div>
          <div className="rounded-xl border border-border bg-surface-2 p-3">
            <p className="text-xs font-medium text-fg-soft">性格未过线 → 人才库</p>
            <input
              className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
              value={mPoolSub}
              onChange={(e) => setMPoolSub(e.target.value)}
            />
            <textarea
              rows={4}
              className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
              value={mPoolBody}
              onChange={(e) => setMPoolBody(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={mailSaving}
              onClick={() => void saveAgentMail()}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {mailSaving ? "保存中…" : "保存邮件模板"}
            </button>
            <button
              type="button"
              onClick={resetAgentMail}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg hover:bg-surface-2"
            >
              恢复默认文案
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-display text-base font-semibold text-fg">自定义字段</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {fields.length === 0 ? (
              <li className="text-muted">暂无字段</li>
            ) : (
              fields.map((f) => (
                <li key={f.id} className="rounded-xl bg-surface-2 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-fg">{f.label}</span>
                    <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <span>
                        {f.key} · {typeLabel(f.type)}
                      </span>
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-fg-soft">
                        <input
                          type="checkbox"
                          checked={f.inUse !== false}
                          onChange={(e) => void patchFieldInUse(f.id, e.target.checked)}
                          className="rounded border-border"
                        />
                        在候选人中显示
                      </label>
                      <button
                        type="button"
                        onClick={() => openFieldEditor(f)}
                        className="text-brand hover:underline"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => void deleteField(f)}
                        className="text-muted hover:text-brand"
                      >
                        删除
                      </button>
                    </span>
                  </div>
                  {editFieldId === f.id ? (
                    <div className="mt-3 space-y-2 border-t border-border pt-3">
                      <input
                        className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        placeholder="显示名称"
                      />
                      {f.type === "SELECT" ? (
                        <input
                          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                          value={editOptions}
                          onChange={(e) => setEditOptions(e.target.value)}
                          placeholder="选项，逗号分隔"
                        />
                      ) : null}
                      {f.type === "NUMBER" ? (
                        <div className="flex flex-wrap gap-2">
                          <input
                            type="number"
                            className="min-w-[6rem] flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                            value={editNumMin}
                            onChange={(e) => setEditNumMin(e.target.value)}
                            placeholder="建议最小"
                          />
                          <input
                            type="number"
                            className="min-w-[6rem] flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-sm"
                            value={editNumMax}
                            onChange={(e) => setEditNumMax(e.target.value)}
                            placeholder="建议最大"
                          />
                        </div>
                      ) : null}
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => void saveFieldEditor()}
                          className="rounded-lg bg-brand px-3 py-1 text-xs font-medium text-white"
                        >
                          保存
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditFieldId(null)}
                          className="rounded-lg border border-border px-3 py-1 text-xs"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  ) : null}
                </li>
              ))
            )}
          </ul>
          <div className="mt-6 space-y-3 border-t border-border pt-5">
            <input
              placeholder="字段名称，例如：期望职级"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
            />
            <select
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
              value={fieldType}
              onChange={(e) => setFieldType(e.target.value as FieldType)}
            >
              <option value="TEXT">文本（筛选为完全匹配）</option>
              <option value="NUMBER">数字（筛选为区间）</option>
              <option value="SELECT">选项（下拉）</option>
            </select>
            {fieldType === "SELECT" ? (
              <input
                placeholder="选项，用逗号分隔"
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                value={fieldOptions}
                onChange={(e) => setFieldOptions(e.target.value)}
              />
            ) : null}
            <button
              type="button"
              onClick={() => void addField()}
              className="w-full rounded-xl bg-brand py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
            >
              添加字段
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-5">
          <h2 className="font-display text-base font-semibold text-fg">测评项</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {assessments.length === 0 ? (
              <li className="text-muted">暂无测评</li>
            ) : (
              assessments.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-2 px-3 py-2"
                >
                  <span className="font-medium text-fg">{a.label}</span>
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted">
                    <span>
                      {a.key} · 满分 {a.maxScore}
                    </span>
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-fg-soft">
                      <input
                        type="checkbox"
                        checked={a.inUse !== false}
                        onChange={(e) => void patchAssessmentInUse(a.id, e.target.checked)}
                        className="rounded border-border"
                      />
                      在候选人中显示
                    </label>
                    <button
                      type="button"
                      onClick={() => void deleteAssessment(a)}
                      className="text-muted hover:text-brand"
                    >
                      删除
                    </button>
                  </span>
                </li>
              ))
            )}
          </ul>
          <div className="mt-6 space-y-3 border-t border-border pt-5">
            <input
              placeholder="测评名称，例如：性格测试"
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
              value={assessLabel}
              onChange={(e) => setAssessLabel(e.target.value)}
            />
            <div>
              <label className="text-xs font-medium text-fg-soft">量表满分</label>
              <input
                type="number"
                min={1}
                max={1000}
                className="mt-1 w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                value={assessMax}
                onChange={(e) => setAssessMax(e.target.value)}
              />
            </div>
            <button
              type="button"
              onClick={() => void addAssessment()}
              className="w-full rounded-xl border border-border py-2.5 text-sm font-medium text-fg hover:bg-surface-2"
            >
              添加测评
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
