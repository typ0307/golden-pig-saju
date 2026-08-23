import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * LLM 게이트웨이 설정 — OpenRouter(기본) + cheaperinference(예비).
 *
 * 둘 다 OpenAI 호환 API이므로 동일한 @ai-sdk/openai-compatible 프로바이더로
 * 연결하며, AI_PROVIDER 환경 변수로 전환한다.
 *
 * - openrouter (기본): upstage/solar-pro4
 *   OpenRouter 앱 랭킹용 HTTP-Referer/X-Title 헤더를 함께 전송한다.
 * - cheaperinference (예비): gemini-3.7-flash
 */
export type AiProviderId = "openrouter" | "cheaperinference";

interface ProviderConfig {
  baseURL: string;
  apiKey: string;
  model: string;
  headers?: Record<string, string>;
}

function providerConfig(id: AiProviderId): ProviderConfig {
  switch (id) {
    case "openrouter":
      return {
        baseURL:
          process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY ?? "",
        model: process.env.OPENROUTER_API_MODEL ?? "upstage/solar-pro4",
        headers: {
          "HTTP-Referer":
            process.env.OPENROUTER_REFERER ??
            "https://goldenpigsaju.vercel.app",
          "X-Title": "Golden Pig Saju",
        },
      };
    case "cheaperinference":
      return {
        baseURL:
          process.env.CHEAPERINFERENCE_BASE_URL ??
          "https://api.cheaperinference.ai/v1",
        apiKey: process.env.CHEAPERINFERENCE_API_KEY ?? "",
        model: process.env.CHEAPERINFERENCE_API_MODEL ?? "gemini-3.7-flash",
      };
  }
}

export const AI_PROVIDER: AiProviderId =
  process.env.AI_PROVIDER === "cheaperinference"
    ? "cheaperinference"
    : "openrouter";

export const ACTIVE_MODEL = providerConfig(AI_PROVIDER).model;

const provider = createOpenAICompatible({
  name: AI_PROVIDER,
  baseURL: providerConfig(AI_PROVIDER).baseURL,
  apiKey: providerConfig(AI_PROVIDER).apiKey,
  headers: providerConfig(AI_PROVIDER).headers,
});

export function assertAiConfigured(): void {
  if (!providerConfig(AI_PROVIDER).apiKey) {
    throw new Error(
      AI_PROVIDER === "openrouter"
        ? "OPENROUTER_API_KEY가 설정되지 않았습니다. .env.local을 확인해 주세요."
        : "CHEAPERINFERENCE_API_KEY가 설정되지 않았습니다. .env.local을 확인해 주세요.",
    );
  }
}

export function aiModel() {
  return provider.chatModel(ACTIVE_MODEL);
}
