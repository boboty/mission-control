import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "任务控制中心 | Mission Claw",
  description: "实时数据看板 - Supabase 驱动",
  icons: {
    icon: [{ url: "/favicon-32.png", type: "image/png" }],
    apple: [{ url: "/icon-192.png", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Lucide React 图标库 - 本地安装，无需外部 CDN */}
        <style dangerouslySetInnerHTML={{ __html: `
          .icon {
            display: inline-block;
            vertical-align: middle;
            fill: currentColor;
          }
        ` }} />
      </head>
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
