import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Check, FileText, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/site-header";
import { SkillIcon } from "@/components/skill-icon";
import { SkillRunner } from "@/components/skill-runner";
import { buildSkillSystemPrompt, getSkillDocument } from "@/lib/skill-content";
import { getSkillMeta, skills } from "@/lib/skill-catalog";

import styles from "./skill.module.css";

export function generateStaticParams() {
  return skills.map((skill) => ({ slug: skill.slug }));
}

export async function generateMetadata(
  props: PageProps<"/skills/[slug]">,
): Promise<Metadata> {
  const { slug } = await props.params;
  const skill = getSkillMeta(slug);
  if (!skill) return { title: "Skill 未找到" };

  return {
    title: skill.title,
    description: skill.summary,
  };
}

export default async function SkillPage(props: PageProps<"/skills/[slug]">) {
  const { slug } = await props.params;
  const skill = getSkillMeta(slug);
  const document = getSkillDocument(slug);
  if (!skill || !document) notFound();

  return (
    <>
      <a className="skip-link" href="#skill-main">跳到主要内容</a>
      <SiteHeader />
      <main className={styles.main} id="skill-main">
        <nav className={styles.breadcrumb} aria-label="面包屑">
          <Link href="/" prefetch={false}><ArrowLeft size={16} aria-hidden="true" />技能广场</Link>
          <span aria-hidden="true">/</span>
          <span>{skill.title}</span>
        </nav>

        <section className={styles.intro} data-tone={skill.tone}>
          <div className={styles.introIcon} aria-hidden="true">
            <SkillIcon name={skill.icon} size={34} strokeWidth={1.7} />
          </div>
          <div className={styles.introCopy}>
            <div className={styles.meta}>
              <span>{skill.category}</span>
              <span>{skill.format}</span>
              <span>文本版</span>
            </div>
            <h1>{skill.title}</h1>
            <p>{document.description}</p>
          </div>
          <div className={styles.trustList} aria-label="Skill 状态">
            <span><Check size={17} aria-hidden="true" />已验证 SKILL.md</span>
            <span><FileText size={17} aria-hidden="true" />仅执行文本指令</span>
            <span><ShieldCheck size={17} aria-hidden="true" />不运行附带脚本</span>
          </div>
        </section>

        <div className={styles.workspace}>
          <aside className={styles.sideNote}>
            <span>ABOUT THIS SKILL</span>
            <h2>从具体场景开始</h2>
            <p>{skill.summary}</p>
            <ul>
              <li>补充真实背景和你不能接受的结果</li>
              <li>不要在需求中粘贴密码、完整密钥或隐私凭证</li>
              <li>重要决定请结合事实自行复核</li>
            </ul>
          </aside>

          <SkillRunner skill={skill} instructions={buildSkillSystemPrompt(document)} />
        </div>
      </main>
      <footer className={styles.footer}><span>SkillFlow · zenzy</span><span>你的 Key，只用于你发起的请求</span></footer>
    </>
  );
}
