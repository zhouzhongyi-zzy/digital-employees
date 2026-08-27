import { KeyRound, PackageCheck, Play, Store, WandSparkles } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SkillExplorer } from "@/components/skill-explorer";

import styles from "./marketplace-page.module.css";

export function MarketplacePage() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        跳到主要内容
      </a>
      <SiteHeader />
      <main id="main-content">
        <section className={styles.hero} aria-labelledby="marketplace-title">
          <div className={styles.heroInner}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>CURATED SKILLS + REDSKILL</span>
              <h1 id="marketplace-title">把好用的 AI Skill，变成随时能用的在线工具</h1>
              <p>
                直接使用精选技能，或从小红书 SkillHub 添加新的 Skill，再用你自己的模型运行。
              </p>
              <div className={styles.facts} aria-label="产品信息">
                <span>
                  <WandSparkles size={18} aria-hidden="true" />7 个精选 Skill
                </span>
                <span>
                  <Store size={18} aria-hidden="true" />支持 SkillHub 导入
                </span>
                <span>
                  <KeyRound size={18} aria-hidden="true" />使用自己的 API Key
                </span>
              </div>
            </div>

            <div className={styles.heroVisual} aria-hidden="true">
              <div className={styles.visualNode} data-node="prompt">
                <Store size={28} />
              </div>
              <span className={styles.visualLine} />
              <div className={styles.visualCore}>
                <PackageCheck size={38} />
                <span>SKILL</span>
              </div>
              <span className={styles.visualLine} />
              <div className={styles.visualNode} data-node="result">
                <Play size={28} />
              </div>
            </div>
          </div>
        </section>

        <section className={styles.market} aria-labelledby="skills-title">
          <div className={styles.sectionHeading}>
            <div>
              <span>SKILL MARKETPLACE</span>
              <h2 id="skills-title">精选技能与我的 Skill</h2>
            </div>
            <p>按场景挑选，或用小红书提供的安装话术添加社区 Skill。</p>
          </div>
          <SkillExplorer />
        </section>
      </main>

      <footer className={styles.footer}>
        <span>SkillFlow · zenzy</span>
        <span>AI 结果由你选择的模型生成</span>
      </footer>
    </>
  );
}
