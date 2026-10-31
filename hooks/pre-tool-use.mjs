#!/usr/bin/env node
// PreToolUse hook（Claude Code / Codex 共用）
// 拦下不可逆的高危命令：deny JSON + exit 2。放行则静默 exit 0。
// 这里是最后一道闸，所以不给「确认执行」这类关键词后门——真要跑，人来手动跑。
import { dangerHit, readInput } from "./lib.mjs";

const input = await readInput();

// 不同客户端把命令放在不同字段：Claude Code 是 tool_input.command，
// Codex 的 shell 工具也走 command；exec/terminal 类工具可能叫 cmd 或 script。
const ti = input.tool_input ?? input.toolInput ?? {};
const command = [ti.command, ti.cmd, ti.script, input.command].find(
  (v) => typeof v === "string" && v.trim()
);

if (!command) process.exit(0);

const found = dangerHit(command);
if (!found) process.exit(0);

const reason =
  `impulse-brake 拦下了不可逆命令：${found}\n` +
  `确需执行就由你自己在终端里跑；建议先备份，或改成可回滚的做法。`;

process.stderr.write(reason + "\n");
process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  })
);
process.exit(2);
