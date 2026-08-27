import { parse } from "yaml";

type SkillFrontmatter = {
  name?: unknown;
  description?: unknown;
};

export type SkillDocument = {
  name: string;
  description: string;
  instructions: string;
};

export function parseSkillMarkdown(source: string): SkillDocument {
  const normalized = source.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n");
  const match = normalized.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!match) {
    throw new Error("Skill 文件缺少有效的 YAML frontmatter");
  }

  const frontmatter = parse(match[1], { maxAliasCount: 10 }) as SkillFrontmatter;
  if (typeof frontmatter.name !== "string" || typeof frontmatter.description !== "string") {
    throw new Error("Skill frontmatter 缺少 name 或 description");
  }

  const name = frontmatter.name.trim();
  const description = frontmatter.description.trim();
  const instructions = match[2].trim();
  if (!name || name.length > 128) throw new Error("Skill name 不能为空且不能超过 128 个字符");
  if (!description || description.length > 1_000) {
    throw new Error("Skill description 不能为空且不能超过 1000 个字符");
  }
  if (!instructions) throw new Error("Skill 指令内容为空");
  if (instructions.length > 36_000) throw new Error("Skill 指令超过 36000 个字符，暂不支持在线运行");

  return { name, description, instructions };
}
