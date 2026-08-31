"use client";

import Link from "next/link";
import { ArrowLeft, Check, FileText, PackageX, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { SkillIcon } from "@/components/skill-icon";
import { SkillRunner } from "@/components/skill-runner";
import {
  buildImportedSkillSystemPrompt,
  getImportedSkill,
  toImportedSkillMeta,
  type ImportedSkill,
} from "@/lib/imported-skills";

import styles from "../../[slug]/skill.module.css";

type ImportedSkillPageProps = {
  identifier: string;
};

export function ImportedSkillPage({ identifier }: ImportedSkillPageProps) {
  const [skill, setSkill] = useState<ImportedSkill | null | undefined>(undefined);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setSkill(getImportedSkill(identifier) ?? null));
    return () => cancelAnimationFrame(frame);
  }, [identifier]);

  if (skill === undefined) {
    return (
      <main className={styles.main} id="skill-main">
        <div className={styles.loadState} role="status">正在读取本地 Skill…</div>
      </main>
    );
  }

  if (skill === null) {
    return (
      <main className={styles.main} id="skill-main">
        <div className={styles.loadState}>
          <PackageX size={30} aria-hidden="true" />
          <h1>当前浏览器没有这个 Skill</h1>
          <p>它可能尚未导入，或已经从“我的技能”中移除。</p>
          <Link href="/" prefetch={false}><ArrowLeft size={17} aria-hidden="true" />返回技能广场</Link>
        </div>
      </main>
    );
  }

  const meta = toImportedSkillMeta(skill);

  return (
    <main className={styles.main} id="skill-main">
      <nav className={styles.breadcrumb} aria-label="面包屑">
        <Link href="/" prefetch={false}><ArrowLeft size={16} aria-hidden="true" />技能广场</Link>
        <span aria-hidden="true">/</span>
        <span>{meta.title}</span>
      </nav>

      <section className={styles.intro} data-tone={meta.tone}>
        <div className={styles.introIcon} aria-hidden="true">
          <SkillIcon name={meta.icon} size={34} strokeWidth={1.7} />
        </div>
        <div className={styles.introCopy}>
          <div className={styles.meta}>
            <span>小红书 SkillHub</span>
            <span>v{skill.version}</span>
            <span>当前浏览器</span>
          </div>
          <h1>{meta.title}</h1>
          <p>{skill.description}</p>
        </div>
        <div className={styles.trustList} aria-label="Skill 状态">
          <span><Check size={17} aria-hidden="true" />SHA-256 已验证</span>
          <span><FileText size={17} aria-hidden="true" />仅执行 SKILL.md</span>
          <span><ShieldCheck size={17} aria-hidden="true" />附带脚本未加载</span>
        </div>
      </section>

      <div className={styles.workspace}>
        <aside className={styles.sideNote}>
          <span>IMPORTED FROM SKILLHUB</span>
          <h2>社区 Skill</h2>
          <p>{meta.summary}</p>
          <ul>
            <li>来源标识：{skill.identifier}</li>
            <li>技能内容只保存在当前浏览器</li>
            <li>运行前请确认输出目标与隐私边界</li>
          </ul>
        </aside>

        <SkillRunner skill={meta} instructions={buildImportedSkillSystemPrompt(skill)} />
      </div>
    </main>
  );
}
