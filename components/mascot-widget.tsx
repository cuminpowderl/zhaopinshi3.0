"use client";

import { useCallback, useEffect, useState } from "react";

type Props = {
  onOpenPanel: () => void;
};

type Side = "left" | "right";

const PEEK_URL = "/agent/mascot-peek.png";
const FULL_URL = "/agent/mascot-full.png";

/**
 * 吉祥物「噜噜」：图1 探头 / 图2 全身；固定视口侧栏，悬停展开，点击弹跳后打开筛选助手。
 */
export function MascotWidget({ onOpenPanel }: Props) {
  const [hover, setHover] = useState(false);
  const [jumping, setJumping] = useState(false);
  const [useSvg, setUseSvg] = useState(false);
  const [side, setSide] = useState<Side>("right");

  useEffect(() => {
    const raw = localStorage.getItem("chaopin_mascot_side");
    if (raw === "left" || raw === "right") setSide(raw);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const peek = new Image();
    const full = new Image();
    peek.onload = () => {
      full.onload = () => {
        if (!cancelled) setUseSvg(false);
      };
      full.onerror = () => {
        if (!cancelled) setUseSvg(true);
      };
      full.src = FULL_URL;
    };
    peek.onerror = () => {
      if (!cancelled) setUseSvg(true);
    };
    peek.src = PEEK_URL;
    return () => {
      cancelled = true;
    };
  }, []);

  const openWithJump = useCallback(() => {
    setJumping(true);
    window.setTimeout(() => {
      onOpenPanel();
      setJumping(false);
    }, 480);
  }, [onOpenPanel]);

  const isRight = side === "right";
  const edge = isRight ? "right-0 rounded-l-2xl rounded-r-none" : "left-0 rounded-r-2xl rounded-l-none";
  const itemsAlign = isRight ? "items-end" : "items-start";
  const textAlign = isRight ? "text-right pr-1" : "text-left pl-1";

  const maskIdle =
    "radial-gradient(ellipse 92% 88% at " + (isRight ? "70% 36%" : "30% 36%") + ", #000 45%, transparent 74%)";
  const maskHover =
    "radial-gradient(ellipse 100% 100% at 50% 48%, #000 90%, transparent 100%)";

  const sideFlip = isRight ? "scaleX(-1)" : "none";

  const footer = (
    <>
      <span className={`mt-1 max-w-[4.5rem] text-[10px] leading-tight text-muted ${textAlign}`}>
        噜噜 · 探头 · 悬停全身 · 点按打开
      </span>
      <button
        type="button"
        className={`mt-0.5 text-[10px] text-muted underline decoration-dotted hover:text-fg ${textAlign}`}
        onClick={() => {
          const next = side === "right" ? "left" : "right";
          setSide(next);
          localStorage.setItem("chaopin_mascot_side", next);
        }}
      >
        换到{isRight ? "左" : "右"}侧
      </button>
    </>
  );

  if (useSvg) {
    return (
      <div
        className={`fixed ${edge} top-1/2 z-[100] flex flex-col ${itemsAlign} -translate-y-1/2 ${jumping ? (isRight ? "animate-mascot-jump-right" : "animate-mascot-jump-left") : ""}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button
          type="button"
          onClick={openWithJump}
          className="block border border-border/60 bg-surface p-1 shadow-lg outline-none ring-brand/30 focus-visible:ring-2"
          aria-label="打开筛选助手（噜噜）"
        >
          <MascotSvgFallback expanded={hover} />
        </button>
        {footer}
      </div>
    );
  }

  return (
    <div
      className={`fixed ${edge} top-1/2 z-[100] flex flex-col ${itemsAlign} -translate-y-1/2 ${jumping ? (isRight ? "animate-mascot-jump-right" : "animate-mascot-jump-left") : ""}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        onClick={openWithJump}
        className={`group relative flex flex-col overflow-hidden border-2 border-white/90 bg-white/95 shadow-[0_8px_30px_rgba(0,0,0,0.12)] outline-none ring-brand/25 focus-visible:ring-2 ${isRight ? "rounded-l-2xl" : "rounded-r-2xl"}`}
        aria-label="打开筛选助手（噜噜）"
        style={{
          width: hover ? "8rem" : "2.85rem",
          height: hover ? "11rem" : "7rem",
          transition: "width 0.35s ease, height 0.35s ease, box-shadow 0.35s ease",
        }}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            transform: sideFlip,
            transformOrigin: "center center",
          }}
        >
          <div
            className="absolute inset-0 bg-no-repeat"
            style={{
              opacity: hover ? 0 : 1,
              backgroundImage: `url(${PEEK_URL})`,
              backgroundSize: "auto 118%",
              backgroundPosition: "18% 92%",
              backgroundRepeat: "no-repeat",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.12))",
              WebkitMaskImage: maskIdle,
              maskImage: maskIdle,
              transition: "opacity 0.3s ease, -webkit-mask-image 0.35s ease, mask-image 0.35s ease",
            }}
          />
          <div
            className="absolute inset-0 bg-no-repeat"
            style={{
              opacity: hover ? 1 : 0,
              backgroundImage: `url(${FULL_URL})`,
              backgroundSize: "contain",
              backgroundPosition: "50% 100%",
              backgroundRepeat: "no-repeat",
              filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.1))",
              WebkitMaskImage: maskHover,
              maskImage: maskHover,
              transition: "opacity 0.3s ease, -webkit-mask-image 0.35s ease, mask-image 0.35s ease",
            }}
          />
        </div>
      </button>
      {footer}
    </div>
  );
}

function MascotSvgFallback({ expanded }: { expanded: boolean }) {
  return (
    <svg
      width={expanded ? 100 : 44}
      height={expanded ? 112 : 72}
      viewBox="0 0 88 96"
      className="drop-shadow-md transition-all duration-300"
      aria-hidden
    >
      <defs>
        <linearGradient id="mw-fur" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
      </defs>
      <ellipse cx="44" cy="88" rx="28" ry="8" fill="black" opacity="0.1" />
      <g
        style={{
          transform: expanded ? "translateY(0)" : "translateY(6px)",
          transition: "transform 0.35s ease",
        }}
      >
        <path
          d="M12 38 Q8 12 26 18 Q44 4 62 18 Q80 12 76 38 Q84 58 44 70 Q4 58 12 38 Z"
          fill="url(#mw-fur)"
        />
        <ellipse cx="28" cy="30" rx="10" ry="14" fill="#fed7aa" opacity="0.95" />
        <ellipse cx="60" cy="30" rx="10" ry="14" fill="#fed7aa" opacity="0.95" />
        <circle cx="34" cy="42" r="4" fill="#1f2937" />
        <circle cx="54" cy="42" r="4" fill="#1f2937" />
      </g>
    </svg>
  );
}
