import {
  BRANCHES,
  BRANCH_KOR_INDEX,
  DAY_MASTER_KEYWORDS,
  ELEMENT_META,
  GENERATES,
  OVERCOMES,
  STEMS,
  STEM_KOR_INDEX,
  slotMidpointMinutes,
} from "./constants";
import { getLunCalInfo } from "./kasi";
import { findGoverningMajorTerm, getIpchun } from "./solarTerms";
import type {
  Element,
  Pillar,
  Polarity,
  SajuChar,
  SajuCore,
  SajuResult,
  TenGod,
} from "./types";

export interface AssembleInput {
  /** 양력 생년월일 */
  solar: { year: number; month: number; day: number };
  /** 시진 슬롯(0=자시 … 11=해시). 시간 모름이면 null */
  timeSlot: number | null;
}

/* ------------------------------------------------------------------ */
/* 십신 계산                                                           */
/* ------------------------------------------------------------------ */

function tenGod(
  day: { element: Element; polarity: Polarity },
  other: { element: Element; polarity: Polarity },
): TenGod {
  const samePolarity = day.polarity === other.polarity;
  if (day.element === other.element) return samePolarity ? "비견" : "겁재";
  if (GENERATES[day.element] === other.element)
    return samePolarity ? "식신" : "상관";
  if (OVERCOMES[day.element] === other.element)
    return samePolarity ? "편재" : "정재";
  if (OVERCOMES[other.element] === day.element)
    return samePolarity ? "편관" : "정관";
  // other가 day를 생함
  return samePolarity ? "편인" : "정인";
}

function stemChar(stemIdx: number, dayStemIdx: number | null): SajuChar {
  const stem = STEMS[stemIdx];
  return {
    ...stem,
    tenGod:
      dayStemIdx === null || dayStemIdx === stemIdx ? "일간" : tenGod(STEMS[dayStemIdx], stem),
  };
}

/** 지지 십신은 본기(지지 자체 오행·음양) 기준 */
function branchChar(branchIdx: number, dayStemIdx: number | null): SajuChar {
  const branch = BRANCHES[branchIdx];
  return {
    ...branch,
    tenGod:
      dayStemIdx === null ? "일간" : tenGod(STEMS[dayStemIdx], branch),
  };
}

/* ------------------------------------------------------------------ */
/* 주(柱) 계산 규칙                                                     */
/* ------------------------------------------------------------------ */

/**
 * 연주: 24절기 중 입춘(立春) 절입시각 기준으로 년 간지 변경.
 * 입춘 이전 출생이면 전년도 간지를 쓴다.
 */
async function computeYearPillar(birthMs: number, birthYear: number): Promise<{
  stemIdx: number;
  branchIdx: number;
  ganziYear: number;
}> {
  const ipchun = await getIpchun(birthYear);
  const ganziYear = birthMs < ipchun.ms ? birthYear - 1 : birthYear;
  return {
    stemIdx: ((ganziYear - 4) % 10 + 10) % 10,
    branchIdx: ((ganziYear - 4) % 12 + 12) % 12,
    ganziYear,
  };
}

/**
 * 월주: 12절입일(節入日)의 절입 '시각' 기준으로 월지 변경.
 * 월간은 년간으로부터 월두법(甲己之年 丙寅頭)으로 도출.
 */
async function computeMonthPillar(
  birthMs: number,
  birthYear: number,
  yearStemIdx: number,
): Promise<{ stemIdx: number; branchIdx: number; termName: string }> {
  const governing = await findGoverningMajorTerm(birthMs, birthYear);
  // 절기명 → 월지 매핑 (입춘→寅 … 소한→丑)
  const nameToBranch: Record<string, number> = {
    입춘: 2, 경칩: 3, 청명: 4, 입하: 5, 망종: 6, 소서: 7,
    입추: 8, 백로: 9, 한로: 10, 입동: 11, 대설: 0, 소한: 1,
  };
  const branchIdx = nameToBranch[governing.name];
  if (branchIdx === undefined) {
    throw new Error(`월주 기준 절기 매핑 실패: ${governing.name}`);
  }
  // 월두법: 인(寅)월의 천간 = (년간 % 5) * 2 + 2
  const firstStem = (((yearStemIdx % 5) * 2 + 2) % 10 + 10) % 10;
  const offsetFromIn = (branchIdx - 2 + 12) % 12; // 寅=0 … 丑=11
  return {
    stemIdx: (firstStem + offsetFromIn) % 10,
    branchIdx,
    termName: governing.name,
  };
}

/**
 * 시주: 오두법(五鼠遁) — 일간으로부터 자시 천간을 정한다.
 * 시간 범위 자체는 이미 30분 보정 시두법 슬롯(UI)에서 결정됨.
 */
function computeHourPillar(
  slotBranchIdx: number,
  dayStemIdx: number,
): { stemIdx: number; branchIdx: number } {
  // 甲己日 甲子時, 乙庚日 丙子時 …
  const firstStem = (((dayStemIdx % 5) * 2) % 10 + 10) % 10;
  return {
    stemIdx: (firstStem + slotBranchIdx) % 10,
    branchIdx: slotBranchIdx,
  };
}

/* ------------------------------------------------------------------ */
/* 명식 조립                                                           */
/* ------------------------------------------------------------------ */

function pillar(
  label: Pillar["label"],
  stemIdx: number,
  branchIdx: number,
  dayStemIdx: number | null,
): Pillar {
  const stem = stemChar(stemIdx, dayStemIdx);
  const branch = branchChar(branchIdx, dayStemIdx);
  return {
    label,
    title: `${stem.kor}${branch.kor}`,
    stem,
    branch,
  };
}

export async function assembleSaju(
  input: AssembleInput,
): Promise<SajuResult> {
  const { year, month, day } = input.solar;

  // 1) KASI 만세력: 일진(일주) + 음력 정보
  const cal = await getLunCalInfo(year, month, day);
  const iljinStem = STEM_KOR_INDEX[cal.dayGanji[0] ?? ""];
  const iljinBranch = BRANCH_KOR_INDEX[cal.dayGanji[1] ?? ""];
  if (iljinStem === undefined || iljinBranch === undefined) {
    throw new Error(
      `일진 간지 파싱 실패: ${cal.dayGanji} (KASI 응답이 예상과 다릅니다)`,
    );
  }

  // 2) 출생 대표 시각(KST 벽시계 → UTC ms 취급)
  //    절입 경계는 시각(분 단위) 기준이므로 선택한 시진의 중간 시각을 대표값으로 사용
  const midMin = input.timeSlot === null ? 720 : slotMidpointMinutes(input.timeSlot);
  const birthMs = Date.UTC(year, month - 1, day) + midMin * 60_000;

  // 3) 연주(입춘 기준) / 월주(12절입 시각 기준) — KASI 절입 시각 비교
  const y = await computeYearPillar(birthMs, year);
  const m = await computeMonthPillar(birthMs, year, y.stemIdx);

  // 4) 시주(30분 보정 시두법 슬롯 + 오두법)
  const h =
    input.timeSlot === null
      ? null
      : computeHourPillar(input.timeSlot, iljinStem);

  // 5) 명식 조립(일간 기준 십신 부여)
  const yearPillar = pillar("년주", y.stemIdx, y.branchIdx, iljinStem);
  const monthPillar = pillar("월주", m.stemIdx, m.branchIdx, iljinStem);
  const dayPillar = pillar("일주", iljinStem, iljinBranch, iljinStem);
  const hourPillar = h
    ? pillar("시주", h.stemIdx, h.branchIdx, iljinStem)
    : null;

  // 6) 오행 분포
  const elements: Record<Element, number> = {
    wood: 0,
    fire: 0,
    earth: 0,
    metal: 0,
    water: 0,
  };
  for (const p of [yearPillar, monthPillar, dayPillar, hourPillar]) {
    if (!p) continue;
    elements[p.stem.element] += 1;
    elements[p.branch.element] += 1;
  }

  const dayStem = STEMS[iljinStem];

  return {
    pillars: [yearPillar, monthPillar, dayPillar, hourPillar],
    elements,
    dayMaster: {
      han: dayStem.han,
      kor: dayStem.kor,
      element: dayStem.element,
      polarity: dayStem.polarity,
      keyword: DAY_MASTER_KEYWORDS[dayStem.kor] ?? "",
    },
    solar: { year, month, day },
    lunar: cal.lunar,
    dayGanji: cal.dayGanji,
    monthTerm: m.termName,
    ganziYear: y.ganziYear,
  };
}

/** LLM에 보낼 최소 명식 JSON (토큰 절약: 풀이 원문 없이 핵심만) */
export function toSajuCore(saju: SajuResult): SajuCore {
  return {
    사주: {
      년주: saju.pillars[0].title,
      월주: saju.pillars[1].title,
      일주: saju.pillars[2].title,
      시주: saju.pillars[3]?.title ?? null,
    },
    오행분포: saju.elements,
    일간: {
      간: saju.dayMaster.kor,
      오행: saju.dayMaster.element,
      음양: saju.dayMaster.polarity,
      키워드: saju.dayMaster.keyword,
    },
  };
}

/** 오행 분포를 한국어 라벨로 (UI용) */
export function elementRows(saju: SajuResult) {
  return (Object.keys(saju.elements) as Element[]).map((el) => ({
    element: el,
    label: ELEMENT_META[el].label,
    han: ELEMENT_META[el].han,
    count: saju.elements[el],
  }));
}
