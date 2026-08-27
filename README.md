# SkillFlow

一个可部署到 Vercel 的在线 AI Skill 工具箱。项目内置精选 Skill，也支持通过小红书 SkillHub（RedSkill）identifier 或完整安装话术导入社区 Skill。

## 功能

- 7 个内置纯文本 Skill，支持搜索和分类筛选
- 支持粘贴 `thoughtful-reply-assistant` 等 identifier
- 支持粘贴小红书发送的完整自然语言安装话术
- 从小红书官方接口下载 Skill ZIP 并验证 SHA-256
- 只读取 ZIP 中唯一的 `SKILL.md`，不执行 JS、Python、Shell 或其他附带文件
- 导入后的 Skill 保存在当前浏览器，可直接复用现有在线运行台
- 支持智汇云和自定义 OpenAI 兼容接口
- 支持连接测试、模型列表、取消生成、复制、分享和导出结果卡片

## 数据范围

项目没有用户登录系统：

- 内置 Skill：所有访客共用，由项目源码提供。
- 导入 Skill：保存在访客自己的 `localStorage`，不同浏览器和设备互不共享。
- API Key：可选保存在 `sessionStorage`，关闭会话后失效，不写入数据库和源码。
- Vercel 服务端：只临时查询、下载和校验 Skill，不持久保存用户的技能库。

清理浏览器数据、使用无痕模式或更换设备后，需要重新导入社区 Skill。

## RedSkill 导入流程

```text
安装话术或 identifier
  -> 提取 identifier
  -> 小红书官方 get_skill_bundle 接口
  -> 校验官方下载域名和 SHA-256
  -> 安全解析 ZIP
  -> 只读取 SKILL.md
  -> 用户确认后保存到当前浏览器
```

服务端只连接固定的小红书清单接口，并且只接受 `xhscdn.com` 官方下载域名。下载包限制为 2 MB，`SKILL.md` 限制为 256 KB，指令限制为 36000 个字符。接口包含 10 分钟短时内存缓存和尽力而为的来源 IP 限频。

依赖 references、脚本、浏览器自动化或本地文件的 Skill 会降级为纯文本能力；网站不会加载这些附加能力。

## 本地开发

要求 Node.js 20 或更高版本。

```bash
npm install
npm run dev
```

打开 [http://localhost:3000](http://localhost:3000)。

质量检查：

```bash
npm run lint
npx tsc --noEmit
npm run build
```

## Vercel 部署

将此目录推送到 Git 仓库，然后在 Vercel 项目 `digital-employees` 中导入仓库。默认配置即可：

- Framework Preset：Next.js
- Build Command：`npm run build`
- Install Command：`npm install` 或 `npm ci`
- Node.js：20.x 或更高

不需要 Python、数据库或持久化磁盘，也不需要配置 RedSkill CLI。Vercel 运行环境必须可以访问：

```text
https://edith.xiaohongshu.com
http(s)://*.xhscdn.com
https://zenzy.aitoken.credit
```

小红书官方接口或响应格式发生变化时，SkillHub 导入可能暂时不可用；内置 Skill 和已经保存到浏览器的 Skill 不受影响。

## 智汇云

- Base URL：`https://zenzy.aitoken.credit/v1`
- 注册与控制台：`https://zenzy.aitoken.credit/home`
- API 文档：`https://zenzy.aitoken.credit/docs/`
