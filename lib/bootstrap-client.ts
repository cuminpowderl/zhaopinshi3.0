"use client";

import type { Assessment, CustomField } from "@prisma/client";

export type BootstrapPayload = { fields: CustomField[]; assessments: Assessment[] };

const KEY = "chaopin_bootstrap_v1";
const TTL_MS = 5 * 60 * 1000;

let mem: { ts: number; value: BootstrapPayload } | null = null;
let inflight: Promise<BootstrapPayload> | null = null;

function now() {
  return Date.now();
}

function readSession(): BootstrapPayload | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { ts?: number; value?: BootstrapPayload };
    if (!parsed.ts || !parsed.value) return null;
    if (now() - parsed.ts > TTL_MS) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

function writeSession(value: BootstrapPayload) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ts: now(), value }));
  } catch {
    // ignore
  }
}

export async function fetchBootstrapCached(opts?: { force?: boolean }): Promise<BootstrapPayload> {
  const force = opts?.force === true;

  if (!force && mem && now() - mem.ts <= TTL_MS) return mem.value;

  if (!force) {
    const s = readSession();
    if (s) {
      mem = { ts: now(), value: s };
      return s;
    }
  }

  if (!force && inflight) return inflight;

  inflight = (async () => {
    const res = await fetch("/api/bootstrap", { cache: "no-store" });
    if (!res.ok) throw new Error("加载基础数据失败");
    const json = (await res.json()) as BootstrapPayload;
    mem = { ts: now(), value: json };
    writeSession(json);
    return json;
  })();

  try {
    return await inflight;
  } finally {
    inflight = null;
  }
}

