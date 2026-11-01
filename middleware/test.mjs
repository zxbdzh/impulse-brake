// 冒烟测试：node middleware/test.mjs
import { onRequest } from "./impulse-brake.middleware.js";

let pass = 0;
const fail = [];
const ok = (c, m) => (c ? pass++ : fail.push(m));

// 1 chat 协议，字符串 content
{
  const body = { model: "x", messages: [{ role: "user", content: "这个项目全部重写吧" }] };
  ok(onRequest(body, { protocol: "chat" }) === body && body.messages[0].content.includes("impulse-brake"), "chat inject");
}
// 2 anthropic 协议，数组 content
{
  const body = { model: "x", messages: [{ role: "user", content: [{ type: "text", text: "把后端推倒重来" }] }] };
  ok(onRequest(body, { protocol: "anthropic" }) === body && body.messages[0].content.length === 2, "anthropic inject");
}
// 3 responses 协议，字符串 input
{
  const body = { model: "x", input: "我们换个方案吧" };
  ok(onRequest(body, { protocol: "responses" }) === body && body.input.includes("impulse-brake"), "responses string inject");
}
// 4 responses 协议，数组 input
{
  const body = { model: "x", input: [{ role: "user", content: [{ type: "input_text", text: "全部重写这个模块" }] }] };
  ok(onRequest(body, { protocol: "responses" }) === body && body.input[0].content.length === 2, "responses array inject");
}
// 5 gemini 协议
{
  const body = { contents: [{ role: "user", parts: [{ text: "不想做了" }] }] };
  ok(onRequest(body, { protocol: "gemini" }) === body && body.contents[0].parts.length === 2, "gemini inject");
}
// 具体换栈请求：跨协议都用同一套词表，避免演示句漏触发。
for (const prompt of ["我要换成rust架构", "我要换成 Rust 架构"]) {
  const body = { model: "x", messages: [{ role: "user", content: prompt }] };
  ok(onRequest(body, { protocol: "chat" }) === body && body.messages[0].content.includes("impulse-brake"), `stack switch injects: ${prompt}`);
}
for (const prompt of ["Rust架构有哪些优点", "把图标换成rust颜色"]) {
  const body = { model: "x", messages: [{ role: "user", content: prompt }] };
  ok(onRequest(body, { protocol: "chat" }) === undefined, `no stack-switch false positive: ${prompt}`);
}
// 6 普通请求不注入（裸"重写"不收）
{
  const body = { model: "x", messages: [{ role: "user", content: "帮我重写这个函数" }] };
  ok(onRequest(body, { protocol: "chat" }) === undefined, "no false positive on 重写函数");
}
// 7 高危命令拦下来
{
  let rejected = null;
  const ctx = { protocol: "chat", reject: (s, m) => (rejected = { s, m }) };
  onRequest({ model: "x", messages: [{ role: "user", content: "帮我跑 git reset --hard HEAD~3" }] }, ctx);
  ok(rejected && rejected.s === 400 && rejected.m.includes("git reset --hard"), "danger blocked");
}
// 8 写了确认词就放行
{
  let rejected = null;
  const ctx = { protocol: "chat", reject: (s, m) => (rejected = { s, m }) };
  onRequest({ model: "x", messages: [{ role: "user", content: "确认执行 git reset --hard HEAD~3" }] }, ctx);
  ok(rejected === null, "confirm passes");
}
// 9 只拦根目录 rm -rf
{
  let rejected = null;
  const ctx = { protocol: "chat", reject: () => (rejected = 1) };
  onRequest({ model: "x", messages: [{ role: "user", content: "rm -rf /tmp/foo" }] }, ctx);
  ok(rejected === null, "rm -rf /tmp allowed");
  onRequest({ model: "x", messages: [{ role: "user", content: "rm -rf /" }] }, ctx);
  ok(rejected === 1, "rm -rf / blocked");
}
// 10 models 白名单生效
{
  const ctx = { protocol: "chat", options: { models: ["gpt"] }, reject: () => {} };
  const body = { model: "claude-3", messages: [{ role: "user", content: "全部重写" }] };
  ok(onRequest(body, ctx) === undefined, "model filter skips");
}

if (fail.length) {
  console.error(`${fail.length} failed:\n- ` + fail.join("\n- "));
  process.exit(1);
}
console.log(`${pass} passed`);
