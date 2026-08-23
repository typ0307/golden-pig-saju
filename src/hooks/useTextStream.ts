"use client";

import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

export type StreamState = "idle" | "streaming" | "done" | "error";

/**
 * SSE 텍스트 스트리밍 훅 — fetch + ReadableStream으로 증분 렌더링.
 * 통신 에러/중단 시 사용자 친화적 Toast + 재시도 콜백 제공 (프롬프트 지시).
 */
export function useTextStream() {
  const [text, setText] = useState("");
  const [state, setState] = useState<StreamState>("idle");
  const abortRef = useRef<AbortController | null>(null);

  const stop = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setState((s) => (s === "streaming" ? "done" : s));
  }, []);

  const start = useCallback(
    async (url: string, body: unknown, onDone?: (full: string) => void) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setText("");
      setState("streaming");

      // 스트림 침묵 감지: 45초간 청크가 없으면 타임아웃 처리
      let silenceTimer: ReturnType<typeof setTimeout> | null = null;
      const resetSilence = () => {
        if (silenceTimer) clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => controller.abort(), 45_000);
      };
      resetSilence();

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          let message = `요청이 실패했습니다 (${res.status}).`;
          try {
            const errJson = (await res.json()) as { error?: string };
            if (errJson?.error) message = errJson.error;
          } catch {
            /* non-JSON 에러는 기본 메시지 유지 */
          }
          throw new Error(message);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let full = "";

        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          resetSilence();
          const chunk = decoder.decode(value, { stream: true });
          full += chunk;
          setText(full);
        }

        if (silenceTimer) clearTimeout(silenceTimer);
        setState("done");
        onDone?.(full);
        return full;
      } catch (error) {
        if (silenceTimer) clearTimeout(silenceTimer);
        const aborted = error instanceof DOMException && error.name === "AbortError";
        if (aborted) {
          // 사용자가 중단했거나 침묵 타임아웃
          if (controller.signal.reason === undefined) {
            toast.info("스트리밍이 중단되었습니다.");
          } else {
            toast.error("응답이 지연되어 연결을 끊었습니다. 다시 시도해 주세요.");
          }
          setState("error");
        } else {
          toast.error(
            error instanceof Error
              ? error.message
              : "통신 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.",
          );
          setState("error");
        }
        return null;
      } finally {
        if (silenceTimer) clearTimeout(silenceTimer);
        abortRef.current = null;
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setText("");
    setState("idle");
  }, []);

  return { text, state, start, stop, reset };
}
