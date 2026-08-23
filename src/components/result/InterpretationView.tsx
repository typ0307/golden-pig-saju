"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import { RotateCcw, StopCircle } from "lucide-react";
import { useTextStream } from "@/hooks/useTextStream";
import type { SajuCore } from "@/lib/saju/types";

interface InterpretationViewProps {
  core: SajuCore;
  input: { gender: "male" | "female"; name?: string; timeSlot: number | null };
  /** 풀이가 완성되거나(자동/수동 중지) 갱신될 때 전체 텍스트를 상위로 전달 */
  onComplete?: (text: string) => void;
}

/** 마크다운 최소 렌더: ## 헤딩 / **굵게** / 문단만 지원 */
function renderMarkdownLite(text: string) {
  const blocks = text.split(/\n{2,}/);
  return blocks.map((block, i) => {
    const headingMatch = block.match(/^#{1,3}\s*(.+)$/m);
    if (headingMatch) {
      const heading = headingMatch[1].trim();
      const rest = block
        .split("\n")
        .filter((l) => !/^#{1,3}\s/.test(l))
        .join(" ")
        .trim();
      return (
        <section key={i} className="mt-5 first:mt-0">
          <h3 className="font-hanja mb-2 inline-block border-b border-gold/40 pb-0.5 text-base font-semibold text-gold-2">
            {heading}
          </h3>
          {rest && <p className="text-[15px] leading-7 text-ivory/90">{bold(rest)}</p>}
        </section>
      );
    }
    return (
      <p key={i} className="mt-3 text-[15px] leading-7 text-ivory/90 first:mt-0">
        {bold(block)}
      </p>
    );
  });
}

function bold(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i} className="font-semibold text-gold-2">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

/**
 * 메인 사주 풀이 — SSE 스트리밍 실시간 렌더링 + Toast/재시도.
 */
export function InterpretationView({
  core,
  input,
  onComplete,
}: InterpretationViewProps) {
  const { text, state, start, stop, reset } = useTextStream();
  const startedRef = useRef(false);

  const run = useCallback(() => {
    void start("/api/interpret", { core, input }, (full) =>
      onComplete?.(full),
    );
  }, [start, core, input, onComplete]);

  // 마운트 시 1회 자동 시작
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    run();
  }, [run]);

  const loading = state === "idle" || (state === "streaming" && text === "");

  return (
    <section
      aria-label="사주 풀이"
      className="rounded-2xl border border-gold/25 bg-card/80 p-5"
    >
      <header className="mb-2">
        <h2 className="font-hanja text-lg font-semibold text-gold-2">
          사주 풀이
        </h2>
      </header>

      {loading ? (
        // 스켈레톤 (프롬프트: 외부 API 지연 대비 로딩 상태)
        <div className="space-y-3" aria-label="풀이 로딩 중" aria-busy="true">
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-11/12" />
          <div className="skeleton h-4 w-4/5" />
          <div className="skeleton h-5 w-24" />
          <div className="skeleton h-4 w-full" />
          <div className="skeleton h-4 w-10/12" />
          <p className="pt-1 text-center text-xs text-muted">
            별의 기운을 읽고 있습니다…
          </p>
        </div>
      ) : (
        <div
          className={`min-h-24 ${state === "streaming" ? "stream-caret" : ""}`}
          aria-live="polite"
        >
          {renderMarkdownLite(text)}
        </div>
      )}

      <footer className="mt-5 flex items-center justify-end gap-2 border-t border-line pt-3">
        {state === "streaming" && (
          <button
            type="button"
            onClick={() => {
              stop();
              onComplete?.(text); // 부분 텍스트라도 메일 수신 가능하도록 전달
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs text-ivory/70 hover:border-vermilion/60 hover:text-vermilion"
          >
            <StopCircle className="size-3.5" aria-hidden />
            생성 중지
          </button>
        )}
        {state === "error" && (
          <button
            type="button"
            onClick={() => {
              reset();
              run();
              toast.info("다시 풀이을 시작합니다.");
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gold px-3 py-1.5 text-xs font-semibold text-ink hover:bg-gold-2"
          >
            <RotateCcw className="size-3.5" aria-hidden />
            다시 시도
          </button>
        )}
      </footer>
    </section>
  );
}
