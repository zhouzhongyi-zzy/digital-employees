"use client";

import {
  AlertCircle,
  CheckCircle2,
  Clipboard,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  Play,
  RefreshCw,
  Send,
  Share2,
  ShieldCheck,
  Square,
  TestTube2,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { extractAssistantText, extractModelIds, extractProviderError } from "@/lib/openai-protocol";
import type { SkillMeta } from "@/lib/skill-catalog";

import styles from "./skill-runner.module.css";

const ZHIHUI_BASE_URL = "https://zenzy.aitoken.credit/v1";
const DEFAULT_CUSTOM_BASE_URL = "https://api.openai.com/v1";
const SESSION_CONFIG_KEY = "skillflow:provider-config";
const SESSION_API_KEY = "skillflow:api-key";

type Provider = "zhihui" | "custom";
type ActiveRequest = "models" | "test" | "run" | null;
type Notice = { kind: "success" | "error" | "info"; text: string } | null;
type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function buildOpenAIEndpoint(baseUrl: string, resource: "chat/completions" | "models") {
  const parsed = new URL(baseUrl.trim());
  if (!(["https:", "http:"] as string[]).includes(parsed.protocol)) {
    throw new Error("Base URL 必须以 http:// 或 https:// 开头");
  }
  if (parsed.username || parsed.password) {
    throw new Error("Base URL 不能包含用户名或密码");
  }

  const isLocal = ["localhost", "127.0.0.1", "::1"].includes(parsed.hostname);
  if (window.location.protocol === "https:" && parsed.protocol === "http:" && !isLocal) {
    throw new Error("HTTPS 页面无法请求普通 HTTP 接口，请改用 HTTPS 地址");
  }

  const cleanPath = parsed.pathname
    .replace(/\/(chat\/completions|models)\/?$/i, "")
    .replace(/\/+$/, "");
  parsed.pathname = `${cleanPath}/${resource}`.replace(/\/{2,}/g, "/");
  parsed.search = "";
  parsed.hash = "";
  return parsed.toString();
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

function getErrorMessage(payload: unknown, fallback: string) {
  if (isRecord(payload) && typeof payload.error === "string") {
    const detail = typeof payload.detail === "string" ? `：${payload.detail}` : "";
    return `${payload.error}${detail}`;
  }
  return extractProviderError(payload) ?? fallback;
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand("copy");
    textarea.remove();
  }
}

function canvasLines(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = [];

  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }

    let currentLine = "";
    for (const character of Array.from(paragraph)) {
      const nextLine = currentLine + character;
      if (currentLine && context.measureText(nextLine).width > maxWidth) {
        lines.push(currentLine);
        currentLine = character;
      } else {
        currentLine = nextLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }

  return lines;
}

type SkillRunnerProps = {
  skill: SkillMeta;
  instructions: string;
};

export function SkillRunner({ skill, instructions }: SkillRunnerProps) {
  const [provider, setProvider] = useState<Provider>("zhihui");
  const [customBaseUrl, setCustomBaseUrl] = useState(DEFAULT_CUSTOM_BASE_URL);
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [models, setModels] = useState<string[]>([]);
  const [showKey, setShowKey] = useState(false);
  const [rememberSession, setRememberSession] = useState(true);
  const [hydrated, setHydrated] = useState(false);
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const [activeRequest, setActiveRequest] = useState<ActiveRequest>(null);
  const abortController = useRef<AbortController | null>(null);

  const baseUrl = provider === "zhihui" ? ZHIHUI_BASE_URL : customBaseUrl;

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      try {
        const savedConfig = sessionStorage.getItem(SESSION_CONFIG_KEY);
        if (savedConfig) {
          const parsed = JSON.parse(savedConfig) as unknown;
          if (isRecord(parsed)) {
            if (parsed.provider === "zhihui" || parsed.provider === "custom") {
              setProvider(parsed.provider);
            }
            if (typeof parsed.customBaseUrl === "string") setCustomBaseUrl(parsed.customBaseUrl);
            if (typeof parsed.model === "string") setModel(parsed.model);
          }
        }
        const savedKey = sessionStorage.getItem(SESSION_API_KEY);
        if (savedKey) setApiKey(savedKey);
      } catch {
        sessionStorage.removeItem(SESSION_CONFIG_KEY);
        sessionStorage.removeItem(SESSION_API_KEY);
      } finally {
        setHydrated(true);
      }
    });

    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (rememberSession) {
      sessionStorage.setItem(
        SESSION_CONFIG_KEY,
        JSON.stringify({ provider, customBaseUrl, model }),
      );
      if (apiKey) sessionStorage.setItem(SESSION_API_KEY, apiKey);
      else sessionStorage.removeItem(SESSION_API_KEY);
    } else {
      sessionStorage.removeItem(SESSION_CONFIG_KEY);
      sessionStorage.removeItem(SESSION_API_KEY);
    }
  }, [apiKey, customBaseUrl, hydrated, model, provider, rememberSession]);

  useEffect(() => {
    return () => abortController.current?.abort();
  }, []);

  function validateConfiguration() {
    if (!apiKey.trim()) throw new Error("请先填写 API Key");
    if (!model.trim()) throw new Error("请填写或读取一个模型名称");
    if (provider === "custom") buildOpenAIEndpoint(customBaseUrl, "chat/completions");
  }

  async function requestCompletion(
    systemPrompt: string,
    userPrompt: string,
    maxTokens: number,
    signal: AbortSignal,
  ) {
    validateConfiguration();

    let response: Response;
    if (provider === "zhihui") {
      response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model: model.trim(),
          system: systemPrompt,
          user: userPrompt,
          maxTokens,
        }),
        cache: "no-store",
        signal,
      });
    } else {
      response = await fetch(buildOpenAIEndpoint(customBaseUrl, "chat/completions"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model.trim(),
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: maxTokens,
          temperature: 0.7,
        }),
        cache: "no-store",
        mode: "cors",
        referrerPolicy: "no-referrer",
        signal,
      });
    }

    const payload = await readJson(response);
    if (!response.ok) {
      throw new Error(getErrorMessage(payload, `模型服务返回 ${response.status}`));
    }

    const content =
      provider === "zhihui" && isRecord(payload) && typeof payload.content === "string"
        ? payload.content
        : extractAssistantText(payload);
    if (!content) throw new Error("接口已响应，但没有返回可读取的文本");
    return content;
  }

  async function runWithController(mode: Exclude<ActiveRequest, null>, action: (signal: AbortSignal) => Promise<void>) {
    const controller = new AbortController();
    abortController.current = controller;
    setActiveRequest(mode);
    setNotice(null);

    try {
      await action(controller.signal);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setNotice({ kind: "info", text: "请求已取消" });
      } else if (error instanceof TypeError && provider === "custom") {
        setNotice({
          kind: "error",
          text: "浏览器无法连接该地址。请检查 Base URL、网络和接口的 CORS 设置，或改用智汇云预设。",
        });
      } else {
        setNotice({
          kind: "error",
          text: error instanceof Error ? error.message : "请求失败，请稍后重试",
        });
      }
    } finally {
      abortController.current = null;
      setActiveRequest(null);
    }
  }

  function cancelRequest() {
    abortController.current?.abort();
  }

  async function loadModels() {
    if (!apiKey.trim()) {
      setNotice({ kind: "error", text: "请先填写 API Key，再读取模型列表" });
      return;
    }

    await runWithController("models", async (signal) => {
      let response: Response;
      if (provider === "zhihui") {
        response = await fetch("/api/models", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: apiKey.trim() }),
          cache: "no-store",
          signal,
        });
      } else {
        response = await fetch(buildOpenAIEndpoint(customBaseUrl, "models"), {
          headers: { Authorization: `Bearer ${apiKey.trim()}` },
          cache: "no-store",
          mode: "cors",
          referrerPolicy: "no-referrer",
          signal,
        });
      }

      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(getErrorMessage(payload, `模型服务返回 ${response.status}`));
      }

      const nextModels =
        provider === "zhihui" && isRecord(payload) && Array.isArray(payload.models)
          ? payload.models.filter((item): item is string => typeof item === "string")
          : extractModelIds(payload);
      if (nextModels.length === 0) throw new Error("没有读取到模型列表，请手动填写模型名称");

      setModels(nextModels);
      if (!model || !nextModels.includes(model)) setModel(nextModels[0]);
      setNotice({ kind: "success", text: `已读取 ${nextModels.length} 个可用模型` });
    });
  }

  async function testConnection() {
    await runWithController("test", async (signal) => {
      await requestCompletion(
        "这是一次 API 连接测试。请只回复 OK，不要补充其他内容。",
        "请回复 OK",
        8,
        signal,
      );
      setNotice({ kind: "success", text: "连接成功，可以运行 Skill" });
    });
  }

  async function runSkill() {
    const cleanInput = input.trim();
    if (!cleanInput) {
      setNotice({ kind: "error", text: "请先写下你的具体需求" });
      return;
    }

    await runWithController("run", async (signal) => {
      setResult("");
      const content = await requestCompletion(instructions, cleanInput, 1200, signal);
      setResult(content);
      setNotice({ kind: "success", text: "Skill 已完成" });
    });
  }

  async function copyResult() {
    if (!result) return;
    await copyText(result);
    setNotice({ kind: "success", text: "结果已复制" });
  }

  async function shareResult() {
    if (!result) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${skill.title} · SkillFlow`,
          text: result.slice(0, 5000),
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    await copyResult();
  }

  function downloadResultCard() {
    if (!result) return;

    const measureCanvas = document.createElement("canvas");
    const measureContext = measureCanvas.getContext("2d");
    if (!measureContext) return;
    measureContext.font = '30px "Microsoft YaHei UI", "PingFang SC", sans-serif';

    const allLines = canvasLines(measureContext, result, 856);
    const visibleLines = allLines.slice(0, 34);
    if (allLines.length > visibleLines.length) visibleLines.push("……完整内容请查看文本结果");

    const canvas = document.createElement("canvas");
    canvas.width = 1080;
    canvas.height = Math.max(1080, 330 + visibleLines.length * 48);
    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#eff5f2";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#0f766e";
    context.fillRect(0, 0, 28, canvas.height);
    context.fillStyle = "#ffffff";
    context.beginPath();
    context.roundRect(70, 70, 940, canvas.height - 140, 16);
    context.fill();

    context.fillStyle = "#d9480f";
    context.fillRect(118, 118, 74, 12);
    context.fillStyle = "#17231f";
    context.font = '700 46px "Microsoft YaHei UI", "PingFang SC", sans-serif';
    context.fillText(skill.title, 118, 202);
    context.fillStyle = "#587068";
    context.font = '24px "Microsoft YaHei UI", "PingFang SC", sans-serif';
    context.fillText("SkillFlow 生成结果", 118, 246);

    context.fillStyle = "#22342e";
    context.font = '30px "Microsoft YaHei UI", "PingFang SC", sans-serif';
    visibleLines.forEach((line, index) => {
      context.fillText(line, 118, 330 + index * 48);
    });

    context.fillStyle = "#72827d";
    context.font = '22px "Microsoft YaHei UI", "PingFang SC", sans-serif';
    context.fillText("AI 结果由用户选择的模型生成", 118, canvas.height - 110);

    const link = document.createElement("a");
    link.download = `${skill.slug}-result.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setNotice({ kind: "success", text: "结果卡片已下载" });
  }

  return (
    <section className={styles.runner} aria-labelledby="runner-title">
      <div className={styles.runnerHeader}>
        <div>
          <span>ONLINE RUNNER</span>
          <h2 id="runner-title">运行 {skill.title}</h2>
        </div>
        <span className={styles.privacyBadge}>
          <ShieldCheck size={16} aria-hidden="true" />
          密钥不持久化
        </span>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span className={styles.step}>01</span>
          <div>
            <h3>模型接口</h3>
            <p>选择预设或填写兼容 OpenAI 的服务。</p>
          </div>
        </div>

        <div className={styles.segmented} aria-label="接口提供方">
          <button type="button" aria-pressed={provider === "zhihui"} onClick={() => setProvider("zhihui")}>智汇云</button>
          <button type="button" aria-pressed={provider === "custom"} onClick={() => setProvider("custom")}>自定义接口</button>
        </div>

        <div className={styles.fieldGrid}>
          <div className={styles.fullField}>
            <label htmlFor="base-url">Base URL</label>
            <input
              id="base-url"
              value={baseUrl}
              onChange={(event) => setCustomBaseUrl(event.target.value)}
              readOnly={provider === "zhihui"}
              aria-readonly={provider === "zhihui"}
              spellCheck={false}
            />
          </div>

          <div className={styles.keyField}>
            <label htmlFor="api-key">API Key</label>
            <div className={styles.inputWithButton}>
              <KeyRound size={18} aria-hidden="true" />
              <input
                id="api-key"
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(event) => setApiKey(event.target.value)}
                autoComplete="off"
                placeholder="sk-..."
                aria-describedby="key-help"
              />
              <button
                type="button"
                onClick={() => setShowKey((current) => !current)}
                aria-label={showKey ? "隐藏 API Key" : "显示 API Key"}
                title={showKey ? "隐藏 API Key" : "显示 API Key"}
              >
                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className={styles.modelField}>
            <label htmlFor="model">模型名称</label>
            <div className={styles.modelRow}>
              <input
                id="model"
                list={`models-${skill.slug}`}
                value={model}
                onChange={(event) => setModel(event.target.value)}
                placeholder="填写或读取模型"
                spellCheck={false}
              />
              <datalist id={`models-${skill.slug}`}>
                {models.map((item) => <option value={item} key={item} />)}
              </datalist>
              <button type="button" onClick={loadModels} disabled={activeRequest !== null}>
                <RefreshCw className={activeRequest === "models" ? styles.spin : undefined} size={17} aria-hidden="true" />
                {activeRequest === "models" ? "读取中" : "读取模型"}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.securityRow} id="key-help">
          {provider === "zhihui" ? (
            <span><ShieldCheck size={17} aria-hidden="true" />请求仅转发至固定的智汇云域名，不记录 Key。</span>
          ) : (
            <span><AlertCircle size={17} aria-hidden="true" />Key 会由浏览器直接发送到你填写的地址，请只使用可信服务。</span>
          )}
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(event) => setRememberSession(event.target.checked)}
            />
            仅在本次会话记住
          </label>
        </div>

        <div className={styles.connectionActions}>
          <button type="button" onClick={testConnection} disabled={activeRequest !== null}>
            <TestTube2 size={17} aria-hidden="true" />
            {activeRequest === "test" ? "测试中" : "测试连接"}
          </button>
          {provider === "zhihui" ? (
            <span>
              <a href="https://zenzy.aitoken.credit/home" target="_blank" rel="noreferrer">获取 Key <ExternalLink size={13} aria-hidden="true" /></a>
              <a href="https://zenzy.aitoken.credit/docs/" target="_blank" rel="noreferrer">接口文档 <ExternalLink size={13} aria-hidden="true" /></a>
            </span>
          ) : <small>连接测试会产生极少量模型调用。</small>}
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <span className={styles.step}>02</span>
          <div>
            <h3>你的需求</h3>
            <p>补充真实场景和限制，结果会更贴近你。</p>
          </div>
        </div>

        <div className={styles.examples} aria-label="示例场景">
          {skill.examples.map((example) => (
            <button type="button" key={example} onClick={() => setInput(example)}>
              {example}
            </button>
          ))}
        </div>

        <label className={styles.textareaLabel} htmlFor="skill-input">
          {skill.inputLabel}
        </label>
        <textarea
          id="skill-input"
          value={input}
          onChange={(event) => setInput(event.target.value.slice(0, 12_000))}
          placeholder={skill.placeholder}
          rows={7}
        />
        <div className={styles.inputFooter}>
          <span>{input.length} / 12000</span>
          <button
            className={activeRequest === "run" ? styles.cancelButton : styles.runButton}
            type="button"
            onClick={activeRequest === "run" ? cancelRequest : runSkill}
            disabled={activeRequest !== null && activeRequest !== "run"}
          >
            {activeRequest === "run" ? (
              <><Square size={16} fill="currentColor" aria-hidden="true" />停止生成</>
            ) : (
              <><Play size={17} fill="currentColor" aria-hidden="true" />运行 Skill</>
            )}
          </button>
        </div>
      </div>

      {notice ? (
        <div className={styles.notice} data-kind={notice.kind} role="status" aria-live="polite">
          {notice.kind === "success" ? <CheckCircle2 size={18} aria-hidden="true" /> : null}
          {notice.kind === "error" ? <AlertCircle size={18} aria-hidden="true" /> : null}
          {notice.kind === "info" ? <LoaderCircle size={18} aria-hidden="true" /> : null}
          <span>{notice.text}</span>
        </div>
      ) : null}

      <div className={styles.resultSection} aria-busy={activeRequest === "run"}>
        <div className={styles.resultHeader}>
          <div>
            <span className={styles.step}>03</span>
            <h3>生成结果</h3>
          </div>
          {result ? (
            <div className={styles.resultActions}>
              <button type="button" onClick={copyResult}><Clipboard size={17} aria-hidden="true" />复制</button>
              <button type="button" onClick={shareResult}><Share2 size={17} aria-hidden="true" />分享</button>
              <button type="button" onClick={downloadResultCard}><Download size={17} aria-hidden="true" />图片</button>
            </div>
          ) : null}
        </div>

        {activeRequest === "run" ? (
          <div className={styles.resultLoading}>
            <LoaderCircle className={styles.spin} size={24} aria-hidden="true" />
            <span>模型正在执行 Skill…</span>
          </div>
        ) : result ? (
          <div className={styles.resultText}>{result}</div>
        ) : (
          <div className={styles.resultEmpty}>
            <Send size={23} aria-hidden="true" />
            <span>运行后，结果会出现在这里。</span>
          </div>
        )}
      </div>
    </section>
  );
}
