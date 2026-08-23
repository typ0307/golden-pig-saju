import { NextResponse } from "next/server";
import { assertMailConfigured, sendSajuMail } from "@/lib/mailer";
import { mailInputSchema } from "@/lib/validation/birthSchema";
import {
  isTurnstileEnabled,
  TURNSTILE_FAIL_MESSAGE,
  verifyTurnstileToken,
} from "@/lib/turnstile";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * 메일 발송 스팸 방지: 동일 이메일 60초 쿨다운 (프로세스 메모리 기준 best-effort).
 */
const COOLDOWN_MS = 60_000;
const lastSent = new Map<string, number>();

export async function POST(req: Request) {
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

  // 로봇 방지 — Turnstile 토큰 서버 검증 (키 설정 시에만 동작)
  if (isTurnstileEnabled()) {
    const payload = raw as { turnstileToken?: string };
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    const verdict = await verifyTurnstileToken(payload.turnstileToken, ip);
    if (!verdict.ok) {
      return NextResponse.json(
        { error: TURNSTILE_FAIL_MESSAGE, code: "TURNSTILE_FAILED" },
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
