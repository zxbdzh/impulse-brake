// impulse-brake.middleware.js
// 冲动刹车 —— magpie 网关中间件。
//
// 两件事：
//   1) 命中冲动关键词 → 在最后一轮用户消息末尾注入一段提醒，让模型按 impulse-brake 协议回应；
//   2) 命中高危命令 → 拒绝请求（400），用户写「确认执行」后才放行。
//
// 只读用户自己写的文字，不碰 system prompt，不改历史消息，所以不破坏 prompt 缓存。
// 配置就在本文件（DEFAULTS）：改词表/拦截清单直接改这里，保存后网关热加载。
// 不要用 `magpie plugin options` 从 Windows CLI 传中文（会变乱码）；要改就在 app 的插件选项里改，或直接改本文件。

const DEFAULTS = {
  // 触发词只收"改大件"的说法；裸"重写"太宽（"重写这个函数"也会中），不收
  words: [
    "全部重写", "全部重做", "重写整个", "重写全部", "推倒重来", "推翻重来",
    "重构整个", "重构全部", "大改架构", "换框架", "换库", "换语言",
    "换掉这个", "换个方案", "不做了", "不想做了", "放弃吧", "没意思了"
  ],
  // 额外的正则触发词
  patterns: [
    "(推倒|推翻)[^。]{0,4}重(来|做|写)",
    "换(成|掉|个)[^。]{0,6}(框架|库|语言|技术栈|架构)"
  ],
  // "last" 只看最后一条用户消息；"all" 看全部用户消息
  check: "last",
  // 只对某些模型生效（子串匹配 body.model）；空数组 = 全部
  models: [],
  // true = 每轮都注入提醒（不看关键词）
  always: false,
  // 注入内容
  reminder: [
    "<system-reminder>",
    "[impulse-brake 冲动刹车] 用户可能正在做大改动或冲动转向。若本请求是重写/推翻重来/换框架或库、中途加新需求、放弃任务，先刹车一次再执行：",
    "1) 推翻重来 → 旧实现保留，新方案做半天能跑通的原型，用同一用例对比后再迁移；",
    "2) 换技术 → 给对比表（解决什么问题/迁移成本/风险），决定留到下次会话；当前技术有硬伤才立即换；",
    "3) 中途新想法 → 记入 docs/decision-log.md，当前任务做完；",
    "4) 想放弃 → 分清卡住还是腻了，腻了先定最多 3 项的最小可用版本。",
    "用户听完仍坚持就立刻照办，不重复劝阻。与本请求无关则忽略这条提醒。",
    "</system-reminder>"
  ].join("\n"),
  // 高危命令：命中就拦（对用户自己写的文字）
  blockPatterns: [
    "rm\\s+-[a-z]*r[a-z]*f[a-z]*\\s+(/|~|\\$HOME)(\\s|$)",
    "git\\s+reset\\s+--hard",
    "git\\s+push\\s+(--force|-f)\\b",
    "drop\\s+(database|schema)\\b",
    "truncate\\s+table\\b",
    "mkfs(\\.|\\s|$)",
    "diskpart\\s+clean",
    "format\\s+[a-z]:",
    "del\\s+/[fsq]\\b",
    "Remove-Item\\b[^\\n]*-Recurse[^\\n]*-Force"
  ],
  // "reject" = 拦下来要确认；"warn" = 只在提醒里注明，不拦
  blockAction: "reject",
  // 出现这些词视为用户已确认，放行
  confirmWords: ["确认执行", "确认删除", "confirm"],
  blockMessage:
    "impulse-brake 拦下一条高危命令（不可逆）。若确需执行，请在消息里写明「确认执行」后重发；建议先备份或改成可回滚的做法。"
};

function opts(ctx) {
  const o = ctx && ctx.options && typeof ctx.options === "object" ? ctx.options : {};
  const merged = { ...DEFAULTS, ...o };
  if (!Array.isArray(merged.words)) merged.words = [];
  if (!Array.isArray(merged.patterns)) merged.patterns = [];
  if (!Array.isArray(merged.blockPatterns)) merged.blockPatterns = [];
  if (!Array.isArray(merged.confirmWords)) merged.confirmWords = [];
  if (!Array.isArray(merged.models)) merged.models = [];
  return merged;
}

function matcher(words, patterns) {
  const parts = [];
  for (const w of Array.isArray(words) ? words : [])
    if (typeof w === "string" && w.trim())
      parts.push(w.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  for (const p of Array.isArray(patterns) ? patterns : [])
    if (typeof p === "string" && p) parts.push("(?:" + p + ")");
  return parts.length ? new RegExp(parts.join("|"), "gi") : null;
}

function hitText(re, text) {
  if (!re) return null;
  re.lastIndex = 0;
  const m = re.exec(text);
  return m ? m[0] : null;
}

// 收集用户自己的文字（按协议取）。
function userTexts(body, protocol, all) {
  const out = [];
  if (protocol === "gemini") {
    for (const m of Array.isArray(body.contents) ? body.contents : []) {
      if (!m || (m.role && m.role !== "user")) continue;
      for (const p of Array.isArray(m.parts) ? m.parts : [])
        if (p && typeof p.text === "string") out.push(p.text);
    }
  } else if (protocol === "responses") {
    if (typeof body.input === "string") out.push(body.input);
    else
      for (const m of Array.isArray(body.input) ? body.input : []) {
        if (!m || m.role !== "user") continue;
        if (typeof m.content === "string") out.push(m.content);
        else
          for (const p of Array.isArray(m.content) ? m.content : [])
            if (p && typeof p.text === "string" && (p.type === "input_text" || p.type === "text"))
              out.push(p.text);
      }
  } else {
    for (const m of Array.isArray(body.messages) ? body.messages : []) {
      if (!m || m.role !== "user") continue;
      if (typeof m.content === "string") out.push(m.content);
      else
        for (const p of Array.isArray(m.content) ? m.content : [])
          if (p && typeof p.text === "string") out.push(p.text);
    }
  }
  return all ? out : out.slice(-1);
}

// 把 text 追加到最后一轮用户消息上。
function inject(body, protocol, text) {
  if (protocol === "gemini") {
    const cs = Array.isArray(body.contents) ? body.contents : [];
    for (let i = cs.length - 1; i >= 0; i--) {
      const m = cs[i];
      if (!m || (m.role && m.role !== "user")) continue;
      if (Array.isArray(m.parts)) { m.parts.push({ text }); return true; }
    }
    return false;
  }
  if (protocol === "responses") {
    if (typeof body.input === "string") { body.input += "\n\n" + text; return true; }
    const arr = Array.isArray(body.input) ? body.input : [];
    for (let i = arr.length - 1; i >= 0; i--) {
      const m = arr[i];
      if (!m || m.role !== "user") continue;
      if (typeof m.content === "string") { m.content += "\n\n" + text; return true; }
      if (Array.isArray(m.content)) { m.content.push({ type: "input_text", text }); return true; }
    }
    arr.push({ role: "user", content: [{ type: "input_text", text }] });
    body.input = arr;
    return true;
  }
  const ms = Array.isArray(body.messages) ? body.messages : [];
  for (let i = ms.length - 1; i >= 0; i--) {
    const m = ms[i];
    if (!m || m.role !== "user") continue;
    if (typeof m.content === "string") { m.content += "\n\n" + text; return true; }
    if (Array.isArray(m.content)) { m.content.push({ type: "text", text }); return true; }
  }
  return false;
}

export function onRequest(body, ctx) {
  if (!body || typeof body !== "object") return;
  const o = opts(ctx);
  const protocol = (ctx && ctx.protocol) || "chat";

  const model = typeof body.model === "string" ? body.model : "";
  if (o.models.length && !o.models.some((m) => typeof m === "string" && model.includes(m))) return;

  const joined = userTexts(body, protocol, o.check === "all").join("\n");

  // 1) 高危命令
  if (o.blockPatterns.length) {
    const hit = hitText(matcher([], o.blockPatterns), joined);
    if (hit && !o.confirmWords.some((w) => typeof w === "string" && joined.includes(w))) {
      if (o.blockAction === "reject") {
        ctx.reject(400, o.blockMessage + "\n命中：" + hit);
        return;
      }
    }
  }

  // 2) 冲动关键词
  const impulse = o.always || hitText(matcher(o.words, o.patterns), joined);
  if (impulse) {
    if (inject(body, protocol, o.reminder)) return body;
  }
}
