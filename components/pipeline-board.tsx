"use client";

import type { Assessment, Candidate, CustomField } from "@prisma/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PIPELINE_STAGES, STAGE_LABEL } from "@/lib/pipeline-labels";
import { sourceLabel } from "@/lib/candidate-source";
import { CandidateEditor } from "./candidate-editor";

type PipelineStage = string;

type Row = Candidate & {
  fieldValues: { value: string; field: CustomField }[];
  scores: { score: number; assessment: Assessment }[];
};

type Payload = {
  candidates: Row[];
  fields: CustomField[];
  assessments: Assessment[];
};

export function PipelineBoard() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<Row | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/candidates", { cache: "no-store" });
      if (!res.ok) throw new Error("fail");
      setData((await res.json()) as Payload);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRef = useRef(load);
  loadRef.current = load;

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onReload = () => void loadRef.current();
    window.addEventListener("chaopin:candidates-reload", onReload);
    return () => window.removeEventListener("chaopin:candidates-reload", onReload);
  }, []);

  const byStage = useMemo(() => {
    const m = new Map<PipelineStage, Row[]>();
    for (const s of PIPELINE_STAGES) m.set(s, []);
    for (const c of data?.candidates ?? []) {
      const list = m.get(c.stage) ?? [];
      list.push(c);
      m.set(c.stage, list);
    }
    return m;
  }, [data]);

  const changeStage = async (id: string, stage: PipelineStage) => {
    setMovingId(id);
    try {
      await fetch(`/api/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage }),
      });
      await load();
    } finally {
      setMovingId(null);
    }
  };

  if (loading && !data) {
    return <p className="text-sm text-muted">加载流程看板…</p>;
  }

  const fields = data?.fields ?? [];
  const assessments = data?.assessments ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-semibold text-fg">流程看板</h1>
        <p className="mt-1 text-sm text-muted">
          简历按阶段归类；卡片内可调整阶段。Agent 处理阶段与规则见右下角小助手面板。
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {PIPELINE_STAGES.map((stage) => (
          <section
            key={stage}
            className="flex w-[min(260px,85vw)] shrink-0 flex-col rounded-2xl border border-border bg-surface"
          >
            <header className="border-b border-border bg-surface-2 px-3 py-2">
              <h2 className="text-sm font-semibold text-fg">{STAGE_LABEL[stage]}</h2>
              <p className="text-xs text-muted tabular-nums">
                {(byStage.get(stage) ?? []).length} 人
              </p>
            </header>
            <div className="flex max-h-[min(70vh,520px)] flex-1 flex-col gap-2 overflow-y-auto p-2">
              {(byStage.get(stage) ?? []).map((c) => (
                <article
                  key={c.id}
                  className="rounded-xl border border-border bg-surface-2 p-3 text-sm shadow-sm"
                >
                  <p className="font-medium text-fg">{c.name}</p>
                  <p className="truncate text-xs text-muted">{c.email}</p>
                  <p className="mt-1 text-xs text-fg-soft">
                    来源 · {sourceLabel(c.source)}
                    {c.expectedSalary ? ` · ${c.expectedSalary}` : ""}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => setEditor(c)}
                      className="rounded-lg bg-brand/10 px-2 py-0.5 text-xs font-medium text-brand hover:bg-brand/20"
                    >
                      编辑
                    </button>
                  </div>
                  <label className="mt-2 flex flex-col gap-0.5 text-[10px] uppercase tracking-wide text-muted">
                    移动到
                    <select
                      disabled={movingId === c.id}
                      className="rounded-lg border border-border bg-surface px-2 py-1 text-xs font-normal text-fg"
                      value={c.stage}
                      onChange={(e) =>
                        void changeStage(c.id, e.target.value as PipelineStage)
                      }
                    >
                      {PIPELINE_STAGES.map((s) => (
                        <option key={s} value={s}>
                          {STAGE_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </label>
                </article>
              ))}
              {(byStage.get(stage) ?? []).length === 0 ? (
                <p className="py-6 text-center text-xs text-muted">暂无</p>
              ) : null}
            </div>
          </section>
        ))}
      </div>

      {editor ? (
        <CandidateEditor
          mode="edit"
          initial={editor}
          fields={fields}
          assessments={assessments}
          onClose={() => setEditor(null)}
          onSaved={async () => {
            setEditor(null);
            await load();
          }}
        />
      ) : null}
    </div>
  );
}
