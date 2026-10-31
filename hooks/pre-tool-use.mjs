#!/usr/bin/env node
// PreToolUse hook（Claude Code / Codex 共用）
// 拦下不可逆的高危命令：输出 deny JSON，永远 exit 0。
//
// 退出码两家不同（都实测过）：
// · Codex 0.165：只认 exit 0 + JSON permissionDecision，退出码 2 会被当成 hook 故障放行；
// · Claude Code 2.1：实测 exit 2 才拦得住，纯 JSON + exit 0 放行。
// 靠 Codex 独有的 turn_id 字段区分客户端，各用各的退出码。
//
// 这里不给「说句话就放行」的后门：最后一道闸，要跑就由人手动跑。
import { dangerHit, readInput } from "./lib.mjs";

const input = await readInput();

// 不同客户端把命令放在不同字段：Claude Code / Codex 都是 tool_input.command，
// 其余 shell 类工具可能叫 cmd 或 script。
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

process.stdout.write(
  JSON.stringify({
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: reason,
    },
  })
);
process.exit(input.turn_id ? 0 : 2);
