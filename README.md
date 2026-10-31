# impulse-brake · 冲动刹车

给容易在项目中途"推翻重来"的人装一道刹车：当你在编码会话里说出「全部重写」「推倒重来」「换框架」「不做了」，AI 不会马上开工，而是先给你一个结构化选项。

设计前提是：**刹车不是为了拦住你，是为了让你在踩油门前多看一眼**。所以每个冲动只刹一次，你听完仍坚持，AI 立刻照办，不重复劝阻。

## 两层机制

| 层 | 干什么 | 靠什么触发 |
|---|---|---|
| **skill** | 定义刹车协议：遇到冲动该给什么方案 | AI 自己判断 + 关键词 |
| **gateway middleware** | 命中关键词就注入提醒；命中高危命令直接拦 | 确定性，不依赖模型自觉 |

skill 单独用也行；加上中间件后，不依赖模型"想起来用"。

## 刹车协议

| 你的冲动 | 替代动作 |
|---|---|
| 推翻重来 | 旧实现原地保留，新方案做半天能跑通的原型，同一用例对比后再迁移 |
| 换框架 / 换库 / 换语言 | 给对比表（解决什么问题、迁移成本、风险），决定留到下次会话；当前技术有硬伤才立即换 |
| 做到一半冒出新想法 | 记入 `docs/decision-log.md`，当前任务做完 |
| 想放弃 | 先分清"卡住了"还是"腻了"；腻了就定最多 3 项的最小可用版本，完成再谈 |

## 安装

### 只装 skill

```bash
git clone https://github.com/zxbdzh/impulse-brake
cp -r impulse-brake/skill ~/.claude/skills/impulse-brake      # Claude Code
cp -r impulse-brake/skill ~/.pi/agent/skills/impulse-brake     # Pi
```

放进 agent 的 skills 目录即可，注意目录名和 `SKILL.md` 里的 `name` 保持一致。

### 加装网关中间件（仅限走 magpie 网关的请求）

```bash
cp impulse-brake/middleware/impulse-brake.middleware.js ~/.config/magpie/middleware/
magpie plugin add ~/.config/magpie/middleware/impulse-brake.middleware.js
```

网关会热加载，不用重启。凡是走 magpie 的客户端（Claude Code、Codex、Pi、DSH……）都自动覆盖，一次装好。

## 中间件做什么

- **注入提醒**：命中说话表里的词，在最后一轮用户消息末尾追加一段 `<system-reminder>`，让模型按上面的协议回应
- **拦截高危命令**：`rm -rf /`、`git reset --hard`、`git push --force`、`drop database`、`mkfs`、`diskpart clean`、`format C:` 等，直接返回 400，要求你在消息里写「确认执行」后才放行

只读你自己写的文字，不碰 system prompt，不改历史消息，所以不破坏 prompt 缓存。

### 配置

词表、拦截清单、注入文本都在 `impulse-brake.middleware.js` 顶部的 `DEFAULTS` 里，改完保存即生效。

> 别用 `magpie plugin options` 从 Windows 命令行传中文 JSON —— 会被写成乱码。要改就在 magpie 应用的插件选项里改，或直接改这个文件。

### 触发词

只收"改大件"的说法：全部重写、推倒重来、重构整个、换框架、换库、换语言、换个方案、不做了、不想做了、放弃吧……

刻意不收裸的「重写」——「帮我重写这个函数」是日常请求，不该触发。

## 实测

| 场景 | 结果 |
|---|---|
| 「这个项目全部重写吧」 | 请求多注入约 190 token，模型先给分步迁移方案而不是直接动手 |
| 「帮我重写这个函数」 | 不触发 |
| 「git reset --hard」 | 400 拦下 |
| 「确认执行 git reset --hard」 | 200 放行 |

Codex CLI 实测：回复了 4 个决策项（重写范围 / 保留资产 / 技术栈 / 未提交改动），推荐项是"先设计再迁移、保留已发布版本、保持技术栈、先提交 WIP"。

## 已知边界

- 网关只能拦**你输入里**的高危命令。模型自己发出的工具调用在客户端执行，proxy 看不见——那层要另外写客户端的 hook（Pi 的 `tool_call` 事件、Claude Code 的 `PreToolUse`、Codex 的 `~/.codex/hooks.json`）
- 提醒会多花约 190 token，只在命中触发词时发生
- 关键词是启发式的，会有漏（你说「干吧，别问了」）和误（你说「重构整个数据层」）两头

## 许可证

MIT
