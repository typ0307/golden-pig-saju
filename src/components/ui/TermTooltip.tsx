"use client";

import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";

/**
 * 사주 용어 툴팁 — 데스크톱 hover, 모바일 탭으로 설명 표시.
 */
export function TermTooltip({
  desc,
  children,
  align = "center",
}: {
  desc: string;
  children: ReactNode;
  /** 툴팁 상자 정렬 (부모 컨테이너 폭이 좁을 때 left 사용) */
  align?: "center" | "left";
}) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-label="용어 설명 보기"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="inline-flex cursor-help items-center gap-1 underline decoration-dotted decoration-gold/50 underline-offset-4"
      >
        {children}
        <Info className="size-3.5 text-gold/60" aria-hidden />
      </button>
      {open && (
        <span
          role="tooltip"
          className={`absolute top-[calc(100%+6px)] z-30 w-60 rounded-lg border border-gold/30 bg-ink-2 px-3 py-2 text-xs font-normal leading-5 text-ivory/90 shadow-xl shadow-black/50 ${
            align === "center"
              ? "left-1/2 -translate-x-1/2"
              : "left-0"
          }`}
        >
          {desc}
        </span>
      )}
    </span>
  );
}
