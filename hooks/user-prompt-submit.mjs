#!/usr/bin/env node
// UserPromptSubmit hook（Claude Code / Codex 共用）
// 命中冲动信号 → 往本轮上下文追加刹车提醒。永远 exit 0，避免挡住用户消息。
import { hit, REMINDER, readInput } from "./lib.mjs";

const input = await readInput();
const prompt = typeof input.prompt === "string" ? input.prompt : "";

if (!hit(prompt)) {
  process.stdout.write("{}");
  process.exit(0);
}

const payload = {
  // Codex 走 systemMessage；Claude Code 走 hookSpecificOutput.additionalContext
  systemMessage: "impulse-brake：检测到冲动信号，已附加刹车提醒",
  hookSpecificOutput: {
    hookEventName: "UserPromptSubmit",
    additionalContext: REMINDER,
  },
};

process.stdout.write(JSON.stringify(payload));
process.exit(0);
