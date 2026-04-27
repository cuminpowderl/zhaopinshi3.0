"use client";

import type {
  Assessment,
  Candidate,
  CustomField,
} from "@prisma/client";
import { useState } from "react";
import { SOURCE_OPTIONS } from "@/lib/candidate-source";
import { parseSelectOptions } from "@/lib/filters";
import { PIPELINE_STAGES, STAGE_LABEL } from "@/lib/pipeline-labels";

type CandidateSource = string;
type PipelineStage = string;

type Row = Candidate & {
  fieldValues: { value: string; field: CustomField }[];
  scores: { score: number; assessment: Assessment }[];
};

type Props = {
  mode: "create" | "edit";
  initial: Row | null;
  fields: CustomField[];
  assessments: Assessment[];
  onClose: () => void;
  onSaved: () => Promise<void>;
};

export function CandidateEditor({
  mode,
  initial,
  fields,
  assessments,
  onClose,
  onSaved,
}: Props) {
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const [source, setSource] = useState<CandidateSource>(initial?.source ?? "OTHER");
  const [stage, setStage] = useState<PipelineStage>(initial?.stage ?? "RESUME_FIRST");
  const [expectedSalary, setExpectedSalary] = useState(initial?.expectedSalary ?? "");
  const [resumeImageUrl, setResumeImageUrl] = useState(initial?.resumeImageUrl ?? "");
  const [resumeImageMime, setResumeImageMime] = useState("image/png");
  const [requeueAgent, setRequeueAgent] = useState(false);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrNotice, setOcrNotice] = useState<string | null>(null);

  const [fieldDraft, setFieldDraft] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const f of fields) {
      const v = initial?.fieldValues.find((x) => x.field.key === f.key);
      o[f.key] = v?.value ?? "";
    }
    return o;
  });
  const [scoreDraft, setScoreDraft] = useState<Record<string, string>>(() => {
    const o: Record<string, string> = {};
    for (const a of assessments) {
      const s = initial?.scores.find((x) => x.assessment.key === a.key);
      o[a.key] = s != null ? String(s.score) : "";
    }
    return o;
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const uploadResumeImage = async (file: File) => {
    setErr(null);
    setOcrNotice(null);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/resume/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const j = (await res.json()) as { error?: string };
      throw new Error(j.error ?? "上传失败");
    }
    const j = (await res.json()) as { url: string; mime?: string };
    setResumeImageUrl(j.url);
    if (j.mime?.startsWith("image/")) setResumeImageMime(j.mime);
    else if (file.type.startsWith("image/")) setResumeImageMime(file.type);
    else setResumeImageMime("image/png");
  };

  const runOcr = async () => {
    if (!resumeImageUrl) {
      setOcrNotice("请先上传简历图片。");
      return;
    }
    setOcrBusy(true);
    setOcrNotice(null);
    try {
      const res = await fetch("/api/resume/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: resumeImageUrl, mime: resumeImageMime }),
      });
      const j = (await res.json()) as {
        partial?: Record<string, string | undefined>;
        notice?: string;
        error?: string;
        detail?: string;
        hint?: string;
      };
      if (!res.ok) {
        const extra = [j.detail, j.hint].filter(Boolean).join(" ");
        throw new Error([j.error ?? "识别失败", extra].filter(Boolean).join(" — "));
      }
      const p = j.partial ?? {};
      if (p.name) setName(p.name);
      if (p.email) setEmail(p.email);
      if (p.phone) setPhone(p.phone);
      if (p.expectedSalary) setExpectedSalary(p.expectedSalary);
      setFieldDraft((d) => ({
        ...d,
        ...(p.education ? { education: p.education } : {}),
        ...(p.years ? { years: p.years } : {}),
        ...(p.city ? { city: p.city } : {}),
      }));
      setOcrNotice(j.notice ?? "已根据图片填充，请核对后保存。");
    } catch (e) {
      setOcrNotice(e instanceof Error ? e.message : "识别失败");
    } finally {
      setOcrBusy(false);
    }
  };

  const submit = async () => {
    setErr(null);
    for (const f of fields) {
      if (f.type !== "NUMBER") continue;
      const raw = fieldDraft[f.key]?.trim();
      if (!raw) continue;
      const n = Number(raw);
      if (Number.isNaN(n)) {
        setErr(`「${f.label}」请填写有效数字`);
        return;
      }
      if (f.numberMin != null && n < f.numberMin) {
        setErr(`「${f.label}」不能小于 ${f.numberMin}`);
        return;
      }
      if (f.numberMax != null && n > f.numberMax) {
        setErr(`「${f.label}」不能大于 ${f.numberMax}`);
        return;
      }
    }
    setSaving(true);
    try {
      const scores: Record<string, number> = {};
      for (const a of assessments) {
        const raw = scoreDraft[a.key]?.trim();
        if (raw === "") continue;
        const n = Number(raw);
        if (Number.isNaN(n)) continue;
        scores[a.key] = n;
      }
      const body = {
        name,
        email,
        phone: phone || undefined,
        note: note || undefined,
        source,
        stage: mode === "edit" && requeueAgent ? ("RESUME_FIRST" as PipelineStage) : stage,
        expectedSalary: expectedSalary || undefined,
        resumeImageUrl: resumeImageUrl || undefined,
        fields: fieldDraft,
        scores,
        ...(mode === "edit" && requeueAgent ? { resetAgent: true } : {}),
      };
      if (mode === "create") {
        const res = await fetch("/api/candidates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error ?? "保存失败");
        }
      } else if (initial) {
        const res = await fetch(`/api/candidates/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const j = (await res.json()) as { error?: string };
          throw new Error(j.error ?? "保存失败");
        }
      }
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const rejectToTalentPool = async () => {
    if (!initial || mode !== "edit") return;
    if (!window.confirm("发送人才库通知邮件，并将候选人移入「人才库」？")) return;
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch(`/api/candidates/${initial.id}/talent-pool`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sendEmail: true }),
      });
      if (!res.ok) throw new Error("操作失败");
      await onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "操作失败");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!initial || mode !== "edit") return;
    if (!window.confirm("确定删除该候选人？")) return;
    setSaving(true);
    try {
      await fetch(`/api/candidates/${initial.id}`, { method: "DELETE" });
      await onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-fg/25 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="关闭"
      />
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-border bg-surface shadow-2xl sm:rounded-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-border bg-surface px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-fg">
            {mode === "create" ? "新建候选人" : "编辑候选人"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-fg"
            aria-label="关闭"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-4 p-5">
          {err ? (
            <p className="rounded-xl bg-brand-soft/80 px-3 py-2 text-sm text-brand">{err}</p>
          ) : null}

          <div className="rounded-xl border border-border bg-surface-2 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted uppercase tracking-wide">简历图片</p>
            <div className="flex flex-wrap gap-2 items-center">
              <label className="inline-flex cursor-pointer rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white hover:bg-brand-hover">
                上传图片
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void uploadResumeImage(f).catch((ex) => setErr(String(ex)));
                    e.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                disabled={ocrBusy || !resumeImageUrl}
                onClick={() => void runOcr()}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-surface disabled:opacity-50"
              >
                {ocrBusy ? "识别中…" : "识别并填充"}
              </button>
            </div>
            {resumeImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resumeImageUrl}
                alt="简历预览"
                className="mt-2 max-h-40 rounded-lg border border-border object-contain"
              />
            ) : null}
            {ocrNotice ? <p className="text-xs text-fg-soft">{ocrNotice}</p> : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-fg-soft">来源</label>
              <select
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                value={source}
                onChange={(e) => setSource(e.target.value as CandidateSource)}
              >
                {SOURCE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-fg-soft">流程阶段</label>
              <select
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                value={stage}
                onChange={(e) => setStage(e.target.value as PipelineStage)}
              >
                {PIPELINE_STAGES.map((s) => (
                  <option key={s} value={s}>
                    {STAGE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-fg-soft">期望薪资</label>
              <input
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                placeholder="如 18-25K"
                value={expectedSalary}
                onChange={(e) => setExpectedSalary(e.target.value)}
              />
            </div>
            {mode === "edit" ? (
              <label className="flex items-center gap-2 text-xs text-fg-soft sm:col-span-2">
                <input
                  type="checkbox"
                  checked={requeueAgent}
                  onChange={(e) => setRequeueAgent(e.target.checked)}
                />
                移回「简历初筛」并清空 Agent 处理标记（可再次自动初筛）
              </label>
            ) : null}
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-fg-soft">姓名 *</label>
              <input
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-1">
              <label className="text-xs font-medium text-fg-soft">邮箱 *</label>
              <input
                type="email"
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <label className="text-xs font-medium text-fg-soft">手机</label>
              <input
                className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {fields.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">自定义字段</p>
              {fields.map((f) => (
                <div key={f.id} className="space-y-1.5">
                  <label className="text-xs font-medium text-fg-soft">{f.label}</label>
                  {f.type === "SELECT" ? (
                    <select
                      className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                      value={fieldDraft[f.key] ?? ""}
                      onChange={(e) =>
                        setFieldDraft((d) => ({ ...d, [f.key]: e.target.value }))
                      }
                    >
                      <option value="">未填</option>
                      {parseSelectOptions(f.options).map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {f.type === "TEXT" ? (
                    <input
                      className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                      value={fieldDraft[f.key] ?? ""}
                      onChange={(e) =>
                        setFieldDraft((d) => ({ ...d, [f.key]: e.target.value }))
                      }
                    />
                  ) : null}
                  {f.type === "NUMBER" ? (
                    <input
                      type="number"
                      min={f.numberMin ?? undefined}
                      max={f.numberMax ?? undefined}
                      placeholder={
                        f.numberMin != null || f.numberMax != null
                          ? `建议 ${f.numberMin ?? "—"}～${f.numberMax ?? "—"}`
                          : "数字"
                      }
                      className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                      value={fieldDraft[f.key] ?? ""}
                      onChange={(e) =>
                        setFieldDraft((d) => ({ ...d, [f.key]: e.target.value }))
                      }
                    />
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {assessments.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">测评成绩</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {assessments.map((a) => (
                  <div key={a.id} className="space-y-1.5">
                    <label className="text-xs font-medium text-fg-soft">
                      {a.label}{" "}
                      <span className="text-muted">/ {a.maxScore}</span>
                    </label>
                    <input
                      type="number"
                      className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                      value={scoreDraft[a.key] ?? ""}
                      onChange={(e) =>
                        setScoreDraft((d) => ({ ...d, [a.key]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-soft">备注</label>
            <textarea
              rows={2}
              className="w-full resize-none rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-5 py-4">
          <div className="flex flex-wrap gap-3">
            {mode === "edit" ? (
              <>
                <button
                  type="button"
                  onClick={() => void rejectToTalentPool()}
                  disabled={saving}
                  className="text-sm font-medium text-fg hover:underline"
                >
                  淘汰并入人才库（发邮件）
                </button>
                <button
                  type="button"
                  onClick={() => void remove()}
                  disabled={saving}
                  className="text-sm font-medium text-muted hover:text-brand"
                >
                  删除
                </button>
              </>
            ) : (
              <span />
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-soft hover:bg-surface-2"
            >
              取消
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void submit()}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-60"
            >
              {saving ? "保存中…" : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
