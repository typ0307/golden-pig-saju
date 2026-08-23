import { NextResponse } from "next/server";
import { streamText } from "ai";
import { aiModel, assertAiConfigured } from "@/lib/ai/client";
import {
  MAIN_FORMAT_RULES,
  MAIN_SYSTEM_PROMPT,
  buildMainUserPrompt,
} from "@/lib/ai/prompts";
import { birthInputSchema } from "@/lib/validation/birthSchema";
import type { SajuCore } from "@/lib/saju/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface InterpretBody {
  core: SajuCore;
  input: {
    gender: "male" | "female";
    name?: string;
    timeSlot: number | null;
  };
}

/**
 * POST /api/interpret — 메인 AI 사주 풀이 (SSE 스트리밍).
 * 요청 페이로드는 명식 핵심 JSON만 받아 입력 토큰을 최소화한다.
 */
export async function POST(req: Request) {
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
  const base = birthInputSchema.safeParse({
    gender: body.input.gender,
    calendar: "solar",
    year: 2000,
    month: 1,
    day: 1,
    timeSlot: body.input.timeSlot,
  });
  if (!base.success) {
    return NextResponse.json(
      { error: "요청 값이 올바르지 않습니다." },
      { status: 400 },
    );
  }

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
        gender: body.input.gender,
        name: body.input.name,
        timeKnown: body.input.timeSlot !== null,
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
