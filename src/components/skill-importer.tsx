"use client";

import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Download,
  LoaderCircle,
  PackageCheck,
  ShieldCheck,
  Store,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";

import {
  isImportedSkill,
  saveImportedSkill,
  type ImportedSkill,
} from "@/lib/imported-skills";
import { extractRedSkillIdentifier } from "@/lib/redskill-identifier";
import { getSkillMeta } from "@/lib/skill-catalog";

import styles from "./skill-importer.module.css";

type SkillImporterProps = {
  importedSkills: ImportedSkill[];
  onImported: (skills: ImportedSkill[]) => void;
};

type ImportNotice = { kind: "error" | "success"; text: string } | null;

async function readPayload(response: Response) {
  try {
    return await response.json() as unknown;
  } catch {
    return undefined;
  }
}

function getPayloadError(payload: unknown) {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return undefined;
  const error = (payload as Record<string, unknown>).error;
  return typeof error === "string" ? error : undefined;
}

export function SkillImporter({ importedSkills, onImported }: SkillImporterProps) {
  const [input, setInput] = useState("");
  const [preview, setPreview] = useState<ImportedSkill | null>(null);
  const [notice, setNotice] = useState<ImportNotice>(null);
  const [loading, setLoading] = useState(false);
  const abortController = useRef<AbortController | null>(null);
  const identifier = useMemo(() => extractRedSkillIdentifier(input), [input]);
  const builtInSkill = identifier ? getSkillMeta(identifier) : undefined;
  const alreadyImported = preview
    ? importedSkills.some((skill) => skill.identifier === preview.identifier)
    : false;

  async function inspectSkill() {
    if (!identifier) {
      setNotice({ kind: "error", text: "请输入 Skill identifier，或粘贴小红书提供的完整安装话术。" });
      setPreview(null);
      return;
    }

    setNotice(null);
    setPreview(null);
    if (builtInSkill) return;

    abortController.current?.abort();
    const controller = new AbortController();
    abortController.current = controller;
    setLoading(true);

    try {
      const response = await fetch("/api/skills/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input }),
        cache: "no-store",
        signal: controller.signal,
      });
      const payload = await readPayload(response);
      if (!response.ok) throw new Error(getPayloadError(payload) ?? `导入服务返回 ${response.status}`);

      const skill = typeof payload === "object" && payload !== null && !Array.isArray(payload)
        ? (payload as Record<string, unknown>).skill
        : undefined;
      if (!isImportedSkill(skill)) throw new Error("SkillHub 返回的技能数据不完整");
      setPreview(skill);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setNotice({
        kind: "error",
        text: error instanceof Error ? error.message : "暂时无法下载该 Skill，请稍后重试。",
      });
    } finally {
      if (abortController.current === controller) abortController.current = null;
      setLoading(false);
    }
  }

  function addSkill() {
    if (!preview) return;
    try {
      const nextSkills = saveImportedSkill(preview);
      onImported(nextSkills);
      setNotice({
        kind: "success",
        text: alreadyImported ? "Skill 已更新，可以继续使用。" : "Skill 已添加到当前浏览器。",
      });
    } catch {
      setNotice({ kind: "error", text: "浏览器存储空间不足，暂时无法保存该 Skill。" });
    }
  }

  return (
    <section className={styles.importer} aria-labelledby="skillhub-import-title">
      <div className={styles.heading}>
        <span className={styles.icon} aria-hidden="true"><Store size={22} /></span>
        <div>
          <span>REDSKILL / XIAOHONGSHU</span>
          <h3 id="skillhub-import-title">从小红书 SkillHub 添加技能</h3>
        </div>
        <span className={styles.safety}><ShieldCheck size={16} aria-hidden="true" />只读取 SKILL.md</span>
      </div>

      <div className={styles.formRow}>
        <div className={styles.field}>
          <label htmlFor="redskill-input">安装话术或 Skill identifier</label>
          <textarea
            id="redskill-input"
            value={input}
            onChange={(event) => {
              setInput(event.target.value.slice(0, 2_000));
              setNotice(null);
              setPreview(null);
            }}
            placeholder="例如：thoughtful-reply-assistant"
            rows={3}
            aria-describedby="redskill-help"
          />
          <span id="redskill-help" className={styles.helper}>
            {identifier ? <>已识别：<code>{identifier}</code></> : "支持直接粘贴小红书发送的完整安装文字。"}
          </span>
        </div>
        <button className={styles.inspectButton} type="button" onClick={inspectSkill} disabled={loading}>
          {loading ? <LoaderCircle className={styles.spin} size={18} aria-hidden="true" /> : <Download size={18} aria-hidden="true" />}
          {loading ? "安全检查中" : "识别并下载"}
        </button>
      </div>

      {builtInSkill ? (
        <div className={styles.preview} data-kind="existing">
          <span className={styles.previewIcon}><CheckCircle2 size={23} aria-hidden="true" /></span>
          <div className={styles.previewCopy}>
            <span>已收录</span>
            <strong>{builtInSkill.title}</strong>
            <p>这个 Skill 已经内置，无需重复下载。</p>
          </div>
          <Link href={`/skills/${builtInSkill.slug}`} prefetch={false}>直接使用<ArrowRight size={17} aria-hidden="true" /></Link>
        </div>
      ) : null}

      {preview ? (
        <div className={styles.preview}>
          <span className={styles.previewIcon}><PackageCheck size={23} aria-hidden="true" /></span>
          <div className={styles.previewCopy}>
            <span>校验通过 · v{preview.version}</span>
            <strong>{preview.title}</strong>
            <p>{preview.description}</p>
            <small><Check size={14} aria-hidden="true" />SHA-256 已验证</small>
          </div>
          <button type="button" onClick={addSkill}>
            {alreadyImported ? "更新技能" : "添加到我的技能"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      ) : null}

      {notice ? (
        <div className={styles.notice} data-kind={notice.kind} role={notice.kind === "error" ? "alert" : "status"}>
          {notice.text}
        </div>
      ) : null}
    </section>
  );
}
