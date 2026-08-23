"use client";

import { useRef, useState } from "react";
import { Loader2, SendHorizontal } from "lucide-react";
import { useTextStream } from "@/hooks/useTextStream";
import type { SajuCore } from "@/lib/saju/types";

const MAX_QUESTIONS = 3;
const MAX_QUESTION_LENGTH = 150;

interface Message {
  role: "user" | "assistant";
  text: string;
}

/**
 * 추가 질문(Q&A) 채팅 패널.
 * - 질문 3회 제한: "남은 질문 횟수: X/3" 표시
 * - 입력 150자 제한 + 실시간 글자 수 카운터
 * - 서버 전송은 시스템 프롬프트 + 명식 JSON + 질문만 (이전 풀이 원문 미포함)
 */
export function AskPanel({ core }: { core: SajuCore }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState("");
  const [usedCount, setUsedCount] = useState(0);
  const { start } = useTextStream();
  const listRef = useRef<HTMLDivElement>(null);

  const remaining = MAX_QUESTIONS - usedCount;
  // 마지막이 user 메시지면 아직 답변 대기 중
  const busy =
    messages.length > 0 && messages[messages.length - 1].role === "user";
  const canAsk = remaining > 0 && !busy && question.trim().length >= 2;

  async function ask() {
    const q = question.trim();
    if (!canAsk || q.length < 2) return;

    setMessages((prev) => [...prev, { role: "user", text: q }]);
    setQuestion("");
    setUsedCount((n) => n + 1);

    const result = await start("/api/interpret/ask", {
      question: q,
      sajuCore: core,
    });

    if (result === null) {
      // 실패 시 방금 소진한 질문 횟수 롤백 (재시도 기회 보장)
      setUsedCount((n) => Math.max(0, n - 1));
      setMessages((prev) => prev.slice(0, -1));
      setQuestion(q);
      return;
    }
    setMessages((prev) => [...prev, { role: "assistant", text: result || "…" }]);
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  return (
    <section
      aria-label="추가 질문"
      className="rounded-2xl border border-gold/25 bg-card/80 p-5"
    >
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="font-hanja text-lg font-semibold text-gold-2">
          추가 질문하기
        </h2>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
            remaining > 0
              ? "bg-gold/15 text-gold-2"
              : "bg-ink-2 text-muted line-through"
          }`}
        >
          남은 질문 횟수: {remaining}/{MAX_QUESTIONS}
        </span>
      </header>

      {/* 대화 목록 */}
      {messages.length > 0 && (
        <div ref={listRef} className="mb-4 max-h-96 space-y-3 overflow-y-auto pr-1">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-6 ${
                  m.role === "user"
                    ? "rounded-br-md bg-gold/15 text-gold-2"
                    : "rounded-bl-md bg-ink-2 text-ivory/90"
                }`}
              >
                <p className="whitespace-pre-wrap">{m.text}</p>
              </div>
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <div className="rounded-2xl rounded-bl-md bg-ink-2 px-4 py-3">
                <Loader2
                  className="size-4 animate-spin text-muted"
                  aria-label="답변 생성 중"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {remaining > 0 ? (
        <div className="space-y-2">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="ask-input" className="sr-only">
                추가 질문 입력 (최대 {MAX_QUESTION_LENGTH}자)
              </label>
              <textarea
                id="ask-input"
                value={question}
                onChange={(e) =>
                  setQuestion(e.target.value.slice(0, MAX_QUESTION_LENGTH))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void ask();
                  }
                }}
                rows={2}
                maxLength={MAX_QUESTION_LENGTH}
                disabled={busy}
                placeholder="예) 올해 이직을 고민 중인데 언제 움직이면 좋을까요?"
                className="field-input resize-none disabled:opacity-50"
                style={{ backgroundImage: "none" }}
              />
              {/* 실시간 글자 수 카운터 */}
              <div className="mt-1 flex justify-end">
                <span
                  className={`text-xs ${
                    question.length >= MAX_QUESTION_LENGTH
                      ? "text-vermilion"
                      : "text-muted"
                  }`}
                >
                  {question.length}/{MAX_QUESTION_LENGTH}자
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void ask()}
              disabled={!canAsk}
              aria-label="질문 보내기"
              className="mb-6 inline-flex size-11 shrink-0 items-center justify-center rounded-xl bg-gold text-ink transition-colors hover:bg-gold-2 disabled:opacity-40"
            >
              <SendHorizontal className="size-4" aria-hidden />
            </button>
          </div>
          {busy && (
            <p className="inline-flex items-center gap-1.5 text-xs text-muted">
              <Loader2 className="size-3 animate-spin" aria-hidden />
              답변을 준비하고 있습니다…
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-line bg-ink-2/50 px-4 py-6 text-center text-sm text-muted">
          질문 기회 {MAX_QUESTIONS}회를 모두 사용하셨습니다.
          <br />더 궁금한 점은 새로운 사주 풀이로 만나보세요 ✨
        </p>
      )}
    </section>
  );
}
