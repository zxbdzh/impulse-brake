# Install impulse-brake — instructions for AI agents

Use this runbook when the user asks you to install impulse-brake. Complete the installation for **one requested client**, verify the resulting files or client inventory, and report what still requires a restart or human approval. This is an installation request, not a request to rewrite the user's project.

## 1. Identify the target and inspect

- Use the client explicitly named by the user; otherwise use reliable current-session identity. A binary on PATH or a configuration directory is not proof of the current client. If the target is still ambiguous, ask which client to install for.
- Supported routes: Claude Code, Codex, Pi, DSH. Use the magpie gateway route only when explicitly requested. For an unsupported client, report the limitation instead of inventing hook support.
- Resolve the user's home directory and actual shell. Commands below use Bash/Git Bash syntax; translate paths for PowerShell or cmd. Use full paths and quote paths containing spaces. Respect custom client configuration directories; the bundled Codex and DSH installers target the default home directories, so stop and ask before using them with a custom configuration location.
- Check Git, Node.js, the target client, and its relevant `--help`. Report missing prerequisites; installing or upgrading those tools needs separate user permission. No administrator privileges are needed by this runbook.
- Inspect the client inventory and any existing impulse-brake installation first. If already installed and verified, report that rather than reinstalling it. Update only when requested.

## 2. Obtain and review the source

Trusted repository: `https://github.com/zxbdzh/impulse-brake`. Use only this source for these instructions. If the user requests a version, resolve and use that version; otherwise use the default branch and record its commit.

For the clone-based routes, use a persistent `~/.impulse-brake` directory, never a temporary directory. Codex hook commands will point into this clone. Clone only when the path does not exist:

```bash
git clone https://github.com/zxbdzh/impulse-brake.git ~/.impulse-brake
```

If the directory already exists, check its origin and working-tree status. Reuse a verified clone. Preserve local modifications and do not overwrite an unrelated directory. A requested update may use `git pull --ff-only` only on a clean, verified clone; stop on conflicts rather than resetting or cleaning files.

Before running a bundled installer, read the script and the files it imports. Inspect relevant existing configuration, validate its syntax, and make a separate timestamped backup of every file/directory the installer will replace. The installers' fixed-name backups are not a substitute for preserving user customizations. Never send credentials or unrelated configuration content to a remote service.

## 3. Install only the selected route

### Claude Code

```bash
claude plugin marketplace add zxbdzh/impulse-brake
claude plugin install impulse-brake@impulse-brake
```

If the marketplace already exists, reuse it. The plugin contains the skill and both hooks; do not also register the same hooks in user settings. Inspect the installed plugin manifest and hook scripts. If plugin trust or policy approval is required, let the user approve it; do not bypass the prompt.

### Codex

Use the persistent clone from step 2. Inspect `hooks/install-codex.mjs` and existing `~/.codex/hooks.json` before running:

```bash
node ~/.impulse-brake/hooks/install-codex.mjs
```

**Preflight:** if an existing hook file is invalid JSON, has a non-object root or `hooks` field, or has non-array event groups, stop without running the installer. The installer can replace invalid JSON, so back up and ask before any repair. Check every existing group that references impulse-brake; preserve unrelated hooks even when they share a group. The installer removes whole groups containing its marker, so stop if such a group also contains another tool's hook.


Check `codex features list` for the effective `hooks` feature state. If the installed version exposes this feature but it is disabled, back up `~/.codex/config.toml` before using `codex features enable hooks`. If policy prevents enabling it, or the client has no compatible hook support, report that limitation rather than claiming the hooks are active.

In the tested Codex version, plugin-root variables did not expand in hook commands; the installer writes absolute paths instead. Also install the skill via the plugin marketplace if it is not already installed:

```bash
codex plugin marketplace add zxbdzh/impulse-brake
codex plugin add impulse-brake@impulse-brake
```

If that client version has no plugin support, report hooks installed / skill unavailable rather than claiming full installation. Keep the clone at its installed path. Trust prompts and restart requirements remain user actions.

### Pi

```bash
pi install git:github.com/zxbdzh/impulse-brake
```

This route installs the skill only. There is no bundled Pi tool-hook extension; do not claim command blocking.

### DSH

Use the persistent clone from step 2. Inspect `hooks/install-dsh.mjs`, the installed skill directory, and `~/.dsh/prompt-inject.md` first:

```bash
node ~/.impulse-brake/hooks/install-dsh.mjs
```

Back up an existing `~/.dsh/skills/impulse-brake` directory before running: it is deleted and replaced by the installer. Preserve existing prompt text. The reminder uses `<!-- impulse-brake:begin -->` / `<!-- impulse-brake:end -->` markers; if they are unmatched, duplicated, or reversed, stop and ask before repairing them. This integration supplies a skill and per-turn reminder, not command blocking.

### magpie gateway — explicit opt-in only

Use the persistent clone from step 2. Inspect the middleware and existing plugin configuration, then follow the [gateway instructions in README.md](README.md#安装) from the clone. Back up any middleware file being replaced. Do not overwrite a locally customized copy without approval.

Gateway middleware sees user message text, not commands executed by local tools. Check for an existing client reminder and explain duplication before enabling both. Do not disable an existing integration without permission.

## 4. Verify without destructive commands

Use read-only client inventory/help and inspect actual installed files. A successful installer exit alone is not enough.

| Route | Evidence required |
|---|---|
| Claude Code | `claude plugin list` shows the plugin enabled; `claude plugin details impulse-brake@impulse-brake` or the installed files show the skill, UserPromptSubmit, and PreToolUse. Use `--help` if this client lacks `details`. |
| Codex | Plugin inventory shows the skill plugin; hooks JSON contains exactly one impulse-brake command for each event; both absolute script paths exist; unrelated hooks are preserved. Report missing plugin support separately. |
| Pi | Package inventory (use `pi --help` to find its listing command) shows this repository and the installed package contains `skills/impulse-brake/SKILL.md`. |
| DSH | Installed skill exists; injection file has exactly one complete reminder block; unrelated text is unchanged. |
| magpie | Plugin inventory shows this middleware enabled and the installed file matches the reviewed source. |

When a reviewed local clone is available, run its existing tests:

```bash
cd ~/.impulse-brake
npm test
```

The tests pass dangerous-looking **strings as JSON input to hook scripts**; they do not execute those commands. Never test the guard by actually invoking `git reset --hard`, deleting files, formatting disks, or running destructive SQL. Unit tests do not prove that a running client has reloaded its hooks. If approval/restart is pending, explicitly report it as pending rather than fully active.

Default prompt keywords and the bundled skill are Chinese-first. Do not claim that an English prompt such as “rewrite everything” triggers the keyword hook. For an optional behavioral check after reload, use `这个项目全部重写吧` in a disposable conversation, without asking the model to execute a destructive command.

## 5. Report

Reply in the user's language with:

- Target client, installed layers, source version/commit, and installation path.
- Verification evidence and backup paths, without exposing unrelated private settings.
- Any restart, trust approval, unsupported layer, or incomplete step.
- How to disable this integration, referring to the selected route in [README.md](README.md#想关掉的时候) or [README.en.md](README.en.md#disable-or-uninstall).

Do not install for every detected client, enable gateway middleware by default, change the user's project files, or promise a security sandbox.

Client command references, if local help differs: [Claude Code plugin management](https://code.claude.com/docs/en/discover-plugins), [Codex plugin commands](https://github.com/openai/codex/blob/main/codex-rs/cli/src/plugin_cmd.rs). Prefer the installed client's help and observed files over assumptions about a newer release.
