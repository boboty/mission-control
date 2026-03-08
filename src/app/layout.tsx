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
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 主题初始化脚本 - 防止闪烁 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const THEME_KEY = 'mission-claw-theme';
                try {
                  const stored = localStorage.getItem(THEME_KEY);
                  const theme = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
                  document.documentElement.setAttribute('data-theme', theme);
                } catch (e) {
                  document.documentElement.setAttribute('data-theme', 'system');
                }
              })();
            `,
          }}
        />
        {/* Lucide React 图标库 - 本地安装，无需外部 CDN */}
        <style dangerouslySetInnerHTML={{ __html: `
          .icon {
            display: inline-block;
            vertical-align: middle;
            fill: currentColor;
          }
        ` }} />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
