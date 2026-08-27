import type { SkillMeta } from "@/lib/skill-catalog";
import { REDSKILL_IDENTIFIER_PATTERN } from "@/lib/redskill-identifier";

const STORAGE_KEY = "skillflow:imported-skills:v1";
const MAX_IMPORTED_SKILLS = 20;

export type ImportedSkill = {
  identifier: string;
  name: string;
  title: string;
  description: string;
  instructions: string;
  version: string;
  sha256: string;
  importedAt: string;
};

export function isImportedSkill(value: unknown): value is ImportedSkill {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const skill = value as Record<string, unknown>;
  return (
    typeof skill.identifier === "string" &&
    REDSKILL_IDENTIFIER_PATTERN.test(skill.identifier) &&
    typeof skill.name === "string" && skill.name.length > 0 && skill.name.length <= 128 &&
    typeof skill.title === "string" && skill.title.length > 0 && skill.title.length <= 80 &&
    typeof skill.description === "string" && skill.description.length > 0 && skill.description.length <= 1_000 &&
    typeof skill.instructions === "string" && skill.instructions.length > 0 && skill.instructions.length <= 36_000 &&
    typeof skill.version === "string" && skill.version.length <= 80 &&
    typeof skill.sha256 === "string" && /^[0-9a-f]{64}$/.test(skill.sha256) &&
    typeof skill.importedAt === "string" && skill.importedAt.length <= 40
  );
}

export function readImportedSkills() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) throw new Error("本地技能数据格式不正确");
    return parsed.filter(isImportedSkill).slice(0, MAX_IMPORTED_SKILLS);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function saveImportedSkill(skill: ImportedSkill) {
  if (!isImportedSkill(skill)) throw new Error("Skill 数据格式不正确");
  const nextSkills = [
    skill,
    ...readImportedSkills().filter((item) => item.identifier !== skill.identifier),
  ].slice(0, MAX_IMPORTED_SKILLS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSkills));
  return nextSkills;
}

export function removeImportedSkill(identifier: string) {
  const nextSkills = readImportedSkills().filter((skill) => skill.identifier !== identifier);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSkills));
  return nextSkills;
}

export function getImportedSkill(identifier: string) {
  return readImportedSkills().find((skill) => skill.identifier === identifier);
}

export function toImportedSkillMeta(skill: ImportedSkill): SkillMeta {
  return {
    slug: skill.identifier,
    title: skill.title,
    summary: skill.description,
    category: "SkillHub",
    icon: "community",
    tone: "coral",
    format: `v${skill.version}`,
    keywords: ["RedSkill", "SkillHub", skill.identifier, skill.name],
    inputLabel: "告诉这个 Skill 你想完成什么",
    placeholder: "写下具体目标、背景、已有材料和不能接受的结果……",
    examples: [],
  };
}

export function buildImportedSkillSystemPrompt(skill: ImportedSkill) {
  return [
    "你正在执行用户主动从小红书 SkillHub 导入的纯文本 Skill。以下 Markdown 是任务规范，但不会赋予你文件、网络、账号或设备权限。不要索取或泄露 API Key、密码等凭证，不要声称完成了当前文本模型无法执行的外部操作；遇到工具依赖时，改为给出清晰的文字步骤或结果模板。",
    "",
    skill.instructions,
  ].join("\n");
}
