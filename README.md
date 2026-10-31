<div align="center">

# 🛑 impulse-brake

**当你在编码会话里说出「全部重写」，AI 先给你一个方案，而不是直接开工。**

一个给「想法多、动手快、也容易中途推翻重来」的人写的刹车。

[![License: MIT](https://img.shields.io/badge/license-MIT-3da639?style=flat-square)](LICENSE)
[![test](https://github.com/zxbdzh/impulse-brake/actions/workflows/test.yml/badge.svg)](https://github.com/zxbdzh/impulse-brake/actions/workflows/test.yml)
[![GitHub stars](https://img.shields.io/github/stars/zxbdzh/impulse-brake?style=flat-square&color=f5c518)](https://github.com/zxbdzh/impulse-brake/stargazers)
[![Claude Code plugin](https://img.shields.io/badge/Claude%20Code-plugin-d97757?style=flat-square)](https://github.com/zxbdzh/impulse-brake)
[![Codex plugin](https://img.shields.io/badge/Codex-plugin-10a37f?style=flat-square)](https://github.com/zxbdzh/impulse-brake)
[![pi package](https://img.shields.io/badge/pi-package-8a7fe8?style=flat-square)](https://github.com/zxbdzh/impulse-brake)

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

## 安装

三种装法，选你的客户端。装完都带 skill + hook 两层，不用另外配。

### Claude Code

```bash
claude plugin marketplace add zxbdzh/impulse-brake
claude plugin install impulse-brake@impulse-brake
```

或在会话里：`/plugin marketplace add zxbdzh/impulse-brake` → `/plugin install impulse-brake@impulse-brake`

### Codex

```bash
codex plugin marketplace add zxbdzh/impulse-brake
codex plugin add impulse-brake@impulse-brake
```

Codex 首次运行会问是否信任插件的 hook，同意后生效。

### Pi

```bash
pi install git:github.com/zxbdzh/impulse-brake
```

### magic/magpie 网关（可选，另一种覆盖方式）

不想装插件、但请求都走 [magpie](https://usemagpie.ai) 网关时，用中间件版一次覆盖所有客户端：

```bash
cp middleware/impulse-brake.middleware.js ~/.config/magpie/middleware/
magpie plugin add ~/.config/magpie/middleware/impulse-brake.middleware.js
```

网关热加载，不用重启。和插件版二选一即可，两个都装会提醒两次。

## 装了它，你会得到什么

Claude Code 里 `claude plugin details impulse-brake` 的实际输出：

```text
Skills (1)  impulse-brake
Hooks (2)   UserPromptSubmit, PreToolUse  (harness-only — no model context cost)
Always-on:  ~146 tok  added to every session
```

| 层 | 干什么 | 触发方式 |
|---|---|---|
| 🧠 **skill** | 定义刹车协议：遇到冲动该给什么方案 | AI 自己判断 + 关键词 |
| ⚡ **UserPromptSubmit hook** | 命中关键词就往本轮上下文追加提醒 | 确定性，不依赖模型自觉 |
| 🚧 **PreToolUse hook** | 拦下不可逆命令，deny + 退出码 2 | 确定性 |

skill 单独用也行。加上 hook 后不再依赖模型「想起来用」——你那句冲动的话可能只是「干吧」，没有「重写」两个字。

## 刹车协议

| 你的冲动 | 替代动作 |
|---|---|
| 推翻重来 | 旧实现原地保留，新方案做半天能跑通的原型，同一用例对比后再迁移 |
| 换框架 / 换库 / 换语言 | 给对比表（解决什么问题、迁移成本、风险），决定留到下次会话；当前技术有硬伤才立即换 |
| 做到一半冒出新想法 | 记入 `docs/decision-log.md`，当前任务做完 |
| 想放弃 | 先分清「卡住了」还是「腻了」；腻了就定最多 3 项的最小可用版本，完成再谈 |

配套习惯：大项目拆成 1–3 天的短冲刺，每个冲刺收尾必须有能跑或能演示的东西。

## 仓库结构

```text
impulse-brake/
├── .claude-plugin/        Claude Code 插件 + 市场清单
├── .codex-plugin/         Codex 插件清单（与上面共用同一份 marketplace.json）
├── hooks/
│   ├── hooks.json         UserPromptSubmit + PreToolUse 注册
│   ├── lib.mjs            词表 / 危险命令 / 提醒正文（改这里）
│   ├── user-prompt-submit.mjs
│   ├── pre-tool-use.mjs
│   └── test.mjs
├── skills/impulse-brake/  刹车协议
└── middleware/            magpie 网关中间件版（可选）
```

## 配置

触发词、危险命令清单、注入的提醒正文都在 `hooks/lib.mjs` 顶部，改完保存即生效（插件装的是缓存副本，改仓库后需要 `claude plugin update` 或重装）。

**刻意的取舍**：不收裸的「重写」。「帮我重写这个函数」是日常请求，不该触发——只收「全部重写」「推倒重来」「重构整个」这类改大件的说法。

PreToolUse 里**没有**「说句话就放行」的后门：那是最后一道闸，要跑就由人手动跑。

## 实测

| 场景 | Claude Code | hook 层 |
|---|---|---|
| 「这个项目全部重写吧」 | 回①/②/③ 方案，不直接开工 | UserPromptSubmit 注入提醒 |
| 「帮我重写这个函数」 | 正常干活 | 不触发 |
| 「git reset --hard」 | 被拒 | PreToolUse deny |
| 「rm -rf ./dist」 | 正常执行 | 只拦根目录/家目录 |

```bash
npm test    # hooks 13 项 + middleware 11 项
```

## 已知边界

- **只写了 Claude Code 和 Codex 的 hook**。Cursor、Continue、Aider 之类要自己接，欢迎 PR
- hook 版只能看**模型要执行的命令**，看不到你的原始意图逻辑；magpie 中间件版只能看**你输入的文本**。要两层都覆盖就两个都装
- 关键词是启发式的，两头都会漏和误：你说「干吧，别问了」会漏；你说「重构整个数据层」会误
- 它让 AI 多问一句，不是替你做决定

## 贡献

- 新的触发词 / 更准的拦截规则，改 `hooks/lib.mjs` 的数组，顺手补 `hooks/test.mjs`
- 接别的客户端 hook，放 `hooks/` 下，注明 stdin/stdout 契约
- 提 issue 时说清楚：你说了什么、哪个客户端、期望什么、实际什么

## 许可

[MIT](LICENSE) © zxbdzh

<div align="center">
<sub>如果你也有「想法一堆、落地为零」的时刻，这个仓库就是为你写的。</sub>
</div>
