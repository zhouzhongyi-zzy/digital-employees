export const skillCategories = ["全部", "沟通", "生活", "学习", "影像", "开发", "SkillHub"] as const;

export type SkillCategory = Exclude<(typeof skillCategories)[number], "全部">;
export type SkillTone = "coral" | "teal" | "yellow" | "blue" | "rose" | "green" | "ink";
export type SkillIconName =
  | "reply"
  | "caption"
  | "study"
  | "makeup"
  | "atmosphere"
  | "retouch"
  | "developer"
  | "community";

export type SkillMeta = {
  slug: string;
  title: string;
  summary: string;
  category: SkillCategory;
  icon: SkillIconName;
  tone: SkillTone;
  format: string;
  featured?: boolean;
  keywords: string[];
  inputLabel: string;
  placeholder: string;
  examples: string[];
};

export const skills: SkillMeta[] = [
  {
    slug: "thoughtful-reply-assistant",
    title: "高情商回复助手",
    summary: "把难开口的话，变成既有边界又不伤关系的回复。",
    category: "沟通",
    icon: "reply",
    tone: "coral",
    format: "可直接发送",
    featured: true,
    keywords: ["回复", "拒绝", "领导", "客户", "沟通", "聊天"],
    inputLabel: "把对方的话和你的真实想法写下来",
    placeholder: "例如：领导说“辛苦了”，我想礼貌回应，但不想只说“不辛苦”……",
    examples: [
      "领导说“辛苦了”，怎么回复自然又得体？",
      "朋友又来借钱，我想拒绝但不想伤关系。",
      "客户一直催进度，帮我写一条坚定但不生硬的回复。",
    ],
  },
  {
    slug: "moments-photo-caption",
    title: "朋友圈照片配文",
    summary: "根据场景与心情，写出像你自己说出来的朋友圈文案。",
    category: "生活",
    icon: "caption",
    tone: "teal",
    format: "四种语气",
    keywords: ["朋友圈", "配文", "旅行", "日常", "自拍", "文案"],
    inputLabel: "描述照片、场景和你想表达的心情",
    placeholder: "例如：周末和朋友去了海边，傍晚风很大，照片是暖色调，想写得松弛一点……",
    examples: [
      "雨天在咖啡店拍了三张照片，想要简短、松弛的配文。",
      "毕业旅行九宫格，不煽情，也不要网络热句。",
      "生日自拍，想写得克制一点，不直接说生日快乐。",
    ],
  },
  {
    slug: "study-plan-knowledge-organizer",
    title: "学习计划与知识整理",
    summary: "把目标、时间和资料整理成真正能执行的学习节奏。",
    category: "学习",
    icon: "study",
    tone: "yellow",
    format: "计划 + 自测",
    keywords: ["学习", "考试", "计划", "知识点", "复习", "笔记"],
    inputLabel: "写下目标、截止日期、基础和可用时间",
    placeholder: "例如：六周后考英语六级，目前每天能学 90 分钟，听力最薄弱……",
    examples: [
      "六周后考英语六级，每天 90 分钟，帮我安排复习。",
      "把这份笔记整理成知识地图、易错点和自测题。",
      "我想一个月入门 Python，每周只有 5 小时。",
    ],
  },
  {
    slug: "makeup-style-advisor",
    title: "妆容适配建议",
    summary: "按场合、时间和现有产品，给出能照着完成的妆容方案。",
    category: "生活",
    icon: "makeup",
    tone: "rose",
    format: "步骤清单",
    keywords: ["美妆", "妆容", "约会", "通勤", "新手", "彩妆"],
    inputLabel: "描述场合、偏好、时间和手边的产品",
    placeholder: "例如：第一次约会，偏清透温柔，只有 15 分钟，手边有大地色眼影和豆沙色口红……",
    examples: [
      "面试妆，新手，只有 10 分钟，想显得精神但不过重。",
      "海边旅行拍照，暖黄皮，想要耐看又不容易脱妆。",
      "用我现有的三件产品做一个快速通勤妆。",
    ],
  },
  {
    slug: "atmosphere-photo-creator",
    title: "氛围写真策划",
    summary: "把“想拍得有氛围”拆成场景、光线、造型和镜头方案。",
    category: "影像",
    icon: "atmosphere",
    tone: "blue",
    format: "拍摄方案",
    keywords: ["写真", "氛围", "拍照", "构图", "姿势", "提示词"],
    inputLabel: "描述用途、主题和你喜欢的画面感觉",
    placeholder: "例如：想拍一组 3:4 城市夜景写真，电影感、克制、不要太网红……",
    examples: [
      "一个人去海边，帮我策划一组清冷电影感写真。",
      "生日想在家拍照，空间不大，怎样布光和摆姿势？",
      "生成一套法式咖啡馆写真的正负提示词。",
    ],
  },
  {
    slug: "natural-portrait-retouch",
    title: "自然人像精修方案",
    summary: "保留本人特征和皮肤质感，生成克制、自然的修图说明。",
    category: "影像",
    icon: "retouch",
    tone: "green",
    format: "修图提示词",
    keywords: ["人像", "修图", "P图", "自然", "肤色", "照片"],
    inputLabel: "描述照片问题、使用场景和希望保留的细节",
    placeholder: "例如：室内自拍偏黄，背景有些杂乱，想改善光线但保留雀斑和真实皮肤纹理……",
    examples: [
      "自拍曝光不足，帮我写一份自然精修提示词。",
      "头像照片背景太乱，想保留本人特征并提高质感。",
      "旅行合照怎样统一肤色和光线，又不把每个人修得一样？",
    ],
  },
  {
    slug: "zhihui-cloud-developer-onboarding",
    title: "AI API 开发接入",
    summary: "根据语言、SDK 和报错，整理兼容 OpenAI 接口的接入路径。",
    category: "开发",
    icon: "developer",
    tone: "ink",
    format: "接入与排错",
    keywords: ["API", "开发", "OpenAI", "Claude", "Gemini", "接入", "智汇云"],
    inputLabel: "描述语言、SDK、目标模型和当前问题",
    placeholder: "例如：Node.js 项目原来使用 OpenAI SDK，想切换 Base URL，目前请求返回 401……",
    examples: [
      "Node.js 的 OpenAI SDK 怎样替换 Base URL 和 Key？",
      "请求返回 401，帮我按顺序排查配置。",
      "个人项目需要试多个模型，统一 API 入口适合我吗？",
    ],
  },
];

export function getSkillMeta(slug: string) {
  return skills.find((skill) => skill.slug === slug);
}
