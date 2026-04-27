"use client";

import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function AboutDialog({ open, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-fg/20 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="关闭"
      />
      <div
        ref={panelRef}
        className="relative w-full max-w-md rounded-2xl border border-border bg-surface-2 p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-muted">
              产品简介
            </p>
            <h2 id="about-title" className="mt-1 font-display text-xl font-semibold text-fg">
              朝聘
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-muted hover:bg-border hover:text-fg"
            aria-label="关闭"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <ul className="mt-5 space-y-3 text-sm leading-relaxed text-fg-soft">
          <li className="flex gap-2.5">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40"
              aria-hidden
            />
            <span>
              筛选规则和 Agent 行为均可自定义，适配不同招聘流程。支持按学历、年限、笔试/机试成绩等多维度组合筛选，结果实时生效。
            </span>
          </li>
          <li className="flex gap-2.5">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40"
              aria-hidden
            />
            <span>内置招聘 Agent，可自动完成简历初筛与面试邀约邮件发送。</span>
          </li>
          <li className="flex gap-2.5">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-current opacity-40"
              aria-hidden
            />
            <span>通过链接在线访问，无需部署，即开即用。</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
