#!/usr/bin/env node
// DSH 专用安装器。
//
// DSH 没有 hook 机制：它的确定性入口是 ~/.dsh/prompt-inject.md（每轮注入的提示词），
// 技能入口是 ~/.dsh/skills。所以这里做两件事：
//   1. 把 skill 拷进 ~/.dsh/skills/impulse-brake
//   2. 在 prompt-inject.md 里维护一个带标记的短提醒块（幂等，改前备份）
//
// 用法：node <仓库>/hooks/install-dsh.mjs
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync, cpSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repo = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dsh = join(homedir(), ".dsh");
const skillsDir = join(dsh, "skills", "impulse-brake");
const injectFile = join(dsh, "prompt-inject.md");

const BEGIN = "<!-- impulse-brake:begin -->";
const END = "<!-- impulse-brake:end -->";
// DSH 没有 hook，只能靠这段提示词做"确定性提醒"，所以写得比 skill 更直接
const BLOCK = `${BEGIN}
## 冲动刹车（impulse-brake）

用户说出「全部重写」「推倒重来」「重构整个」「换框架 / 换库」「不做了」这类话时，先按 skill \`impulse-brake\` 的协议给出结构化方案（重写范围 / 保留资产 / 技术栈 / 未提交改动），再动手。

- 推翻重来 → 旧实现保留，新方案先做半天能跑通的原型，同用例对比后再迁移
- 换技术 → 给对比表（解决什么问题 / 迁移成本 / 风险），决定留到下次会话
- 中途新想法 → 记入 docs/decision-log.md，当前任务做完
- 想放弃 → 先分清卡住还是腻了，腻了先定最多 3 项的最小可用版本

用户听完仍坚持就立刻照办，不重复劝阻。
${END}`;

// 1) skill
rmSync(skillsDir, { recursive: true, force: true });
mkdirSync(dirname(skillsDir), { recursive: true });
cpSync(join(repo, "skills", "impulse-brake"), skillsDir, { recursive: true });
console.log(`已安装 skill：${skillsDir}`);

// 2) prompt-inject.md 里的标记块
mkdirSync(dsh, { recursive: true });
let text = existsSync(injectFile) ? readFileSync(injectFile, "utf8") : "";
if (text) copyFileSync(injectFile, injectFile + ".impulse-brake-backup");

const start = text.indexOf(BEGIN);
const stop = text.indexOf(END);
if (start !== -1 && stop > start) {
  text = text.slice(0, start) + BLOCK + text.slice(stop + END.length);
} else {
  text = text.replace(/\s*$/, "") + "\n\n" + BLOCK + "\n";
}
writeFileSync(injectFile, text, "utf8");
console.log(`已写入提醒块：${injectFile}`);
console.log("下次启动 DSH 生效；提醒块可随时删掉，只留 skill 也能用。");
