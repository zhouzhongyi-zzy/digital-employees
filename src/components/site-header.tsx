import Link from "next/link";
import { BookOpenText, ExternalLink, Sparkles, Store } from "lucide-react";

import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/" aria-label="SkillFlow 首页">
          <span className={styles.brandMark} aria-hidden="true">
            <Sparkles size={20} strokeWidth={2} />
          </span>
          <span>
            <strong>SkillFlow</strong>
            <small>AI 技能工具箱</small>
          </span>
        </Link>

        <nav className={styles.nav} aria-label="主导航">
          <Link className={styles.navLink} href="/skills#skillhub-import-title">
            <Store size={16} aria-hidden="true" />
            <span>导入 Skill</span>
          </Link>
          <a
            className={styles.docsLink}
            href="https://zenzy.aitoken.credit/docs/"
            target="_blank"
            rel="noreferrer"
          >
            <BookOpenText size={17} aria-hidden="true" />
            <span>API 文档</span>
            <ExternalLink size={14} aria-hidden="true" />
          </a>
        </nav>
      </div>
    </header>
  );
}
