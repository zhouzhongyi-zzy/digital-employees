import { createHash } from "node:crypto";

import { extractRedSkillIdentifier } from "@/lib/redskill-identifier";
import { extractSkillMarkdownFromZip } from "@/lib/redskill-zip";
import { parseSkillMarkdown } from "@/lib/skill-markdown";

export const runtime = "nodejs";
export const maxDuration = 30;

const BUNDLE_ENDPOINT = "https://edith.xiaohongshu.com/api/sns/v1/creator/red_skill/get_skill_bundle";
const MAX_MANIFEST_BYTES = 64 * 1024;
const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
const SHA256_PATTERN = /^[0-9a-f]{64}$/;
const CACHE_TTL_MS = 10 * 60 * 1_000;
const RATE_WINDOW_MS = 10 * 60 * 1_000;
const RATE_LIMIT = 20;

type ImportedSkillPayload = {
  identifier: string;
  name: string;
  title: string;
  description: string;
  instructions: string;
  version: string;
  sha256: string;
  importedAt: string;
};

const bundleCache = new Map<string, { expiresAt: number; skill: ImportedSkillPayload }>();
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

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

function getClientAddress(request: Request) {
  return request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "local";
}

function consumeRateLimit(request: Request) {
  const now = Date.now();
  if (requestBuckets.size > 1_000) {
    for (const [key, value] of requestBuckets) {
      if (value.resetAt <= now) requestBuckets.delete(key);
    }
  }
  const address = getClientAddress(request);
  const bucket = requestBuckets.get(address);
  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(address, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= RATE_LIMIT) return false;
  bucket.count += 1;
  return true;
}

async function readLimitedBody(response: Response, maxBytes: number) {
  const contentLength = response.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxBytes) throw new Error("下载内容超过大小限制");
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel();
      throw new Error("下载内容超过大小限制");
    }
    chunks.push(value);
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function parseManifest(payload: unknown, identifier: string) {
  if (!isRecord(payload)) throw new Error("SkillHub 返回格式不正确");
  if (payload.success !== true || (payload.code !== undefined && payload.code !== 0)) {
    const message = typeof payload.msg === "string" ? payload.msg : "SkillHub 未返回该技能";
    throw new Error(message);
  }
  if (!isRecord(payload.data)) throw new Error("SkillHub 返回内容不完整");

  const data = payload.data;
  if (data.identifier !== identifier) throw new Error("SkillHub 返回的 identifier 不一致");
  if (typeof data.zip_url !== "string" || typeof data.sha256 !== "string") {
    throw new Error("SkillHub 缺少下载地址或校验值");
  }
  const sha256 = data.sha256.trim().toLowerCase();
  if (!SHA256_PATTERN.test(sha256)) throw new Error("SkillHub 返回的 SHA-256 不正确");

  const zipUrl = new URL(data.zip_url);
  const trustedHost = zipUrl.hostname === "xhscdn.com" || zipUrl.hostname.endsWith(".xhscdn.com");
  if (!["https:", "http:"].includes(zipUrl.protocol) || !trustedHost || zipUrl.username || zipUrl.password) {
    throw new Error("SkillHub 返回了不受信任的下载地址");
  }
  if (zipUrl.port && !["80", "443"].includes(zipUrl.port)) {
    throw new Error("SkillHub 下载地址端口不受支持");
  }

  return {
    sha256,
    version: typeof data.version === "string" ? data.version.slice(0, 80) : "未知",
    zipUrl,
  };
}

function extractTitle(instructions: string, fallback: string) {
  const heading = instructions.match(/^#\s+(.+)$/m)?.[1].trim();
  return (heading || fallback).slice(0, 80);
}

export async function POST(request: Request) {
  if (!consumeRateLimit(request)) {
    return json({ error: "导入请求过于频繁，请十分钟后再试" }, 429);
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return json({ error: "请求不是有效的 JSON" }, 400);
  }

  const input = isRecord(requestBody) && typeof requestBody.input === "string"
    ? requestBody.input
    : "";
  const identifier = extractRedSkillIdentifier(input);
  if (!identifier) {
    return json({ error: "没有识别到有效的 Skill identifier" }, 400);
  }

  const cached = bundleCache.get(identifier);
  if (cached && cached.expiresAt > Date.now()) {
    return json({ skill: cached.skill, cached: true });
  }
  if (cached) bundleCache.delete(identifier);

  try {
    const manifestUrl = new URL(BUNDLE_ENDPOINT);
    manifestUrl.searchParams.set("identifier", identifier);
    const manifestResponse = await fetch(manifestUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "SkillFlow/1.0 RedSkill importer",
      },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(12_000)]),
    });
    if (!manifestResponse.ok) throw new Error(`SkillHub 查询失败（HTTP ${manifestResponse.status}）`);

    const manifestBytes = await readLimitedBody(manifestResponse, MAX_MANIFEST_BYTES);
    let manifestPayload: unknown;
    try {
      manifestPayload = JSON.parse(new TextDecoder().decode(manifestBytes));
    } catch {
      throw new Error("SkillHub 返回了无法解析的数据");
    }
    const manifest = parseManifest(manifestPayload, identifier);

    const bundleResponse = await fetch(manifest.zipUrl, {
      headers: { Accept: "application/zip, application/octet-stream" },
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(18_000)]),
    });
    if (!bundleResponse.ok) throw new Error(`Skill 包下载失败（HTTP ${bundleResponse.status}）`);
    const bundleBytes = await readLimitedBody(bundleResponse, MAX_BUNDLE_BYTES);
    const actualSha256 = createHash("sha256").update(bundleBytes).digest("hex");
    if (actualSha256 !== manifest.sha256) throw new Error("Skill 包 SHA-256 校验失败");

    const markdown = extractSkillMarkdownFromZip(bundleBytes, identifier);
    const document = parseSkillMarkdown(markdown);
    const skill = {
      identifier,
      name: document.name,
      title: extractTitle(document.instructions, document.name),
      description: document.description,
      instructions: document.instructions,
      version: manifest.version,
      sha256: manifest.sha256,
      importedAt: new Date().toISOString(),
    } satisfies ImportedSkillPayload;
    bundleCache.set(identifier, { expiresAt: Date.now() + CACHE_TTL_MS, skill });
    return json({ skill, cached: false });
  } catch (error) {
    if (request.signal.aborted) return json({ error: "请求已取消" }, 408);
    const message = error instanceof Error ? error.message : "暂时无法导入该 Skill";
    const status = message.includes("不存在") || message.includes("下架")
      ? 404
      : message.includes("超时") ? 504 : 502;
    return json({ error: `无法导入 ${identifier}：${message}`.slice(0, 300) }, status);
  }
}
