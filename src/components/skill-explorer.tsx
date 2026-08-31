"use client";

import Link from "next/link";
import { ArrowRight, Search, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { SkillImporter } from "@/components/skill-importer";
import { SkillIcon } from "@/components/skill-icon";
import {
  readImportedSkills,
  removeImportedSkill,
  toImportedSkillMeta,
  type ImportedSkill,
} from "@/lib/imported-skills";
import {
  skillCategories,
  skills,
  type SkillCategory,
} from "@/lib/skill-catalog";

import styles from "./skill-explorer.module.css";

type CategoryFilter = "全部" | SkillCategory;

export function SkillExplorer() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("全部");
  const [importedSkills, setImportedSkills] = useState<ImportedSkill[]>([]);

  useEffect(() => {
    const syncImportedSkills = () => setImportedSkills(readImportedSkills());
    const frame = requestAnimationFrame(syncImportedSkills);
    window.addEventListener("storage", syncImportedSkills);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("storage", syncImportedSkills);
    };
  }, []);

  const filteredSkills = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");
    const catalog = [
      ...skills.map((skill) => ({ skill, href: `/skills/${skill.slug}`, imported: false as const })),
      ...importedSkills.map((item) => ({
        skill: toImportedSkillMeta(item),
        href: `/skills/imported/${encodeURIComponent(item.identifier)}`,
        imported: true as const,
      })),
    ];

    return catalog.filter(({ skill }) => {
      const matchesCategory = category === "全部" || skill.category === category;
      const searchableText = [
        skill.title,
        skill.summary,
        skill.category,
        ...skill.keywords,
      ]
        .join(" ")
        .toLocaleLowerCase("zh-CN");
      return matchesCategory && (!normalizedQuery || searchableText.includes(normalizedQuery));
    });
  }, [category, importedSkills, query]);

  function deleteImportedSkill(identifier: string, title: string) {
    if (!window.confirm(`确定从当前浏览器移除“${title}”吗？`)) return;
    setImportedSkills(removeImportedSkill(identifier));
  }

  return (
    <div className={styles.explorer}>
      <SkillImporter importedSkills={importedSkills} onImported={setImportedSkills} />

      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <label htmlFor="skill-search">搜索 Skill</label>
          <div className={styles.searchField}>
            <Search size={19} aria-hidden="true" />
            <input
              id="skill-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="输入场景或关键词"
              autoComplete="off"
            />
          </div>
        </div>

        <div className={styles.filters} aria-label="按类别筛选 Skill">
          {skillCategories.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={category === item}
              onClick={() => setCategory(item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <p className={styles.resultCount} aria-live="polite">
        找到 {filteredSkills.length} 个 Skill
      </p>

      {filteredSkills.length > 0 ? (
        <div className={styles.grid}>
          {filteredSkills.map(({ skill, href, imported }, index) => {
            const card = (
              <Link
                className={styles.card}
                href={href}
                prefetch={false}
                data-tone={skill.tone}
                style={{ animationDelay: `${Math.min(index * 45, 240)}ms` }}
              >
                <span className={styles.cardTopline}>
                  <span className={styles.iconWrap} aria-hidden="true">
                    <SkillIcon name={skill.icon} size={24} strokeWidth={1.8} />
                  </span>
                  <span className={styles.category}>{skill.category}</span>
                  {skill.featured ? (
                    <span className={styles.featured}>
                      <Sparkles size={13} aria-hidden="true" />
                      热门
                    </span>
                  ) : null}
                </span>
                <span className={styles.cardBody}>
                  <strong>{skill.title}</strong>
                  <span>{skill.summary}</span>
                </span>
                <span className={styles.cardFooter}>
                  <span>{skill.format}</span>
                  <span className={styles.openAction}>
                    立即使用
                    <ArrowRight size={17} aria-hidden="true" />
                  </span>
                </span>
              </Link>
            );

            return (
              <div className={styles.cardFrame} key={skill.slug}>
                {card}
                {imported ? (
                  <button
                    className={styles.removeButton}
                    type="button"
                    onClick={() => deleteImportedSkill(skill.slug, skill.title)}
                    aria-label={`移除 ${skill.title}`}
                    title="从当前浏览器移除"
                  >
                    <Trash2 size={17} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.empty}>
          <Search size={24} aria-hidden="true" />
          <strong>没有匹配的 Skill</strong>
          <span>换一个关键词或类别试试。</span>
        </div>
      )}
    </div>
  );
}
