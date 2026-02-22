import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "任务控制中心 | Mission Control",
  description: "实时数据看板 - Supabase 驱动",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        {/* Iconfont Symbol 方式接入 - 收藏集 53496 */}
        {/* 如果图标不显示，请访问 https://www.iconfont.cn/collections/detail?cid=53496 获取最新 JS 链接 */}
        <script src="//at.alicdn.com/t/c/font_5349612345.js" />
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
