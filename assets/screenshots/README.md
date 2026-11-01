# Screenshot provenance

## Current example: Rust migration

- `rust-switch.png`: browser capture of a reading view of real Claude Code CLI output, recorded on 2026-11-01 with the local impulse-brake plugin and model `workbuddy/hy3`. **Not native Claude Code UI.**
- User input is exactly `我要换成rust架构`. Project facts were supplied in a system prompt. All tools were disabled; no file changes are not evidence that a hook prevented a rewrite.
- The comparison and recommendation are reproduced without rewriting, ending before the model’s textual `<toolinvoke>` block. The complete response and system prompt are preserved in [`rust-switch-session.json`](rust-switch-session.json).
- Formatting converts the output’s Markdown table to HTML for readability. The title, input label, and footer are presentation additions. This is not an image-generated or simulated conversation.
- Performance, ecosystem, and schedule statements are unverified model judgments. No performance benchmark or causal A/B test was run. Another isolated fixture run recommended proceeding with a rewrite; reminders are not guaranteed enforcement.
- Both READMEs share the Chinese image; the English page provides a translated summary.

## Earlier example (retained, no longer featured)

- `decision-pause.png`: cropped from the real coding-session screenshot supplied by the project maintainer. Original: 2238 × 1242 pixels; crop: `(286, 0, 2036, 983)`; output: 1750 × 983 pixels, RGB PNG, no EXIF metadata.
- Only margins and lower project context were removed. No messages were rewritten or re-rendered. It shows one observed response, not a fixed template or a guarantee.
