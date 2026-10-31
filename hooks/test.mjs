// hooks 冒烟测试：node hooks/test.mjs
// 用 spawnSync 真跑两个 hook 脚本，验证 stdin/stdout/exit code 契约。
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
let pass = 0;
const fail = [];
const ok = (c, m) => (c ? pass++ : fail.push(m));

function run(script, input) {
  const r = spawnSync(process.execPath, [join(HERE, script)], {
    input: typeof input === "string" ? input : JSON.stringify(input),
    encoding: "utf8",
  });
  let json = null;
  try {
    json = JSON.parse(r.stdout || "{}");
  } catch {}
  return { code: r.status, stdout: r.stdout, stderr: r.stderr, json };
}

// UserPromptSubmit
{
  const r = run("user-prompt-submit.mjs", { prompt: "这个项目全部重写吧", cwd: "/tmp" });
  ok(r.code === 0, "ups exits 0");
  ok(/impulse-brake/.test(r.json?.hookSpecificOutput?.additionalContext || ""), "ups injects reminder");
  ok(typeof r.json?.systemMessage === "string", "ups sets systemMessage");
}
{
  const r = run("user-prompt-submit.mjs", { prompt: "帮我重写这个函数" });
  ok(r.code === 0 && r.stdout.trim() === "{}", "ups silent on 重写函数");
}
{
  const r = run("user-prompt-submit.mjs", { prompt: "今天星期几" });
  ok(r.code === 0 && r.stdout.trim() === "{}", "ups silent on unrelated");
}
{
  const r = run("user-prompt-submit.mjs", "not json at all");
  ok(r.code === 0, "ups tolerates bad stdin");
}

// PreToolUse
{
  const r = run("pre-tool-use.mjs", { tool_name: "Bash", tool_input: { command: "git reset --hard HEAD~3" } });
  ok(r.code === 2, "ptu blocks git reset --hard");
  ok(r.json?.hookSpecificOutput?.permissionDecision === "deny", "ptu emits deny");
  ok(/git reset --hard/.test(r.stderr), "ptu names the command");
}
{
  const r = run("pre-tool-use.mjs", { tool_name: "Bash", tool_input: { command: "rm -rf /" } });
  ok(r.code === 2, "ptu blocks rm -rf /");
}
{
  const r = run("pre-tool-use.mjs", { tool_name: "Bash", tool_input: { command: "rm -rf ./dist" } });
  ok(r.code === 0, "ptu allows local rm -rf");
}
{
  const r = run("pre-tool-use.mjs", { tool_name: "Bash", tool_input: { command: "npm test" } });
  ok(r.code === 0 && r.stdout === "", "ptu silent on safe command");
}
{
  const r = run("pre-tool-use.mjs", { tool_name: "Read", tool_input: { file_path: "/x" } });
  ok(r.code === 0, "ptu ignores non-shell tools");
}

if (fail.length) {
  console.error(`${fail.length} failed:\n- ` + fail.join("\n- "));
  process.exit(1);
}
console.log(`${pass} passed`);
