import type { Metadata } from "next";
import { Store } from "lucide-react";

import { SiteHeader } from "@/components/site-header";

import { ImportedSkillPage } from "./imported-skill-page";
import styles from "../../[slug]/skill.module.css";

export const metadata: Metadata = {
  title: "我的 Skill",
  description: "运行从小红书 SkillHub 安全导入到当前浏览器的纯文本 Skill。",
};

export default async function ImportedSkillRoute(
  props: PageProps<"/skills/imported/[identifier]">,
) {
  const { identifier } = await props.params;
  return (
    <>
      <a className="skip-link" href="#skill-main">跳到主要内容</a>
      <SiteHeader />
      <ImportedSkillPage identifier={identifier} />
      <footer className={styles.footer}>
        <span>SkillFlow · zenzy</span>
        <span><Store size={14} aria-hidden="true" /> SkillHub 内容仅保存在当前浏览器</span>
      </footer>
    </>
  );
}
