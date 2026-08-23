import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "황금돼지 사주 | 사주팔자 만세력 풀이",
  description:
    "생년월시만 입력하면 한국천문연구원 만세력 데이터로 사주팔자를 짚어주고, 성격·재물운·직업운을 따뜻하게 풀이해 드립니다.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b0910",
};

export default function RootLayout({
  children,
}: LayoutProps<"/">) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <Toaster theme="dark" position="top-center" richColors />
      </body>
    </html>
  );
}
