import { SearchSunLongitude } from "astronomy-engine";
import { get24DivisionsInfo, type SolarTermInfo } from "./kasi";

/**
 * 24절기 절입 시각 산출(KST).
 *
 * 소스 이중화:
 *   - 2000년 이상: 한국천문연구원 24절기 특일 API(get24DivisionsInfo)의
 *     '절입 시각(kst)' 필드를 그대로 사용 (프롬프트 준수 — 실시간 API 호출).
 *     단, 특일 API는 2000년부터 데이터를 제공한다.
 *   - 2000년 미만: API 데이터가 없으므로 astronomy-engine 태양 황경 계산으로
 *     절입 시각을 로컬 산출한다 (오차 ±1분 이내, KASI와 동일 스케일 환산).
 *     음양력/일진은 계속 KASI API를 사용한다 (1391~2050 제공).
 *
 * 동일 프로세스에서 연도별 1회만 계산하도록 in-memory 캐시를 둔다
 * (fetch 단의 Next.js Data Cache와 이중으로 중복 호출 방지).
 */

/** KASI 특일 API의 24절기 데이터 제공 시작 연도 */
const KASI_TERMS_FROM_YEAR = 2000;

const cache = new Map<number, Promise<SolarTermInfo[]>>();

/* 24절기 정의: 태양 황경(lon) + 12절입(월주 경계) 여부 */
const TERM_DEFS: { name: string; lon: number; isMajor: boolean }[] = [
  { name: "소한", lon: 285, isMajor: true },
  { name: "대한", lon: 300, isMajor: false },
  { name: "입춘", lon: 315, isMajor: true },
  { name: "우수", lon: 330, isMajor: false },
  { name: "경칩", lon: 345, isMajor: true },
  { name: "춘분", lon: 0, isMajor: false },
  { name: "청명", lon: 15, isMajor: true },
  { name: "곡우", lon: 30, isMajor: false },
  { name: "입하", lon: 45, isMajor: true },
  { name: "소만", lon: 60, isMajor: false },
  { name: "망종", lon: 75, isMajor: true },
  { name: "하지", lon: 90, isMajor: false },
  { name: "소서", lon: 105, isMajor: true },
  { name: "대서", lon: 120, isMajor: false },
  { name: "입추", lon: 135, isMajor: true },
  { name: "처서", lon: 150, isMajor: false },
  { name: "백로", lon: 165, isMajor: true },
  { name: "추분", lon: 180, isMajor: false },
  { name: "한로", lon: 195, isMajor: true },
  { name: "상강", lon: 210, isMajor: false },
  { name: "입동", lon: 225, isMajor: true },
  { name: "소설", lon: 240, isMajor: false },
  { name: "대설", lon: 255, isMajor: true },
  { name: "동지", lon: 270, isMajor: false },
];

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** astronomy-engine 로컬 계산 (2000년 미만 폴백) */
function computeLocalTerms(year: number): SolarTermInfo[] {
  const start = new Date(Date.UTC(year, 0, 1));
  return TERM_DEFS.map((def) => {
    const found = SearchSunLongitude(def.lon, start, 370);
    if (!found) {
      throw new Error(
        `24절기 로컬 계산 실패: ${year}년 ${def.name}(황경 ${def.lon}°)`,
      );
    }
    // UTC 절입시각 + 9h = KST 벽시계 시각 → kasi.ts 파싱과 동일하게 UTC ms 스케일로 보관
    const kst = new Date(found.date.getTime() + KST_OFFSET_MS);
    return {
      name: def.name,
      ms: Date.UTC(
        kst.getUTCFullYear(),
        kst.getUTCMonth(),
        kst.getUTCDate(),
        kst.getUTCHours(),
        kst.getUTCMinutes(),
      ),
      year: kst.getUTCFullYear(),
      month: kst.getUTCMonth() + 1,
      day: kst.getUTCDate(),
      hour: kst.getUTCHours(),
      minute: kst.getUTCMinutes(),
      isMajor: def.isMajor,
    };
  }).sort((a, b) => a.ms - b.ms);
}

export function getSolarTerms(year: number): Promise<SolarTermInfo[]> {
  let promise = cache.get(year);
  if (!promise) {
    promise = (async () => {
      if (year >= KASI_TERMS_FROM_YEAR) {
        const terms = await get24DivisionsInfo(year);
        if (terms.length > 0) return terms;
      }
      return computeLocalTerms(year);
    })();
    cache.set(year, promise);
  }
  return promise;
}

/** 입춘 절입 시각(해당 연도 것) */
export async function getIpchun(year: number): Promise<SolarTermInfo> {
  const terms = await getSolarTerms(year);
  const entry = terms.find((t) => t.name === "입춘");
  if (!entry) throw new Error(`${year}년 입춘 정보를 찾을 수 없습니다.`);
  return entry;
}

/**
 * 출생 시각(ms) 기준으로 직전에 지나온 12절입(월주 경계)을 찾는다.
 *
 * 당해 연도 절기로 판별 가능하면 그것을 사용하고(대부분의 케이스),
 * 입춘 이전(1~2월 초) 출생만 전년도 절기를 조회한다.
 */
export async function findGoverningMajorTerm(
  birthMs: number,
  birthYear: number,
): Promise<SolarTermInfo> {
  const curr = (await getSolarTerms(birthYear)).filter((t) => t.isMajor);

  const governingInCurr = curr.filter((t) => t.ms <= birthMs).pop();
  if (governingInCurr) return governingInCurr;

  // 입춘 이전 출생 → 전년도 절기 (로컬 계산이므로 데이터 부재 걱정 없음)
  const prev = (await getSolarTerms(birthYear - 1)).filter((t) => t.isMajor);
  const governingInPrev = prev.filter((t) => t.ms <= birthMs).pop();
  if (governingInPrev) return governingInPrev;

  throw new Error(
    `${birthYear}년 출생의 월주 기준 절입 정보를 찾을 수 없습니다.`,
  );
}
