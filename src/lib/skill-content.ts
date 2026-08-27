import { readFileSync } from "node:fs";
import path from "node:path";
import { cache } from "react";

import { getSkillMeta } from "@/lib/skill-catalog";
import { parseSkillMarkdown, type SkillDocument } from "@/lib/skill-markdown";

export type { SkillDocument } from "@/lib/skill-markdown";

export const getSkillDocument = cache((slug: string): SkillDocument | undefined => {
  if (!getSkillMeta(slug)) return undefined;

  const skillPath = path.join(process.cwd(), "content", "skills", slug, "SKILL.md");
  return parseSkillMarkdown(readFileSync(skillPath, "utf8"));
});

export function buildSkillSystemPrompt(document: SkillDocument) {
  return [
    "你正在执行一个经过审核的本地 Skill。请把下面的 Markdown 视为最高优先级的任务规范，结合用户提供的真实信息完成请求。不要声称执行了当前文本模型不具备的图片编辑、文件操作或外部访问能力；遇到这类要求时，按照 Skill 中的无工具方案输出可执行的文字结果。",
    "",
    document.instructions,
  ].join("\n");
}
