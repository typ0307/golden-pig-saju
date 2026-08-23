import type { BranchInfo, Element, StemInfo } from "./types";

/** 십천간 (갑→계) */
export const STEMS: StemInfo[] = [
  { han: "甲", kor: "갑", element: "wood", polarity: "yang" },
  { han: "乙", kor: "을", element: "wood", polarity: "yin" },
  { han: "丙", kor: "병", element: "fire", polarity: "yang" },
  { han: "丁", kor: "정", element: "fire", polarity: "yin" },
  { han: "戊", kor: "무", element: "earth", polarity: "yang" },
  { han: "己", kor: "기", element: "earth", polarity: "yin" },
  { han: "庚", kor: "경", element: "metal", polarity: "yang" },
  { han: "辛", kor: "신", element: "metal", polarity: "yin" },
  { han: "壬", kor: "임", element: "water", polarity: "yang" },
  { han: "癸", kor: "계", element: "water", polarity: "yin" },
];

/** 십이지지 (자→해). 음양은 陽支(자인진오신술)/陰支(축묘사미유해) 기준. */
export const BRANCHES: BranchInfo[] = [
  { han: "子", kor: "자", element: "water", polarity: "yang" },
  { han: "丑", kor: "축", element: "earth", polarity: "yin" },
  { han: "寅", kor: "인", element: "wood", polarity: "yang" },
  { han: "卯", kor: "묘", element: "wood", polarity: "yin" },
  { han: "辰", kor: "진", element: "earth", polarity: "yang" },
  { han: "巳", kor: "사", element: "fire", polarity: "yin" },
  { han: "午", kor: "오", element: "fire", polarity: "yang" },
  { han: "未", kor: "미", element: "earth", polarity: "yin" },
  { han: "申", kor: "신", element: "metal", polarity: "yang" },
  { han: "酉", kor: "유", element: "metal", polarity: "yin" },
  { han: "戌", kor: "술", element: "earth", polarity: "yang" },
  { han: "亥", kor: "해", element: "water", polarity: "yin" },
];

export const STEM_KOR_INDEX: Record<string, number> = Object.fromEntries(
  STEMS.map((s, i) => [s.kor, i]),
);
export const BRANCH_KOR_INDEX: Record<string, number> = Object.fromEntries(
  BRANCHES.map((b, i) => [b.kor, i]),
);

/** 오행 상생: 목→화→토→금→수→목 */
export const GENERATES: Record<Element, Element> = {
  wood: "fire",
  fire: "earth",
  earth: "metal",
  metal: "water",
  water: "wood",
};

/** 오행 상극: 목→토, 토→수, 수→화, 화→금, 금→목 */
export const OVERCOMES: Record<Element, Element> = {
  wood: "earth",
  earth: "water",
  water: "fire",
  fire: "metal",
  metal: "wood",
};

export const ELEMENT_META: Record<
  Element,
  { label: string; han: string; color: string; cssVar: string; desc: string; tip: string }
> = {
  wood: { label: "목", han: "木", color: "#4caf6d", cssVar: "var(--color-el-wood)", desc: "성장 · 확장", tip: "목(木) — 봄의 나무처럼 자라는 기운. 배움과 계획, 성장을 좋아하는 에너지예요." },
  fire: { label: "화", han: "火", color: "#e05252", cssVar: "var(--color-el-fire)", desc: "열정 · 표현", tip: "화(火) — 태양처럼 밝고 뜨거운 기운. 열정과 표현력, 사람을 끌어당기는 힘이에요." },
  earth: { label: "토", han: "土", color: "#d4af37", cssVar: "var(--color-el-earth)", desc: "신뢰 · 포용", tip: "토(土) — 대지처럼 포용하는 기운. 신뢰와 안정을 중시하고 사람을 모아주는 힘이에요." },
  metal: { label: "금", han: "金", color: "#d8dce4", cssVar: "var(--color-el-metal)", desc: "결단 · 기준", tip: "금(金) — 단단한 쇠처럼 결단 있는 기운. 원칙과 기준이 분명하고 깔끔해요." },
  water: { label: "수", han: "水", color: "#5b8dd6", cssVar: "var(--color-el-water)", desc: "지혜 · 흐름", tip: "수(水) — 물처럼 흐르고 스며드는 기운. 지혜와 유연함, 소통이 강점이에요." },
};

/** 십신(十神) 툴팁 설명 — 일간(나)과 각 글자의 관계 */
export const TEN_GOD_DESC: Record<string, string> = {
  일간: "일간은 '나 자신'을 뜻하는 글자예요.",
  비견: "나와 같은 기운 — 자립심과 주체성이 강한 친구 같은 에너지",
  겁재: "나와 같은 오행의 반대 성질 — 승부욕과 추진력",
  식신: "내가 키워주는 기운 — 꾸준한 표현력과 재능",
  상관: "내가 키워주는 기운(반대 성질) — 창의성과 순발력",
  편재: "내가 다스리는 기운 — 재물 감각과 실천력",
  정재: "내가 다스리는 기운(반대 성질) — 성실하게 모아지는 재물운",
  편관: "나를 다스리는 기운 — 카리스마와 책임감",
  정관: "나를 다스리는 기운(반대 성질) — 신뢰와 규범",
  편인: "나를 키워주는 기운 — 직관과 통찰",
  정인: "나를 키워주는 기운(반대 성질) — 학문과 배려",
};

/** 주요 용어 툴팁 설명 */
export const TERM_DESC = {
  myeongsig:
    "사주팔자(四柱八字)를 표로 정리한 것. 태어난 연·월·일·시 네 기둥(사주)에 든 여덟 글자(팔자)를 보여줘요.",
  dayMaster:
    "일간(日干) — 일주의 첫 글자로 '나 자신'을 나타내는 가장 중요한 글자. 성격과 본성의 중심이에요.",
  elements:
    "사주 여덟 글자에 목·화·토·금·수 다섯 기운(오행)이 각각 몇 개씩 들어있는지 나타내요. 어떤 기운이 강하고 부족한지로 성향의 균형을 읽습니다.",
  iljin: "일진(日辰) — 태어난 날의 간지. 60갑자가 하루씩 순환하며, 일주와 같은 의미예요.",
} as const;

/** 일간(日干)별 현대적 키워드 */
export const DAY_MASTER_KEYWORDS: Record<string, string> = {
  갑: "숲의 큰나무 · 개척과 리더십",
  을: "화초와 덩굴 · 유연함과 적응력",
  병: "태양 · 열정과 표현력",
  정: "촛불과 별빛 · 섬세한 배려",
  무: "산과 대지 · 포용과 신뢰",
  기: "밭의 흙 · 실용과 끈기",
  경: "무쇠와 바위 · 의지와 추진력",
  신: "보석과 칼끝 · 명료한 기준",
  임: "큰 강과 바다 · 지혜와 흐름",
  계: "이슬과 빗물 · 통찰과 감수성",
};

/**
 * 24절기 정의. lon = 태양 황경(절입 기준각).
 * branch는 12절입(月 지지 변경 기준)에만 지정.
 *   입춘→寅(2), 경칩→卯(3), 청명→辰(4), 입하→巳(5), 망종→午(6), 소서→未(7),
 *   입추→申(8), 백로→酉(9), 한로→戌(10), 입동→亥(11), 대설→子(0), 소한→丑(1)
 */
export const SOLAR_TERM_DEFS: { name: string; lon: number; branch: number | null }[] = [
  { name: "입춘", lon: 315, branch: 2 },
  { name: "우수", lon: 330, branch: null },
  { name: "경칩", lon: 345, branch: 3 },
  { name: "춘분", lon: 0, branch: null },
  { name: "청명", lon: 15, branch: 4 },
  { name: "곡우", lon: 30, branch: null },
  { name: "입하", lon: 45, branch: 5 },
  { name: "소만", lon: 60, branch: null },
  { name: "망종", lon: 75, branch: 6 },
  { name: "하지", lon: 90, branch: null },
  { name: "소서", lon: 105, branch: 7 },
  { name: "대서", lon: 120, branch: null },
  { name: "입추", lon: 135, branch: 8 },
  { name: "처서", lon: 150, branch: null },
  { name: "백로", lon: 165, branch: 9 },
  { name: "추분", lon: 180, branch: null },
  { name: "한로", lon: 195, branch: 10 },
  { name: "상강", lon: 210, branch: null },
  { name: "입동", lon: 225, branch: 11 },
  { name: "소설", lon: 240, branch: null },
  { name: "대설", lon: 255, branch: 0 },
  { name: "동지", lon: 270, branch: null },
  { name: "소한", lon: 285, branch: 1 },
  { name: "대한", lon: 300, branch: null },
];

/**
 * 시진(時辰) 슬롯 — 한국 표준시(동경 135°)와 서울 자오선(동경 127.5°)의
 * 30분 시차를 보정한 시두법(時頭法) 기준 범위.
 * 출생 시각에서 30분을 차감한 뒤 자시 23:30~01:29 기준으로 2시간씩 구분한다.
 * (즉 실제 시계 시간 기준 자시는 00:00~01:29, 해시는 21:30~23:59)
 */
export const TIME_SLOTS: { branch: number; label: string; range: string }[] = [
  { branch: 0, label: "자시", range: "00:00 ~ 01:29" },
  { branch: 1, label: "축시", range: "01:30 ~ 03:29" },
  { branch: 2, label: "인시", range: "03:30 ~ 05:29" },
  { branch: 3, label: "묘시", range: "05:30 ~ 07:29" },
  { branch: 4, label: "진시", range: "07:30 ~ 09:29" },
  { branch: 5, label: "사시", range: "09:30 ~ 11:29" },
  { branch: 6, label: "오시", range: "11:30 ~ 13:29" },
  { branch: 7, label: "미시", range: "13:30 ~ 15:29" },
  { branch: 8, label: "신시", range: "15:30 ~ 17:29" },
  { branch: 9, label: "유시", range: "17:30 ~ 19:29" },
  { branch: 10, label: "술시", range: "19:30 ~ 21:29" },
  { branch: 11, label: "해시", range: "21:30 ~ 23:59" },
];

/** 시두법 슬롯의 대표(중간) 시각(분 단위). 절입 경계 비교에 사용. */
export function slotMidpointMinutes(slot: number): number {
  // 자시(0): 00:00~01:29 → 중간 00:45, 그 외: 시작(120i-30분) + 1시간
  if (slot === 0) return 45;
  return 120 * slot - 30 + 60;
}

/**
 * 지원 생년 범위 — 현재 시점 기준 동산 계산.
 * - 최소: 현재 연도 - 100년
 * - 최대: 현재 연도 (월·일은 스키마에서 미래 날짜 차단)
 * - 음양력·일진: KASI API 제공 범위 내 (1391~2050)
 * - 24절기: 2000년 미만은 astronomy-engine 로컬 계산 폴백
 */
const NOW = new Date();
export const MIN_BIRTH_YEAR = NOW.getFullYear() - 100;
export const MAX_BIRTH_YEAR = NOW.getFullYear();
