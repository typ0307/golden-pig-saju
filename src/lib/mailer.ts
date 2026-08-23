import nodemailer from "nodemailer";
import { ELEMENT_META } from "@/lib/saju/constants";
import type { MailInput } from "@/lib/validation/birthSchema";
import type { Element } from "@/lib/saju/types";

/**
 * Gmail SMTP 발송 클라이언트.
 *
 * 필요한 환경 변수:
 *   MAIL_GMAIL_USER        — 발송용 Gmail 주소
 *   MAIL_GMAIL_APP_PASSWORD — Google 계정 2단계 인증 후 발급한 '앱 비밀번호' 16자리
 *
 * Gmail 일반 비밀번호로는 SMTP 로그인이 차단되므로 반드시 앱 비밀번호를 사용한다.
 */

export class MailNotConfiguredError extends Error {
  constructor() {
    super("메일 발송 설정이 완료되지 않았습니다.");
    this.name = "MailNotConfiguredError";
  }
}

export function assertMailConfigured(): { user: string; pass: string } {
  const user = process.env.MAIL_GMAIL_USER ?? "";
  const pass = process.env.MAIL_GMAIL_APP_PASSWORD ?? "";
  if (!user || !pass) throw new MailNotConfiguredError();
  return { user, pass };
}

/* ------------------------------------------------------------------ */
/* 이메일 HTML 렌더링 (인라인 스타일 — 이메일 클라이언트 호환)             */
/* ------------------------------------------------------------------ */

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function inlineMd(s: string): string {
  // **굵게**만 지원 (풀이 출력 형식에 맞춤)
  return escapeHtml(s).replace(
    /\*\*([^*]+)\*\*/g,
    "<strong>$1</strong>",
  );
}

/** 풀이 텍스트(마크다운 라이트) → HTML 블록 */
function interpretationToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => {
      const heading = block.match(/^#{1,3}\s*(.+)$/m);
      if (heading) {
        const rest = block
          .split("\n")
          .filter((l) => !/^#{1,3}\s/.test(l))
          .join(" ")
          .trim();
        return (
          `<h3 style="margin:24px 0 8px;font-size:16px;line-height:1.5;` +
          `color:#8a6d1d;border-bottom:1px solid #e5d9a8;padding-bottom:4px;">` +
          `${escapeHtml(heading[1].trim())}</h3>` +
          (rest
            ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.8;color:#333;">${inlineMd(rest)}</p>`
            : "")
        );
      }
      return `<p style="margin:0 0 12px;font-size:15px;line-height:1.8;color:#333;">${inlineMd(block)}</p>`;
    })
    .join("");
}

interface MailChar {
  han: string;
  kor: string;
  element: Element;
  polarity: "yang" | "yin";
  tenGod: string;
}

function pillarCell(
  label: string,
  title: string,
  char: MailChar,
): string {
  const color = ELEMENT_META[char.element].color;
  return (
    `<td align="center" valign="top" style="width:25%;padding:12px 6px;border:1px solid #e8e0c8;border-radius:10px;background:#fdfaf2;">` +
    `<div style="font-size:11px;color:#999;margin-bottom:8px;">${escapeHtml(label)} · ${escapeHtml(title)}</div>` +
    `<div style="font-size:30px;line-height:1.1;color:${color};font-weight:700;">${escapeHtml(char.han)}</div>` +
    `<div style="font-size:12px;color:#666;margin:2px 0 8px;">${escapeHtml(char.kor)} · <span style="color:${color};">${escapeHtml(char.tenGod)}</span></div>` +
    `</td>`
  );
}

export function renderSajuEmail(input: MailInput): { subject: string; html: string; text: string } {
  const { saju, name, interpretation } = input;
  const dm = saju.dayMaster;
  const dmColor = ELEMENT_META[dm.element].color;

  const pillarRows = saju.pillars
    .map((p, i) => {
      if (!p) {
        return (
          `<td align="center" valign="top" style="width:25%;padding:12px 6px;border:1px dashed #ddd;border-radius:10px;background:#fafafa;">` +
          `<div style="font-size:11px;color:#999;margin-bottom:8px;">시주</div>` +
          `<div style="font-size:30px;color:#ccc;">?</div>` +
          `<div style="font-size:11px;color:#aaa;margin-top:8px;">시간 모름</div></td>`
        );
      }
      const labels = ["년주", "월주", "일주", "시주"] as const;
      return pillarCell(labels[i] ?? p.label, p.title, p.stem) ;
    })
    .join("");

  const elementRows = (Object.keys(saju.elements) as Element[])
    .map((el) => {
      const meta = ELEMENT_META[el];
      const count = saju.elements[el];
      return (
        `<span style="display:inline-block;margin:0 10px 6px 0;font-size:14px;color:#444;">` +
        `<span style="color:${meta.color};font-weight:700;">●</span> ` +
        `${meta.label}(${meta.han}) ${count}개</span>`
      );
    })
    .join("");

  const solar = `${saju.solar.year}.${String(saju.solar.month).padStart(2, "0")}.${String(saju.solar.day).padStart(2, "0")}`;
  const lunar = saju.lunar
    ? `${saju.lunar.isLeapMonth ? "윤" : ""}${saju.lunar.month}/${saju.lunar.day}`
    : "";

  const html = `<!DOCTYPE html>
<html lang="ko"><body style="margin:0;padding:24px 12px;background:#f4f0e4;">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e0c8;">

  <div style="padding:28px 24px 20px;text-align:center;background:linear-gradient(135deg,#1a1523,#2a2138);">
    <div style="font-size:13px;letter-spacing:6px;color:#d4af37;">金豚四柱</div>
    <h1 style="margin:8px 0 4px;font-size:22px;color:#f2ead3;">${escapeHtml(name)}님의 사주풀이</h1>
    <div style="font-size:12px;color:#9c93a8;">${solar}${lunar ? ` · 음력 ${lunar}` : ""} · 황금돼지 사주</div>
  </div>

  <div style="padding:24px;">
    <table role="presentation" style="width:100%;border-collapse:separate;border-spacing:6px;">
      <tr>${pillarRows}</tr>
    </table>

    <div style="margin-top:20px;padding:14px 16px;border:1px solid #e8e0c8;border-radius:10px;background:#fdfaf2;">
      <span style="font-size:26px;font-weight:700;color:${dmColor};margin-right:8px;">${escapeHtml(dm.han)}</span>
      <span style="font-size:14px;color:#444;">${escapeHtml(dm.kor)}일간 — ${escapeHtml(dm.keyword)}</span>
    </div>

    <div style="margin-top:16px;">
      <div style="font-size:12px;color:#999;margin-bottom:8px;">오행 분포</div>
      ${elementRows}
    </div>

    <div style="margin-top:24px;border-top:1px solid #eee;padding-top:8px;">
      ${interpretationToHtml(interpretation)}
    </div>
  </div>

  <div style="padding:18px 24px;background:#faf7ef;border-top:1px solid #eee;text-align:center;">
    <p style="margin:0;font-size:11px;line-height:1.7;color:#999;">
      본 메일은 황금돼지 사주에서 요청하신 분께만 발송되었습니다.<br/>
      입력하신 생년월시는 발송 후 어디에도 저장되지 않아요.<br/>
      본 풀이는 참고용 콘텐츠이며 전문 상담·의료·법률·투자 조언을 대체하지 않습니다.
    </p>
  </div>
</div>
</body></html>`;

  const text = [
    `${name}님의 사주풀이 (${solar})`,
    "",
    ...saju.pillars.map((p, i) =>
      p ? `${["년주", "월주", "일주", "시주"][i]} ${p.title}` : "시주 시간모름",
    ),
    "",
    `일간 ${dm.kor}(${dm.han}) — ${dm.keyword}`,
    "",
    interpretation,
  ].join("\n");

  return {
    subject: `${name}님의 사주풀이가 도착했어요 🐷✨`,
    html,
    text,
  };
}

/* ------------------------------------------------------------------ */
/* 발송                                                                */
/* ------------------------------------------------------------------ */

export async function sendSajuMail(input: MailInput): Promise<void> {
  const { user, pass } = assertMailConfigured();

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  const { subject, html, text } = renderSajuEmail(input);

  await transporter.sendMail({
    from: `"황금돼지 사주" <${user}>`,
    to: input.email,
    subject,
    html,
    text,
  });
}
