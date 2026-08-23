"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Mail } from "lucide-react";
import Turnstile, { useTurnstile } from "react-turnstile";
import type { SajuResult } from "@/lib/saju/types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * 메일로 받아보기 — 받고 싶은 사람만 선택(opt-in)하는 발송 폼.
 * 풀이가 완성된 뒤에만 활성화된다.
 * Turnstile 사이트 키가 설정된 경우 로봇 방지 체크를 함께 표시한다.
 */
export function MailReceiver({
  name,
  saju,
  interpretation,
  ready,
}: {
  name: string;
  saju: SajuResult;
  interpretation: string;
  ready: boolean;
}) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstile = useTurnstile();

  const valid = EMAIL_RE.test(email.trim());
  const humanVerified = !siteKey || Boolean(turnstileToken);
  const canSend = ready && valid && humanVerified && !sending && !sent;

  const handleVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  async function send() {
    if (!canSend) return;
    setSending(true);
    try {
      const res = await fetch("/api/mail", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          name,
          saju,
          interpretation,
          turnstileToken: turnstileToken ?? undefined,
        }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        error?: string;
        code?: string;
      };
      if (!res.ok || !data.ok) {
        // 토큰이 만료/실패한 경우 위젯 리셋해 재도록 유도
        if (data.code === "TURNSTILE_FAILED") {
          setTurnstileToken(null);
          turnstile?.reset();
        }
        toast.error(data.error ?? "메일 발송에 실패했습니다.");
        return;
      }
      setSent(true);
      toast.success("메일을 보냈어요! 메일함을 확인해 주세요.");
    } catch {
      toast.error(
        "서버와 통신할 수 없습니다. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.",
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      aria-label="메일로 받아보기"
      className="rounded-2xl border border-gold/25 bg-card/80 p-5"
    >
      <header className="mb-2 flex items-baseline justify-between">
        <h2 className="inline-flex items-center gap-2 text-lg font-semibold text-gold-2">
          <Mail className="size-4.5" aria-hidden />
          메일로 받아보기
        </h2>
        <p className="text-xs text-muted">받고 싶을 때만 입력하시면 돼요</p>
      </header>

      {sent ? (
        <div className="flex items-center gap-3 rounded-xl border border-gold/30 bg-gold/10 px-4 py-3.5">
          <CheckCircle2 className="size-5 shrink-0 text-gold" aria-hidden />
          <div>
            <p className="text-sm font-medium text-ivory">
              {email.trim()} 으로 보냈어요!
            </p>
            <p className="mt-0.5 text-xs text-muted">
              메일이 보이지 않다면 스팸함도 확인해 보세요.
            </p>
          </div>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm leading-6 text-ivory/75">
            풀이 결과를 이메일로 보내드려요. 언제든 다시 꺼내볼 수 있고,
            입력한 주소는 발송 후 저장되지 않습니다.
          </p>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label htmlFor="mail-input" className="sr-only">
                받으실 이메일 주소
              </label>
              <input
                id="mail-input"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="example@email.com"
                value={email}
                disabled={!ready}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    void send();
                  }
                }}
                className="field-input disabled:opacity-50"
                style={{ backgroundImage: "none" }}
              />
            </div>
            <button
              type="button"
              onClick={() => void send()}
              disabled={!canSend}
              className="mb-0.5 inline-flex h-[46px] shrink-0 items-center justify-center gap-1.5 rounded-xl bg-gold px-4 text-sm font-semibold text-ink transition-colors hover:bg-gold-2 disabled:opacity-40"
            >
              {sending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Mail className="size-4" aria-hidden />
              )}
              {sending ? "보내는 중…" : "메일 보내기"}
            </button>
          </div>

          {/* 로봇 방지 — Turnstile (사이트 키 설정 시에만 렌더) */}
          {siteKey && (
            <div className="mt-3">
              <Turnstile
                sitekey={siteKey}
                onSuccess={handleVerify}
                onExpire={handleExpire}
                theme="dark"
                appearance="interaction-only"
              />
            </div>
          )}

          {!ready && (
            <p className="mt-2 text-xs text-muted">
              풀이가 완성되면 메일로 받을 수 있어요.
            </p>
          )}
          {ready && email.length > 0 && !valid && (
            <p className="mt-2 text-xs text-vermilion">
              이메일 형식이 올바르지 않습니다.
            </p>
          )}
        </>
      )}
    </section>
  );
}
