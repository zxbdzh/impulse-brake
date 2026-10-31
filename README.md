<div align="center">

# 🛑 impulse-brake

**当你在编码会话里说出「全部重写」，AI 先给你一个方案，而不是直接开工。**

一个给「想法多、动手快、也容易中途推翻重来」的人写的刹车。

[![License: MIT](https://img.shields.io/badge/license-MIT-3da639?style=flat-square)](LICENSE)
[![test](https://github.com/zxbdzh/impulse-brake/actions/workflows/test.yml/badge.svg)](https://github.com/zxbdzh/impulse-brake/actions/workflows/test.yml)
[![GitHub stars](https://img.shields.io/github/stars/zxbdzh/impulse-brake?style=flat-square&color=f5c518)](https://github.com/zxbdzh/impulse-brake/stargazers)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey?style=flat-square)]()
[![Works with](https://img.shields.io/badge/works%20with-Claude%20Code%20%7C%20Codex%20%7C%20Pi-blueviolet?style=flat-square)]()
[![PRs welcome](https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square)](https://github.com/zxbdzh/impulse-brake/issues)

</div>

---

## 30 秒看懂

你说：

```text
这个项目全部重写吧
```

它回的不是 `git rm -rf .`，而是：

```text
1. 重写范围        ▸ ✅ 先做重设计再分步迁移   ② 整个仓库推倒重来   ③ 只重写 agent CLI
2. 保留兼容的资产  ▸ ✅ 兼容已发布的 0.2.0 + 现有数据   ② 什么都不保留
3. 技术栈          ▸ ✅ 保持 FastAPI + React   ② 换栈   ③ 另给两个候选
4. 未提交的改动    ▸ ✅ 先提交到 wip/ 分支     ② stash / 直接丢弃

另外提醒两点事实：
· 这个项目是在役产品，同事在用 —— 建议走「先设计后迁移」
· backend 1.7 万行 + frontend 5.8 万行，全量重写是多周级别的工程
```

刹车不是为了拦住你，是为了让你在踩油门前多看一眼。**所以每个冲动只刹一次**——你听完还坚持，AI 立刻照办，不重复劝阻。

> 真实对话输出，来自 Codex CLI 实测。

## 目录

- [两层机制](#两层机制)
- [刹车协议](#刹车协议)
- [安装](#安装)
- [配置](#配置)
- [实测](#实测)
- [已知边界](#已知边界)
- [贡献](#贡献)

## 两层机制

| 层 | 干什么 | 靠什么触发 |
|---|---|---|
| 🧠 **skill** | 定义刹车协议：遇到冲动该给什么方案 | AI 自己判断 + 关键词 |
| ⚡ **gateway middleware** | 命中关键词就注入提醒；命中高危命令直接拦 | 确定性，不依赖模型自觉 |

skill 单独用也行。加上中间件后，不再依赖模型「想起来用」——你那句冲动的话可能只是「干吧」，没有「重写」两个字，模型不会主动刹；中间件会看着整句话。

## 刹车协议

| 你的冲动 | 替代动作 |
|---|---|
| 推翻重来 | 旧实现原地保留，新方案做半天能跑通的原型，同一用例对比后再迁移 |
| 换框架 / 换库 / 换语言 | 给对比表（解决什么问题、迁移成本、风险），决定留到下次会话；当前技术有硬伤才立即换 |
| 做到一半冒出新想法 | 记入 `docs/decision-log.md`，当前任务做完 |
| 想放弃 | 先分清「卡住了」还是「腻了」；腻了就定最多 3 项的最小可用版本，完成再谈 |

配套习惯：大项目拆成 1–3 天的短冲刺，每个冲刺收尾必须有能跑或能演示的东西。

## 安装

### 只装 skill

```bash
git clone https://github.com/zxbdzh/impulse-brake

cp -r impulse-brake/skill ~/.claude/skills/impulse-brake      # Claude Code
cp -r impulse-brake/skill ~/.pi/agent/skills/impulse-brake     # Pi
```

放进 agent 的 skills 目录即可。目录名和 `SKILL.md` 里的 `name` 保持一致。

### 加装网关中间件

仅限走 [magpie](https://usemagpie.ai) 网关的请求。好处是一次装好，所有走网关的客户端自动覆盖。

```bash
cp impulse-brake/middleware/impulse-brake.middleware.js ~/.config/magpie/middleware/
magpie plugin add ~/.config/magpie/middleware/impulse-brake.middleware.js
```

网关热加载，不用重启。

## 配置

词表、拦截清单、注入文本都在 `middleware/impulse-brake.middleware.js` 顶部的 `DEFAULTS` 里，改完保存即生效。

```js
words: ["全部重写", "推倒重来", "重构整个", "换框架", "换库", "不做了", ...],
blockPatterns: ["git\\s+reset\\s+--hard", "git\\s+push\\s+(--force|-f)", ...],
blockAction: "reject",        // reject = 拦下来；warn = 只提醒
confirmWords: ["确认执行"],     // 消息里写这个就放行
```

> ⚠️ 别用 `magpie plugin options` 从 Windows 命令行传中文 JSON —— 会被写成乱码。要改就在 magpie 应用的插件选项里改，或直接改这个文件。

**刻意的取舍**：不收裸的「重写」。「帮我重写这个函数」是日常请求，不该触发——只收「全部重写」「推倒重来」「重构整个」这类改大件的说法。

## 实测

| 场景 | 结果 |
|---|---|
| 「这个项目全部重写吧」 | 请求多注入约 190 token，模型先给分步迁移方案而不是直接动手 |
| 「帮我重写这个函数」 | 不触发 |
| 「git reset --hard」 | 400 拦下 |
| 「确认执行 git reset --hard」 | 200 放行 |

```bash
node middleware/test.mjs   # 11 passed：四种协议 + 拦截逻辑
```

## 已知边界

- **网关只能拦你输入里的高危命令**。模型自己发出的工具调用在客户端执行，proxy 看不见。那层要另外写客户端的 hook：Pi 的 `tool_call` 事件、Claude Code 的 `PreToolUse`、Codex 的 `~/.codex/hooks.json`
- 提醒会多花约 190 token，只在命中触发词时发生
- 关键词是启发式的，两头都会漏和误：你说「干吧，别问了」会漏；你说「重构整个数据层」会误
- 它让 AI 多问一句，不是替你做决定

## 贡献

- 新的触发词 / 更准的拦截规则，直接开 PR 改 `DEFAULTS`
- 换了别的 agent 的 hook（Cursor、Continue、Aider……），欢迎补 `middleware/` 里的实现
- 提 issue 时说清楚：你说了什么、哪个客户端、期望什么、实际什么

## 许可

[MIT](LICENSE) © zxbdzh

<div align="center">
<sub>如果你也有「想法一堆、落地为零」的时刻，这个仓库就是为你写的。</sub>
</div>
