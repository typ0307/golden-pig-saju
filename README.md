# 황금돼지 사주 (Golden Pig Saju)

Next.js 단일 스택 기반 사주팔자 만세력 + AI 사주 풀이 웹 서비스.
한국천문연구원 공공데이터포털 API(음양력 정보 · 특일/24절기 정보)로 만세력을
산출하고, OpenRouter의 `upstage/solar-pro4`가 SSE 스트리밍으로 풀이합니다.
(`AI_PROVIDER=cheaperinference`로 전환하면 `gemini-3.7-flash` 사용)

## 기술 스택

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- zod + react-hook-form (클라/서버 이중 검증)
- fast-xml-parser (KASI XML 응답 → JSON 변환)
- Vercel AI SDK (`ai` + `@ai-sdk/openai-compatible`) — SSE 스트리밍
- pnpm

## 만세력 산출 규칙

| 구분 | 규칙 |
| --- | --- |
| 연주 | 입춘(立春) **절입 시각**(KASI 24절기 API `locFromTodo`) 기준 — 입춘 전 출생은 전년 간지 |
| 월주 | 12절입(입춘·경칩·청명·입하·망종·소서·입추·백로·한로·입동·대설·소한) **절입 시각** 기준 + 월두법(甲己之年 丙寅頭) |
| 일주 | KASI 음양력 API 일진(`lunIljin`) 그대로 사용 |
| 시주 | KST(동경 135°)↔서울 자오선(동경 127.5°) **30분 시차 보정 시두법** (자시 23:30~01:29 경계) + 오두법(甲己日 甲子時) |

## 외부 API (딱 2개 서비스)

1. **음양력 정보** `LrsrCldInfoService` — `getLunCalInfo`(양력→음력+일진), `getSolCalInfo`(음력→양력), `getSpcifyLunCalInfo`(윤달 지정 변환)
2. **특일 정보** `SpcdeInfoService` — `get24DivisionsInfo`(연도별 24절기 + 절입 시각)

- XML 응답을 `fast-xml-parser`로 파싱해 JSON 반환
- 타임아웃 8초 + 실패 시 1회 재시도
- 과거 날짜는 Data Cache 1년, 당해/미래는 1일 캐싱 + 프로세스 내 Map 캐시(연도별 24절기)

## 시작하기

```bash
pnpm install
cp .env.example .env.local   # 키 입력
pnpm dev
```

### 환경 변수

| 키 | 설명 |
| --- | --- |
| `KASI_SERVICE_KEY` | 공공데이터포털 일반 인증키(디코딩된 값). URL 인코딩된 키를 붙여넣어도 자동 디코딩 |
| `AI_PROVIDER` | `openrouter`(기본) \| `cheaperinference` |
| `OPENROUTER_API_KEY` | OpenRouter API 키 |
| `OPENROUTER_BASE_URL` | 기본 `https://openrouter.ai/api/v1` |
| `OPENROUTER_MODEL` | 기본 `upstage/solar-pro4` |
| `CHEAPERINFERENCE_API_KEY` | cheaperinference API 키(예비) |
| `CHEAPERINFERENCE_BASE_URL` | 기본 `https://api.cheaperinference.ai/v1` |
| `AI_MODEL` | cheaperinference 모델, 기본 `gemini-3.7-flash` |
| `NEXT_PUBLIC_AI_MODEL` | 결과 화면 표시용 모델 라벨 |
| `MAIL_GMAIL_USER` | 메일 발송용 Gmail 주소 |
| `MAIL_GMAIL_APP_PASSWORD` | Google 앱 비밀번호 16자리 (2단계 인증 후 발급) |

## API 라우트

| 라우트 | 설명 |
| --- | --- |
| `POST /api/saju` | zod 재검증 → 음력이면 양력 변환 → 4주 팔자/오행/일간 JSON (이름 필수) |
| `POST /api/interpret` | 메인 AI 풀이 SSE 스트리밍 (성격·재물운·직업운) |
| `POST /api/interpret/ask` | 추가 질문 SSE — 명식 JSON + 질문만 전송, `maxOutputTokens: 400` |
| `POST /api/mail` | 풀이 결과 이메일 발송 (Gmail SMTP, opt-in) — 동일 주소 60초 쿨다운 |

## 토큰 최적화 (추가 질문)

- 이전 풀이 원문 미포함: 시스템 프롬프트 + 명식 핵심 JSON(8자·오행·일간) + 질문 150자만 전송
- 답변 3~4문장 이내 강제 + `max_tokens` 400
- 질문 3회 제한("남은 질문 횟수: X/3" UI), 150자 실시간 카운터

## 응답 구조 검증 (개발자용)

```bash
# 음양력: 양력 2026-08-23 → 음력/일진
http --body "https://apis.data.go.kr/B090041/openapi/service/LrsrCldInfoService/getLunCalInfo?solYear=2026&solMonth=08&solDay=23&serviceKey=$KASI_SERVICE_KEY" | xmllint --format -

# 24절기: 2026년 절입 시각(locFromTodo)
http --body "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/get24DivisionsInfo?solYear=2026&serviceKey=$KASI_SERVICE_KEY" | xmllint --format -
```

## 화면

- `/` — 먹색+골드 테마 랜딩, 생년월시 입력(양/음력·윤달·시간 모름 지원), 스피너
- `/result` — 명식표(사주팔자 사이트형, 한자+오행+십신) · 일간 카드 · 오행 분포 차트 ·
  AI 풀이 스트리밍(스켈레톤/재시도) · 추가 질문 채팅

## 지원 생년 범위

- **1900~2050년** 출생 지원
- 음양력·일진: KASI 음양력 API (1391~2050 제공)
- 24절기: KASI 특일 API는 2000년부터 제공 → **2000년 미만은 astronomy-engine
  로컬 천문 계산**으로 절입 시각 산출 (오차 ±1분 이내, KASI와 동일 스케일 환산)

본 서비스 풀이는 참고용 콘텐츠이며 전문 상담·의료·법률·투자 조언을 대체하지 않습니다.
