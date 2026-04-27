"use client";

import type {
  Assessment,
  Candidate,
  CustomField,
  FieldType,
  PipelineStage,
} from "@prisma/client";
import { useEffect, useRef, useState } from "react";
import { sourceLabel } from "@/lib/candidate-source";
import { parseSelectOptions } from "@/lib/filters";
import { PIPELINE_STAGES, STAGE_LABEL } from "@/lib/pipeline-labels";
import { CandidateEditor } from "./candidate-editor";

type CandidateRow = Candidate & {
  fieldValues: { value: string; field: CustomField }[];
  scores: { score: number; assessment: Assessment }[];
};

type Payload = {
  candidates: CandidateRow[];
  fields: CustomField[];
  assessments: Assessment[];
};

function buildSearchParams(
  fields: CustomField[],
  assessments: Assessment[],
  draft: Record<string, string>,
): URLSearchParams {
  const p = new URLSearchParams();
  for (const f of fields) {
    if (f.type === "SELECT" || f.type === "TEXT") {
      const v = draft[`f_${f.key}`]?.trim();
      if (v) p.set(`f_${f.key}`, v);
    }
    if (f.type === "NUMBER") {
      const a = draft[`f_${f.key}_min`]?.trim();
      const b = draft[`f_${f.key}_max`]?.trim();
      if (a) p.set(`f_${f.key}_min`, a);
      if (b) p.set(`f_${f.key}_max`, b);
    }
  }
  for (const a of assessments) {
    const lo = draft[`a_${a.key}_min`]?.trim();
    const hi = draft[`a_${a.key}_max`]?.trim();
    if (lo) p.set(`a_${a.key}_min`, lo);
    if (hi) p.set(`a_${a.key}_max`, hi);
  }
  return p;
}

export function CandidatesView() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [stageFilter, setStageFilter] = useState<PipelineStage | "">("");
  const [editor, setEditor] = useState<CandidateRow | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fields = data?.fields ?? [];
  const assessments = data?.assessments ?? [];
  const candidates = data?.candidates ?? [];
  const colSpan = 6 + fields.length + assessments.length;

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const metaFields = data?.fields ?? [];
      const metaAssess = data?.assessments ?? [];
      const params =
        metaFields.length > 0
          ? buildSearchParams(metaFields, metaAssess, draft)
          : new URLSearchParams();
      if (stageFilter) params.set("stage", stageFilter);
      const res = await fetch(`/api/candidates?${params.toString()}`);
      if (!res.ok) throw new Error("加载失败");
      const json = (await res.json()) as Payload;
      setData(json);
    } catch {
      setError("无法加载数据，请确认已执行 prisma 迁移与种子。");
    } finally {
      setLoading(false);
    }
  };

  const fetchListRef = useRef(fetchList);
  fetchListRef.current = fetchList;

  useEffect(() => {
    void fetchListRef.current();
  }, []);

  useEffect(() => {
    const onReload = () => void fetchListRef.current();
    window.addEventListener("chaopin:candidates-reload", onReload);
    return () => window.removeEventListener("chaopin:candidates-reload", onReload);
  }, []);

  const applyFilters = () => void fetchList();

  const clearFilters = () => {
    setDraft({});
    setStageFilter("");
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/candidates");
        if (!res.ok) throw new Error("加载失败");
        const json = (await res.json()) as Payload;
        setData(json);
      } catch {
        setError("无法加载数据。");
      } finally {
        setLoading(false);
      }
    })();
  };

  const fieldCell = (row: CandidateRow, key: string) => {
    const v = row.fieldValues.find((x) => x.field.key === key);
    return v?.value ?? "—";
  };

  const scoreCell = (row: CandidateRow, key: string) => {
    const s = row.scores.find((x) => x.assessment.key === key);
    return s != null ? String(s.score) : "—";
  };

  const fieldTypeLabel = (t: FieldType) => {
    if (t === "SELECT") return "选项";
    if (t === "NUMBER") return "数字";
    return "文本";
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center text-sm text-fg-soft">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-xl font-semibold text-fg">候选人</h1>
          <p className="mt-0.5 text-sm text-muted">
            共 <span className="font-medium tabular-nums text-fg">{candidates.length}</span>{" "}
            人（当前筛选结果）
          </p>
        </div>
        <button
          type="button"
          onClick={() => setEditor("new")}
          className="inline-flex items-center justify-center rounded-xl bg-brand px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-hover"
        >
          新建候选人
        </button>
      </div>

      <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-base font-semibold text-fg">筛选候选人</h2>
            <p className="mt-0.5 text-xs text-muted">
              字段与测评在「筛选字段设置」里维护；这里只筛选。学历、年限、城市在编辑候选人时填写。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-fg-soft hover:bg-surface-2"
            >
              清空
            </button>
            <button
              type="button"
              onClick={applyFilters}
              disabled={!data}
              className="rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white hover:bg-brand-hover disabled:opacity-50"
            >
              应用筛选
            </button>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-fg-soft">流程阶段</label>
            <select
              className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
              value={stageFilter}
              onChange={(e) =>
                setStageFilter((e.target.value || "") as PipelineStage | "")
              }
            >
              <option value="">全部阶段</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          {fields.map((f) => (
            <div key={f.id} className="space-y-1.5">
              <label className="text-xs font-medium text-fg-soft">
                {f.label}
                <span className="ml-1 text-muted">({fieldTypeLabel(f.type)})</span>
              </label>
              {f.type === "SELECT" ? (
                <select
                  className="w-full rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                  value={draft[`f_${f.key}`] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [`f_${f.key}`]: e.target.value }))
                  }
                >
                  <option value="">全部</option>
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
                  placeholder="完全匹配"
                  value={draft[`f_${f.key}`] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [`f_${f.key}`]: e.target.value }))
                  }
                />
              ) : null}
              {f.type === "NUMBER" ? (
                <div className="flex gap-2">
                  <input
                    type="number"
                    className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                    placeholder="最小"
                    value={draft[`f_${f.key}_min`] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [`f_${f.key}_min`]: e.target.value }))
                    }
                  />
                  <input
                    type="number"
                    className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                    placeholder="最大"
                    value={draft[`f_${f.key}_max`] ?? ""}
                    onChange={(e) =>
                      setDraft((d) => ({ ...d, [`f_${f.key}_max`]: e.target.value }))
                    }
                  />
                </div>
              ) : null}
            </div>
          ))}
          {assessments.map((a) => (
            <div key={a.id} className="space-y-1.5">
              <label className="text-xs font-medium text-fg-soft">
                {a.label}
                <span className="ml-1 text-muted">(0–{a.maxScore})</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                  placeholder="最低分"
                  value={draft[`a_${a.key}_min`] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [`a_${a.key}_min`]: e.target.value }))
                  }
                />
                <input
                  type="number"
                  className="min-w-0 flex-1 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm outline-none ring-brand focus:ring-2"
                  placeholder="最高分"
                  value={draft[`a_${a.key}_max`] ?? ""}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, [`a_${a.key}_max`]: e.target.value }))
                  }
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2 text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-4 py-3">姓名</th>
                <th className="px-4 py-3">邮箱</th>
                <th className="px-4 py-3 whitespace-nowrap">阶段</th>
                <th className="px-4 py-3 whitespace-nowrap">来源</th>
                <th className="px-4 py-3 whitespace-nowrap">期望薪资</th>
                {fields.map((f) => (
                  <th key={f.id} className="px-4 py-3 whitespace-nowrap">
                    {f.label}
                  </th>
                ))}
                {assessments.map((a) => (
                  <th key={a.id} className="px-4 py-3 whitespace-nowrap">
                    {a.label}
                  </th>
                ))}
                <th className="px-4 py-3 w-24" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-muted">
                    加载中…
                  </td>
                </tr>
              ) : candidates.length === 0 ? (
                <tr>
                  <td colSpan={colSpan} className="px-4 py-10 text-center text-muted">
                    没有符合筛选的候选人
                  </td>
                </tr>
              ) : (
                candidates.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border last:border-0 hover:bg-surface-2/80"
                  >
                    <td className="px-4 py-3 font-medium text-fg">{row.name}</td>
                    <td className="px-4 py-3 text-fg-soft">{row.email}</td>
                    <td className="px-4 py-3 text-xs text-fg-soft whitespace-nowrap">
                      {STAGE_LABEL[row.stage]}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-soft whitespace-nowrap">
                      {sourceLabel(row.source)}
                    </td>
                    <td className="px-4 py-3 text-xs text-fg-soft whitespace-nowrap">
                      {row.expectedSalary ?? "—"}
                    </td>
                    {fields.map((f) => (
                      <td key={f.id} className="px-4 py-3 text-fg-soft whitespace-nowrap">
                        {fieldCell(row, f.key)}
                      </td>
                    ))}
                    {assessments.map((a) => (
                      <td
                        key={a.id}
                        className="px-4 py-3 tabular-nums text-fg-soft whitespace-nowrap"
                      >
                        {scoreCell(row, a.key)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setEditor(row)}
                        className="text-sm font-medium text-brand hover:underline"
                      >
                        编辑
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editor ? (
        <CandidateEditor
          mode={editor === "new" ? "create" : "edit"}
          initial={editor === "new" ? null : editor}
          fields={fields}
          assessments={assessments}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await fetchList();
          }}
        />
      ) : null}
    </div>
  );
}
