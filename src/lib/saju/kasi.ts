import { XMLParser } from "fast-xml-parser";

/**
 * 한국천문연구공공데이터포털(KASI) 만세력 API 클라이언트.
 *
 * 호출 대상은 딱 2개 서비스(프롬프트 지시 준수):
 *   1. LrsrCldInfoService (음양력 정보 API)
 *      - getLunCalInfo : 양력일 → 음력일 + 윤달 여부 + 일진(lunIljin) 간지
 *      - getSolCalInfo : 음력일(평달) → 양력일
 *      - getSpcifyLunCalInfo : 음력일(평/윤 지정) → 양력일
 *   2. SpcdeInfoService (특일·24절기 정보 API)
 *      - get24DivisionsInfo : 연도별 24절기 항목(절입 시각 포함)
 *
 * KASI 응답은 기본 XML 형식이므로 fast-xml-parser로 파싱해 JSON 구조로 반환한다.
 * (프롬프트: "응답 데이터는 XML 형식이므로 fast-xml-parser로 JSON으로 변환하여 반환")
 *
 * 과거 만세력 데이터는 영구 불변 → Next.js Data Cache(revalidate)로 장기 캐싱해
 * 외부 API 중복 호출을 최소화한다(프롬프트: "Data Cache 적극 활용").
 * 타임아웃 8초 + 네트워크 오류 시 1회 재시도.
 */

const SERVICE_BASE = "https://apis.data.go.kr/B090041/openapi/service";
const TIMEOUT_MS = 8_000;
const ONE_YEAR_SECONDS = 31_536_000;

export class KasiError extends Error {
  code: string;
  constructor(message: string, code = "KASI_ERROR") {
    super(message);
    this.name = "KasiError";
    this.code = code;
  }
}

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  parseTagValue: false,
  trimValues: true,
  // 공공데이터포털 응답은 깊지 않으므로 충분
  isArray: (_name, _jPath, _leaf, isAttribute) =>
    isAttribute === true ? false : _name === "item",
});

function pad(n: number, width = 2): string {
  return String(n).padStart(width, "0");
}

function serviceKey(): string {
  const raw = process.env.KASI_SERVICE_KEY ?? "";
  if (!raw) {
    throw new KasiError(
      "KASI_SERVICE_KEY가 설정되지 않았습니다. .env.local에 공공데이터포털 '음양력'·'특일정보' 서비스의 일반 인증키(디코딩된 값)를 넣어 주세요.",
      "NO_KEY",
    );
  }
  return raw.includes("%") ? decodeURIComponent(raw) : raw;
}

function isPastYear(year: number): boolean {
  return year < new Date().getFullYear();
}

function revalidateFor(year: number): number {
  // 과거 만세력은 영구 불변 → 1년 캐싱, 당해/미래는 1일 캐싱
  return isPastYear(year) ? ONE_YEAR_SECONDS : 86_400;
}

interface ParsedKasi {
  response?: {
    header?: { resultCode?: string; resultMsg?: string };
    body?: {
      items?: { item?: KasiItem | KasiItem[] };
    };
  };
  OpenAPI_ServiceResponse?: {
    cmmMsgHeader?: {
      errMsg?: string;
      returnAuthMsg?: string;
      returnReasonCode?: string;
    };
  };
}

type KasiItem = Record<string, string | number | undefined>;

async function callKasi(
  service: string,
  operation: string,
  params: Record<string, string>,
  yearForCache: number,
): Promise<KasiItem[] | KasiItem | null> {
  const qs = new URLSearchParams({ ...params, serviceKey: serviceKey() });
  const url = `${SERVICE_BASE}/${service}/${operation}?${qs.toString()}`;

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(TIMEOUT_MS),
        headers: { Accept: "application/xml" },
        next: {
          revalidate: revalidateFor(yearForCache),
          tags: ["kasi", `kasi-${service}`],
        },
      });

      if (!res.ok) {
        throw new KasiError(
          `천문연구원 API HTTP 오류 (${res.status}). 잠시 후 다시 시도해 주세요.`,
          `HTTP_${res.status}`,
        );
      }

      const xml = await res.text();
      const parsed: ParsedKasi = xmlParser.parse(xml);

      // 게이트웨이 오류(키/권한) — 재시도 불필요
      const gateway = parsed.OpenAPI_ServiceResponse?.cmmMsgHeader;
      if (gateway) {
        throw new KasiError(
          `천문연구원 API 오류: ${gateway.errMsg ?? ""} ${
            gateway.returnAuthMsg ?? ""
          } (코드 ${gateway.returnReasonCode ?? "?"})`.trim(),
          gateway.returnReasonCode ?? "GATEWAY",
        );
      }

      const header = parsed.response?.header;
      if (!header || header.resultCode !== "00") {
        throw new KasiError(
          `천문연구원 API 오류: ${header?.resultMsg ?? "응답 없음"}`,
          header?.resultCode ?? "BAD_RESPONSE",
        );
      }

      const item = parsed.response?.body?.items?.item ?? null;
      if (!item) return null;
      return Array.isArray(item) ? item : item;
    } catch (error) {
      lastError = error;
      // 논리 오류(키/파라미터)는 재시도하지 않는다
      if (error instanceof KasiError && error.code !== "GATEWAY") throw error;
      if (attempt === 1) {
        if (error instanceof Error && error.name === "TimeoutError") {
          throw new KasiError(
            "천문연구원 API 응답이 지연되고 있습니다. 잠시 후 다시 시도해 주세요.",
            "TIMEOUT",
          );
        }
        throw error instanceof KasiError
          ? error
          : new KasiError(
              "천문연구원 API 호출에 실패했습니다. 네트워크 상태를 확인해 주세요.",
              "NETWORK",
            );
      }
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new KasiError("천문연구원 API 알 수 없는 오류", "UNKNOWN");
}

function asString(v: unknown): string {
  return v === undefined || v === null ? "" : String(v).trim();
}

/* ------------------------------------------------------------------ */
/* 음양력 정보 API (LrsrCldInfoService)                                 */
/* ------------------------------------------------------------------ */

export interface LunarCalendarInfo {
  solar: { year: number; month: number; day: number };
  lunar: { year: number; month: number; day: number; isLeapMonth: boolean };
  /** 일진 간지(한글, 예: "정해") */
  dayGanji: string;
}

/** 양력일 → 음력 + 일진 */
export async function getLunCalInfo(
  year: number,
  month: number,
  day: number,
): Promise<LunarCalendarInfo> {
  const rawItem = await callKasi("LrsrCldInfoService", "getLunCalInfo", {
    solYear: pad(year, 4),
    solMonth: pad(month),
    solDay: pad(day),
  }, year);
  const item = Array.isArray(rawItem) ? rawItem[0] : rawItem;

  if (!item) {
    throw new KasiError(
      "해당 날짜의 만세력 정보를 찾을 수 없습니다. (2000~2050년 범위에서 입력해 주세요)",
      "NO_ITEM",
    );
  }

  // 실제 응답 예: lunIljin = "기사(己巳)" → 한글 간지 2자만 추출
  const rawGanji = asString(item.lunIljin);
  const ganjiMatch = rawGanji.match(/^([가-힣]{2})/);
  const dayGanji = ganjiMatch?.[1] ?? "";
  if (!dayGanji) {
    throw new KasiError("일진(간지) 정보를 가져오지 못했습니다.", "NO_ILJIN");
  }

  return {
    solar: { year, month, day },
    lunar: {
      year: Number(item.lunYear),
      month: Number(item.lunMonth),
      day: Number(item.lunDay),
      isLeapMonth: asString(item.lunLeapmonth) === "윤",
    },
    dayGanji,
  };
}

/** 음력일(평달/윤달 지정) → 양력일 */
export async function lunarToSolar(
  year: number,
  month: number,
  day: number,
  isLeapMonth: boolean,
): Promise<{ year: number; month: number; day: number }> {
  // 윤달은 평/윤을 명시하는 특정음력일 조회(getSpcifyLunCalInfo) 사용,
  // 평달은 getSolCalInfo 사용 — 둘 다 음양력 정보 API(LrsrCldInfoService) 소속.
  const item = (await callKasi(
    "LrsrCldInfoService",
    isLeapMonth ? "getSpcifyLunCalInfo" : "getSolCalInfo",
    isLeapMonth
      ? {
          fromSolYear: pad(year, 4),
          toSolYear: pad(year, 4),
          lunMonth: pad(month),
          lunDay: pad(day),
          leapMonth: "윤",
        }
      : {
          lunYear: pad(year, 4),
          lunMonth: pad(month),
          lunDay: pad(day),
        },
    year,
  )) as KasiItem | null;

  const first = Array.isArray(item) ? item[0] : item;
  if (!first) {
    throw new KasiError(
      "음력 날짜를 양력으로 변환할 수 없습니다. 날짜를 다시 확인해 주세요.",
      "CONVERT_FAILED",
    );
  }

  const y = Number(first.solYear);
  const m = Number(first.solMonth);
  const d = Number(first.solDay);
  if (!y || !m || !d) {
    throw new KasiError(
      "음력→양력 변환 결과가 올바르지 않습니다.",
      "CONVERT_FAILED",
    );
  }
  return { year: y, month: m, day: d };
}

/**
 * 특일·24절기 정보 API (SpcdeInfoService) — 실제 응답 구조 (2026-08 검증):
 *   <item>
 *     <dateKind>03</dateKind>
 *     <dateName>입춘</dateName>
 *     <isHoliday>N</isHoliday>
 *     <kst>0502      </kst>   ← 절입 시각 HHMM (KST, 공백 패딩 있음)
 *     <locdate>20260204</locdate>
 *     <seq>1</seq>
 *   </item>
 */
export interface SolarTermInfo {
  /** 절기명 (예: "입춘") */
  name: string;
  /** 절입 시각(KST 벽시계) — Date.getTime()과 동일 스케일의 ms (UTC 기준) */
  ms: number;
  /** 연도 벽계(YYYY) */
  year: number;
  /** 월(1~12) */
  month: number;
  /** 일(1~31) */
  day: number;
  /** 시(0~23) */
  hour: number;
  /** 분(0~59) */
  minute: number;
  /** 12절입 여부(true면 월주 경계로 사용) */
  isMajor: boolean;
}

const MONTH_BRANCH_TERMS = new Set([
  "입춘",
  "경칩",
  "청명",
  "입하",
  "망종",
  "소서",
  "입추",
  "백로",
  "한로",
  "입동",
  "대설",
  "소한",
]);

/**
 * locdate(YYYYMMDD) + kst(HHMM, 공백 패딩 포함 가능)을 KST 절입 시각 ms로 파싱.
 * kst가 비어 있는 항목은 00:00으로 폴백.
 */
function parseEntryTime(
  locdate: string,
  kst: string,
): {
  ms: number;
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const dateDigits = locdate.replace(/\D/g, "");
  if (dateDigits.length !== 8) {
    throw new KasiError(`절입 날짜 파싱 실패: locdate=${locdate}`);
  }
  const y = Number(dateDigits.slice(0, 4));
  const m = Number(dateDigits.slice(4, 6));
  const d = Number(dateDigits.slice(6, 8));
  if (!y || !m || !d) {
    throw new KasiError(`절입 날짜 파싱 실패: locdate=${locdate}`);
  }

  const timeDigits = kst.replace(/\D/g, "").padEnd(4, "0");
  const h = Number(timeDigits.slice(0, 2));
  const min = Number(timeDigits.slice(2, 4));

  // KST 벽시계(YYYY-MM-DD HH:MM)를 UTC 기준 ms로 취급 — 출생 시각과 동일 스케일로 비교 일관성 유지
  const ms = Date.UTC(y, m - 1, d, h, min, 0);
  return { ms, year: y, month: m, day: d, hour: h, minute: min };
}

/** 연도별 24절기(절입 시각 포함) 조회 */
export async function get24DivisionsInfo(
  year: number,
): Promise<SolarTermInfo[]> {
  const items = (await callKasi("SpcdeInfoService", "get24DivisionsInfo", {
    solYear: pad(year, 4),
    numOfRows: "30",
  }, year)) as KasiItem[] | KasiItem | null;

  if (!items) return [];
  const list = Array.isArray(items) ? items : [items];

  const terms: SolarTermInfo[] = [];
  for (const it of list) {
    const name = asString(it.dateName);
    const locdate = asString(it.locdate);
    if (!name || !locdate) continue;
    const parsed = parseEntryTime(locdate, asString(it.kst));
    terms.push({
      name,
      ms: parsed.ms,
      year: parsed.year,
      month: parsed.month,
      day: parsed.day,
      hour: parsed.hour,
      minute: parsed.minute,
      isMajor: MONTH_BRANCH_TERMS.has(name),
    });
  }

  return terms.sort((a, b) => a.ms - b.ms);
}
