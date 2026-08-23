import { NextResponse } from "next/server";
import { streamText } from "ai";
import { z } from "zod";
import { aiModel, assertAiConfigured } from "@/lib/ai/client";
import {
  MAIN_FORMAT_RULES,
  MAIN_SYSTEM_PROMPT,
  buildMainUserPrompt,
} from "@/lib/ai/prompts";
import { TIME_SLOTS } from "@/lib/saju/constants";
import type { SajuCore } from "@/lib/saju/types";
import { checkRateLimit, clientIp } from "@/lib/rateLimit";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * 이 라우트의 입력 재검증 — 풀이에 실제로 쓰이는 필드만 검증한다.
 * (birthInputSchema의 name은 필수지만 풀이에는 이름이 선택이므로 여기서는 느슨하게)
 */
const interpretInputSchema = z.object({
  gender: z.enum(["male", "female"]),
  name: z.string().trim().max(12).optional(),
  timeSlot: z
    .number()
    .int()
    .min(0)
    .max(TIME_SLOTS.length - 1)
    .nullable(),
});

interface InterpretBody {
  core: SajuCore;
  input: z.infer<typeof interpretInputSchema>;
}

/**
 * POST /api/interpret — 메인 AI 사주 풀이 (SSE 스트리밍).
 * 요청 페이로드는 명식 핵심 JSON만 받아 입력 토큰을 최소화한다.
 */
export async function POST(req: Request) {
  // IP 비율 제한 (10회/분) — 비용이 드는 LLM 호출 방어
  const rate = await checkRateLimit(clientIp(req), "/api/interpret");
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

  let body: InterpretBody | null = null;
  try {
    body = (await req.json()) as InterpretBody;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 형식입니다." },
      { status: 400 },
    );
  }

  if (!body?.core || !body.input) {
    return NextResponse.json(
      { error: "명식 데이터가 없습니다. 생년월시를 다시 입력해 주세요." },
      { status: 400 },
    );
  }
  // 성별 등 최소 형식 재검증 (명식은 서버에서 산출한 값 신뢰)
  const base = interpretInputSchema.safeParse(body.input);
  if (!base.success) {
    return NextResponse.json(
      { error: "요청 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }
  const input = base.data;

  try {
    assertAiConfigured();
  } catch {
    return NextResponse.json(
      { error: "AI 서비스 설정이 완료되지 않았습니다. 관리자에게 문의해 주세요." },
      { status: 503 },
    );
  }

  try {
    const result = streamText({
      model: aiModel(),
      system: `${MAIN_SYSTEM_PROMPT}\n\n${MAIN_FORMAT_RULES}`,
      prompt: buildMainUserPrompt(body.core, {
        gender: input.gender,
        name: input.name,
        timeKnown: input.timeSlot !== null,
      }),
      temperature: 0.7,
      maxOutputTokens: 1600,
    });

    // SSE 텍스트 스트림으로 응답
    return result.toTextStreamResponse({
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    console.error("[/api/interpret]", error);
    return NextResponse.json(
      { error: "AI 풀이를 시작하지 못했습니다. 잠시 후 다시 시도해 주세요." },
      { status: 502 },
    );
  }
}
