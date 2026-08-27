import {
  extractAssistantText,
  extractProviderError,
} from "@/lib/openai-protocol";

const ZHIHUI_CHAT_ENDPOINT = "https://zenzy.aitoken.credit/v1/chat/completions";
const MODEL_PATTERN = /^[A-Za-z0-9._:/-]+$/;

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function json(data: JsonRecord, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function validateBody(value: unknown) {
  if (!isRecord(value)) return { error: "请求格式不正确" } as const;

  const { apiKey, model, system, user, maxTokens = 1200 } = value;
  if (typeof apiKey !== "string" || apiKey.length < 8 || apiKey.length > 512) {
    return { error: "API Key 格式不正确" } as const;
  }
  if (
    typeof model !== "string" ||
    model.length < 1 ||
    model.length > 160 ||
    !MODEL_PATTERN.test(model)
  ) {
    return { error: "模型名称格式不正确" } as const;
  }
  if (typeof system !== "string" || system.length < 1 || system.length > 40_000) {
    return { error: "Skill 指令长度不正确" } as const;
  }
  if (typeof user !== "string" || user.length < 1 || user.length > 12_000) {
    return { error: "输入内容不能为空，且不能超过 12000 个字符" } as const;
  }
  if (
    typeof maxTokens !== "number" ||
    !Number.isInteger(maxTokens) ||
    maxTokens < 1 ||
    maxTokens > 1600
  ) {
    return { error: "输出长度参数不正确" } as const;
  }

  return { apiKey, model, system, user, maxTokens } as const;
}

export async function POST(request: Request) {
  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return json({ error: "请求不是有效的 JSON" }, 400);
  }

  const body = validateBody(requestBody);
  if ("error" in body) return json({ error: body.error }, 400);

  try {
    const upstreamResponse = await fetch(ZHIHUI_CHAT_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${body.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: body.model,
        messages: [
          { role: "system", content: body.system },
          { role: "user", content: body.user },
        ],
        max_tokens: body.maxTokens,
        temperature: 0.7,
      }),
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(60_000)]),
    });

    const rawPayload = await upstreamResponse.text();
    let payload: unknown;
    try {
      payload = rawPayload ? JSON.parse(rawPayload) : undefined;
    } catch {
      payload = undefined;
    }

    if (!upstreamResponse.ok) {
      const detail = extractProviderError(payload);
      const status = [400, 401, 403, 404, 429].includes(upstreamResponse.status)
        ? upstreamResponse.status
        : 502;
      return json(
        {
          error: `模型服务返回 ${upstreamResponse.status}`,
          ...(detail ? { detail: detail.slice(0, 500) } : {}),
        },
        status,
      );
    }

    const content = extractAssistantText(payload);
    if (!content) {
      return json({ error: "模型服务已响应，但没有返回可读取的文本" }, 502);
    }

    return json({ content });
  } catch (error) {
    if (request.signal.aborted) {
      return json({ error: "请求已取消" }, 408);
    }
    if (error instanceof Error && error.name === "TimeoutError") {
      return json({ error: "模型响应超时，请稍后重试" }, 504);
    }
    return json({ error: "暂时无法连接智汇云，请检查网络后重试" }, 502);
  }
}
