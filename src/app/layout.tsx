import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "SkillFlow · 在线 AI Skill 工具箱",
    template: "%s · SkillFlow",
  },
  description: "在线使用精选 AI Skill，也可从小红书 SkillHub 安全导入纯文本技能并使用自己的模型运行。",
  keywords: ["AI Skill", "RedSkill", "小红书 SkillHub", "AI 工具", "高情商回复"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
