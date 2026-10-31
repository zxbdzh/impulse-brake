// 两个 hook 共用的词表、危险命令清单和提醒正文。
// 想改触发词只改这里，scripts/hooks.json 不用动。

export const WORDS = [
  "全部重写", "全部重做", "重写整个", "重写全部", "推倒重来", "推翻重来",
  "重构整个", "重构全部", "大改架构", "换框架", "换库", "换语言",
  "换掉这个", "换个方案", "不做了", "不想做了", "放弃吧", "没意思了"
];

// 裸的「重写」「重做」故意不收：「帮我重写这个函数」是日常请求
export const PATTERNS = [
  "(推倒|推翻)[^。]{0,4}重(来|做|写)",
  "换(成|掉|个)[^。]{0,6}(框架|库|语言|技术栈)"
];

export const DANGER = [
  "rm\\s+-[a-z]*r[a-z]*f[a-z]*\\s+(/|~|\\$HOME)(\\s|$)",
  "git\\s+reset\\s+--hard",
  "git\\s+push\\s+(--force|-f)\\b",
  "git\\s+clean\\s+-[a-z]*[xdf]",
  "drop\\s+(database|schema)\\b",
  "truncate\\s+table\\b",
  "mkfs(\\.|\\s|$)",
  "diskpart\\s+clean",
  "format\\s+[a-z]:",
  "del\\s+/[fsq]\\b",
  "Remove-Item\\b[^\\n]*-Recurse[^\\n]*-Force"
];

export const REMINDER = [
  "<system-reminder>",
  "[impulse-brake 冲动刹车] 用户可能正在做大改动或冲动转向。若本请求是重写/推翻重来/换框架或库、中途加新需求、放弃任务，先刹车一次再执行：",
  "1) 推翻重来 → 旧实现保留，新方案做半天能跑通的原型，用同一用例对比后再迁移；",
  "2) 换技术 → 给对比表（解决什么问题/迁移成本/风险），决定留到下次会话；当前技术有硬伤才立即换；",
  "3) 中途新想法 → 记入 docs/decision-log.md，当前任务做完；",
  "4) 想放弃 → 分清卡住还是腻了，腻了先定最多 3 项的最小可用版本。",
  "用户听完仍坚持就立刻照办，不重复劝阻。与本请求无关则忽略这条提醒。",
  "</system-reminder>"
].join("\n");

export function regexOf(words, patterns) {
  const parts = [];
  for (const w of words || [])
    if (typeof w === "string" && w.trim())
      parts.push(w.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  for (const p of patterns || []) if (typeof p === "string" && p) parts.push("(?:" + p + ")");
  return parts.length ? new RegExp(parts.join("|"), "gi") : null;
}

export function hit(text) {
  if (typeof text !== "string" || !text) return null;
  const m = regexOf(WORDS, PATTERNS);
  if (!m) return null;
  const found = text.match(m);
  return found ? found[0] : null;
}

export function dangerHit(text) {
  if (typeof text !== "string" || !text) return null;
  const m = regexOf([], DANGER);
  if (!m) return null;
  const found = text.match(m);
  return found ? found[0] : null;
}

// 从 hook 的 stdin 读 JSON；读不到就返回空对象，绝不让 hook 因为解析失败挡路
export async function readInput() {
  let raw = "";
  try {
    for await (const chunk of process.stdin) raw += chunk;
  } catch {
    return {};
  }
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
