import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "朝聘 · 候选人筛选",
  description:
    "多维度组合筛选与可自定义招聘 Agent；在线访问，即开即用。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
