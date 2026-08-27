type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function extractAssistantText(payload: unknown): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) return undefined;

  const firstChoice = payload.choices[0];
  if (!isRecord(firstChoice) || !isRecord(firstChoice.message)) return undefined;

  const content = firstChoice.message.content;
  if (typeof content === "string") return content.trim();

  if (Array.isArray(content)) {
    const parts = content.flatMap((part) => {
      if (!isRecord(part)) return [];
      return typeof part.text === "string" ? [part.text] : [];
    });
    const text = parts.join("\n").trim();
    return text || undefined;
  }

  return undefined;
}

export function extractProviderError(payload: unknown): string | undefined {
  if (!isRecord(payload)) return undefined;

  if (typeof payload.message === "string") return payload.message;
  if (!isRecord(payload.error)) return undefined;
  if (typeof payload.error.message === "string") return payload.error.message;
  if (typeof payload.error.code === "string") return payload.error.code;
  return undefined;
}

export function extractModelIds(payload: unknown): string[] {
  if (!isRecord(payload) || !Array.isArray(payload.data)) return [];

  return payload.data
    .flatMap((item) => (isRecord(item) && typeof item.id === "string" ? [item.id] : []))
    .filter((id, index, all) => all.indexOf(id) === index)
    .sort((left, right) => left.localeCompare(right));
}
