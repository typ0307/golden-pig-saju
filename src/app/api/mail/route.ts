import { NextResponse } from "next/server";
import { assertMailConfigured, sendSajuMail } from "@/lib/mailer";
import { mailInputSchema } from "@/lib/validation/birthSchema";
import {
  isTurnstileEnabled,
  turnstileFailMessage,
  verifyTurnstileToken,
} from "@/lib/turnstile";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * 이 엔드포인트를 보호하는 Turnstile 대표면(action) 이름.
 * 프론트엔드 위젯의 action 속성과 반드시 일치해야 한다.
 */
const MAIL_SEND_ACTION = "mail-send";

/**
 * 메일 발송 스팸 방지: 동일 이메일 60초 쿨다운 (프로세스 메모리 기준 best-effort).
 */
const COOLDOWN_MS = 60_000;
const lastSent = new Map<string, number>();

export async function POST(req: Request) {
  // IP 비율 제한 (5회/분) — Turnstile과 별개의 추가 안전망
  const rate = await checkRateLimit(clientIp(req), "/api/mail");
  if (!rate.ok) {
    return NextResponse.json(
      {
        error: `요청이 너무 많습니다. ${rate.retryAfter}초 후 다시 시도해 주세요.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfter ?? 60) },
      },
    );
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  const parsed = mailInputSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ?? "입력값이 올바르지 않습니다.",
      },
      { status: 400 },
    );
  }

  const { email } = parsed.data;

  // 로봇 방지 — Turnstile canonical siteverify (키 설정 시에만 동작)
  if (isTurnstileEnabled()) {
    const payload = raw as { turnstileToken?: string };
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const verdict = await verifyTurnstileToken(payload.turnstileToken, {
      action: MAIL_SEND_ACTION,
      ip,
    });
    if (!verdict.ok) {
      console.warn("[/api/mail] turnstile rejected:", verdict.reason);
      return NextResponse.json(
        {
          error: turnstileFailMessage(verdict.reason),
          code: "TURNSTILE_FAILED",
        },
        { status: 403 },
      );
    }
  }

  // 쿨다운 체크
  const now = Date.now();
  const prev = lastSent.get(email) ?? 0;
  if (now - prev < COOLDOWN_MS) {
    return NextResponse.json(
      { error: "방금 발송 요청이 있었어요. 잠시 후 다시 시도해 주세요." },
      { status: 429 },
    );
  }

  try {
    assertMailConfigured();
  } catch {
    return NextResponse.json(
      {
        error:
          "메일 발송 서비스가 준비 중입니다. 잠시 후 다시 시도해 주세요.",
      },
      { status: 503 },
    );
  }

  try {
    await sendSajuMail(parsed.data);
    lastSent.set(email, now);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[/api/mail]", error);
    return NextResponse.json(
      {
        error:
          "메일 발송에 실패했습니다. 이메일 주소를 확인하고 잠시 후 다시 시도해 주세요.",
      },
      { status: 502 },
    );
  }
}
