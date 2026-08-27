import { extractModelIds, extractProviderError } from "@/lib/openai-protocol";

const ZHIHUI_MODELS_ENDPOINT = "https://zenzy.aitoken.credit/v1/models";

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

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "请求不是有效的 JSON" }, 400);
  }

  if (!isRecord(body) || typeof body.apiKey !== "string" || body.apiKey.length < 8) {
    return json({ error: "请先填写有效的 API Key" }, 400);
  }
  if (body.apiKey.length > 512) {
    return json({ error: "API Key 格式不正确" }, 400);
  }

  try {
    const upstreamResponse = await fetch(ZHIHUI_MODELS_ENDPOINT, {
      headers: { Authorization: `Bearer ${body.apiKey}` },
      cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(20_000)]),
    });
    const payload = (await upstreamResponse.json()) as unknown;

    if (!upstreamResponse.ok) {
      const detail = extractProviderError(payload);
      const status = [400, 401, 403, 429].includes(upstreamResponse.status)
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

    const models = extractModelIds(payload);
    if (models.length === 0) {
      return json({ error: "接口已连接，但没有读取到模型列表，请手动填写模型名称" }, 502);
    }

    return json({ models: models.slice(0, 500) });
  } catch (error) {
    if (request.signal.aborted) return json({ error: "请求已取消" }, 408);
    if (error instanceof Error && error.name === "TimeoutError") {
      return json({ error: "读取模型列表超时" }, 504);
    }
    return json({ error: "暂时无法读取模型列表，请手动填写模型名称" }, 502);
  }
}
