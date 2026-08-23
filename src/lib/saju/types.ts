/** 오행 */
export type Element = "wood" | "fire" | "earth" | "metal" | "water";

/** 음양 */
export type Polarity = "yang" | "yin";

export interface StemInfo {
  /** 한자 (예: 甲) */
  han: string;
  /** 한글 읽기 (예: 갑) */
  kor: string;
  element: Element;
  polarity: Polarity;
}

export interface BranchInfo {
  han: string;
  kor: string;
  element: Element;
  polarity: Polarity;
}

/** 십신 */
export type TenGod =
  | "비견"
  | "겁재"
  | "식신"
  | "상관"
  | "편재"
  | "정재"
  | "편관"
  | "정관"
  | "편인"
  | "정인";

/** 명식을 이루는 글자 하나(천간 또는 지지) */
export interface SajuChar {
  han: string;
  kor: string;
  element: Element;
  polarity: Polarity;
  /** 일간 기준 십신 (일간 자신은 "일간") */
  tenGod: TenGod | "일간";
}

export interface Pillar {
  label: "년주" | "월주" | "일주" | "시주";
  title: string; // 예: "병오"
  stem: SajuChar;
  branch: SajuChar;
}

export interface SajuResult {
  pillars: [Pillar, Pillar, Pillar, Pillar | null]; // 시주는 시간 모름이면 null
  /** 오행 개수 (천간 4 + 지지 4, 시간 모름이면 각 3) */
  elements: Record<Element, number>;
  dayMaster: {
    han: string;
    kor: string;
    element: Element;
    polarity: Polarity;
    keyword: string;
  };
  /** 양력 생년월일 */
  solar: { year: number; month: number; day: number };
  /** 음력 생년월일 (KASI 변환 결과) */
  lunar: {
    year: number;
    month: number;
    day: number;
    isLeapMonth: boolean;
  } | null;
  /** KASI 일진 (예: "정해") */
  dayGanji: string;
  /** 월주의 기준이 된 절기 */
  monthTerm: string;
  /** 연주의 기준이 된 입춘 연도 */
  ganziYear: number;
}

/** 메인 풀이/추가질문 API에 전달할 최소 명식 페이로드 */
export interface SajuCore {
  사주: {
    년주: string;
    월주: string;
    일주: string;
    시주: string | null;
  };
  오행분포: Record<Element, number>;
  일간: { 간: string; 오행: Element; 음양: Polarity; 키워드: string };
}
