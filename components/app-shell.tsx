"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AboutDialog } from "./about-dialog";
import { AgentDock } from "./agent-dock";

const nav = [
  { href: "/", label: "总览" },
  { href: "/candidates", label: "候选人" },
  { href: "/pipeline", label: "流程看板" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [aboutOpen, setAboutOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-sm font-bold text-white shadow-sm">
              朝
            </span>
            <span className="font-display text-lg font-semibold tracking-tight text-fg">
              朝聘
            </span>
          </Link>
          <p className="hidden text-xs text-muted sm:block max-w-[220px] leading-snug">
            硬性条件 + 测评成绩，一体化筛选
          </p>
          <nav className="ml-auto flex items-center gap-1">
            {nav.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                    active
                      ? "bg-brand-soft text-brand"
                      : "text-fg-soft hover:bg-surface-2 hover:text-fg"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
            <Link
              href="/settings"
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname === "/settings"
                  ? "bg-brand-soft text-brand"
                  : "text-fg-soft hover:bg-surface-2 hover:text-fg"
              }`}
            >
              筛选字段设置
            </Link>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent("chaopin:open-agent"));
              }}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand-soft"
            >
              筛选助手
            </button>
            <button
              type="button"
              onClick={() => setAboutOpen(true)}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-fg-soft hover:bg-surface-2 hover:text-fg"
            >
              简介
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="border-t border-border py-4 text-center text-xs text-muted">
        朝聘 · 个人作品集演示
      </footer>
      <AgentDock />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}
