export const REDSKILL_IDENTIFIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

const INSTALL_COMMAND_PATTERN = /\bredskill\s+install\s+([A-Za-z0-9][A-Za-z0-9._-]{0,127})/i;
const CHINESE_INSTALL_PATTERN = /安装\s*[“”"'`]?([A-Za-z0-9][A-Za-z0-9._-]{0,127})[“”"'`]?(?:\s*技能|\s+skill\b)/gi;

export function extractRedSkillIdentifier(input: string) {
  const normalized = input.trim();
  if (!normalized || normalized.length > 2_000) return undefined;
  if (REDSKILL_IDENTIFIER_PATTERN.test(normalized)) return normalized;

  const commandMatch = normalized.match(INSTALL_COMMAND_PATTERN);
  if (commandMatch) return commandMatch[1];

  const installMatches = Array.from(normalized.matchAll(CHINESE_INSTALL_PATTERN));
  const installMatch = installMatches.at(-1);
  if (installMatch) return installMatch[1];

  const likelyIdentifiers = normalized.match(/[A-Za-z0-9][A-Za-z0-9._-]{0,127}/g) ?? [];
  return likelyIdentifiers.findLast((value) => value.includes("-") && REDSKILL_IDENTIFIER_PATTERN.test(value));
}
