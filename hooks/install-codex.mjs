#!/usr/bin/env node
// Codex 专用安装器。
//
// 为什么需要它：Codex 执行插件 hook 时不做变量展开（${PLUGIN_ROOT} 会原样传给 node，
// 直接报错），所以插件里那份 hooks.json 在 Codex 里是失效的。Codex 的 hook 只能是
// 写死在 ~/.codex/hooks.json 里的绝对路径——这个脚本就是替你把路径填进去。
//
// 用法：node <插件目录>/hooks/install-codex.mjs
// 幂等：重复跑只会替换自己的条目，不动别人的 hook。改前自动备份。
import { existsSync, readFileSync, writeFileSync, copyFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const pluginRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..").replace(/\\/g, "/");
const hooksFile = join(homedir(), ".codex", "hooks.json");
const MARK = "impulse-brake/hooks/";

const script = (name) => `node "${pluginRoot}/hooks/${name}"`;

const entries = {
  UserPromptSubmit: [
    {
      hooks: [
        {
          type: "command",
          command: script("user-prompt-submit.mjs"),
          timeout: 10,
          statusMessage: "impulse-brake 检查冲动信号",
        },
      ],
    },
  ],
  // Codex 的 matcher 语义与 Claude Code 不同（写法对不上时 hook 会静默不跑），
  // 所以这里不收窄：所有工具都过一遍，非 shell 工具由脚本自己快速 exit 0。
  PreToolUse: [
    {
      hooks: [{ type: "command", command: script("pre-tool-use.mjs"), timeout: 10 }],
    },
  ],
};

let config = { description: "User-level lifecycle hooks for Codex.", hooks: {} };
if (existsSync(hooksFile)) {
  copyFileSync(hooksFile, hooksFile + ".impulse-brake-backup");
  try {
    config = JSON.parse(readFileSync(hooksFile, "utf8"));
  } catch {
    console.error(`${hooksFile} 不是合法 JSON，已备份后新建`);
    config = { description: "User-level lifecycle hooks for Codex.", hooks: {} };
  }
}
config.hooks ||= {};

for (const [event, list] of Object.entries(entries)) {
  const kept = (config.hooks[event] ?? []).filter(
    (group) => !JSON.stringify(group).includes(MARK)
  );
  config.hooks[event] = [...kept, ...list];
}

mkdirSync(dirname(hooksFile), { recursive: true });
writeFileSync(hooksFile, JSON.stringify(config, null, 2) + "\n", "utf8");
console.log(`已写入 ${hooksFile}`);
console.log(`插件路径：${pluginRoot}`);
console.log("下次启动 Codex 会询问是否信任新 hook，同意后生效。");
