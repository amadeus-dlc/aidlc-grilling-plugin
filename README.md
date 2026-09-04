# aidlc-grilling-plugin

English | [日本語](README.ja.md)

**Grill me** for [AI-DLC v2](https://github.com/awslabs/aidlc-workflows), packaged as an additive plugin. It adds a fourth interaction mode to every stage's clarifying questions: instead of a batch (Guide me), a file hand-off (I'll edit the file), or free conversation (Chat), the orchestrator interviews you in rounds of independent questions, each with a recommended answer, decides the small things itself as recorded assumptions, and drills into every branch until you share the same understanding. Core is never modified: disable the plugin and the vanilla workflow remains. The procedure is Matt Pocock's [`grilling` skill](https://github.com/mattpocock/skills), rewritten onto AI-DLC's questions file, audit log, and summary confirmation.

This is the development workspace. The plugin itself lives in [`grilling/`](grilling/) — see its [README](grilling/README.md) for how the mode works in detail.

## Highlights

- **Rounds, not a queue** — the stage's questions become a decision tree. Every round asks the whole frontier (the decisions whose prerequisites are settled) and nothing that depends on an answer still open; after each answer the tree is updated and the frontier recomputed.
- **A recommended answer on every question** — with one line of reasoning. On Claude Code it is listed first and marked `(Recommended)`; on the numbered-prose harnesses it is the `➡️` line under the question.
- **Depth sets the size of decision you are asked about, not a question count** — decisions are sized XL / L / M / S / SS by reach and reversibility. Minimal asks XL and L, Standard down to M, Comprehensive down to S; SS is always the agent's.
- **Nothing decided silently** — a decision below the threshold is decided with the recommended answer and written to the questions file as a *decided assumption*. The consolidated summary lists every answer and every assumption for confirmation in bulk, and an objection promotes the assumption to a question in the next round.
- **Facts are looked up, not asked** — file contents, configuration, and prior artifacts are read (by a sub-agent where the harness has one). A lookup in progress holds back only the decisions that depend on it; the rest of the frontier is asked meanwhile.
- **One question at a time when you want it** — a line under `## Corrections` in the space's `project.md`, or a request mid-interview, switches the screens to a single question without changing the rounds or the ledger.
- **Contributions only** — 28 prose fragments spliced next to each core stage's question step; no stages, agents, scopes, sensors, or tools. Composition is additive and idempotent.

## Quickstart

### Requirements

- [bun](https://bun.sh/) — this repository pins 1.3.13 in `mise.toml` and CI
- A target project with [AI-DLC v2](https://github.com/awslabs/aidlc-workflows) installed

### Install into your AI-DLC project

Install a specific stable release. The bootstrap script and the installed
source come from the same immutable tag:

```sh
VERSION=v0.2.0
curl -fsSL "https://raw.githubusercontent.com/amadeus-dlc/aidlc-grilling-plugin/${VERSION}/grilling/scripts/install.ts" |
  bun - --project <your-aidlc-project> --tag "${VERSION}"   # --harness codex, kiro, … (default: claude)
```

The installer downloads the tagged source, builds the harness projection under
`grilling/dist/<harness>/`, and composes the 28 contributions into the
project's harness tree (`.claude/`, `.codex/`, …). Store harnesses (Claude
Code, Codex, Copilot, opencode) compose directly from `dist/` and copy nothing
into the project; storeless harnesses (Kiro, Kiro IDE, Cursor) first
folder-drop the projection into the project root, as those hosts expect.
Compose runs through `aidlc plugin sync` when the `aidlc` CLI is on PATH and
through the projection's own `hooks/compose.ts` otherwise. Add `--dry-run` to
verify the compose without touching the project. Nothing outside that project
is changed, and disabling the plugin recomposes the vanilla workflow.

| Option | Meaning |
|---|---|
| `--project <path>` | The AI-DLC project to install into. Required. |
| `--harness <name>` | One of `claude` (default), `codex`, `copilot`, `opencode`, `kiro`, `kiro-ide`, `cursor`. |
| no selector | Resolve and install the latest stable Semantic Versioning tag. |
| `--tag v0.2.0` | Install one immutable release. This is the recommended production path. |
| `--from <repo-root>` | Build from a local checkout — the repository root that contains `grilling/`, not the plugin directory itself. Useful while developing the plugin. |
| `--ref <branch>` | Download a moving branch ref. Use this only to follow development, not for a reproducible installation. |
| `--update` | Reuse the recorded selector: latest resolves again, while local and ref reacquire the same source. A fixed tag is already immutable and returns `Changed 0`. It cannot be combined with a selector. |
| `--dry-run` | Build, then rehearse the compose in a temporary copy of the install; the project is not written. |
| `--skip-build` | Use the projection already under `grilling/dist/<harness>/` instead of rebuilding it (development only). |

Each successful install records its version, source selector, timestamp, and
payload digest at `<harness>/tools/data/grilling-install.json` in the target
project. Here `<harness>` is the selected harness tree, such as `.claude` or
`.codex`. The digest covers the projection's payload files and its
contributions, so a second run against an unchanged source ends with
`Changed 0`, while a source whose fragments changed is recomposed. Plugin
distribution does not use an npm package or a GitHub Release asset; tagged and
branch installs fetch GitHub source archives directly.

> The installer is a folder-drop: it has no install-time trust gate, so only point it at a build you would run code from. For a store-mediated trust prompt, use the host plugin flows below instead.

### Adopting mid-project

You don't need to have started with this plugin. Composition is additive, so
installing into a project whose AI-DLC workflow is already underway changes
nothing else: from the next stage that asks clarifying questions — a
single-stage run (`/aidlc --stage <slug> --single`) included — the
interaction-mode menu offers **Grill me** as its fourth option, and every
question stage after that does the same.

After reinstalling or updating the AI-DLC engine, run `/aidlc plugin sync`
again: the update copies stock stage sources over the composed ones and the
fragments disappear. The installer's `--update` will not do this for you — its
provenance digest covers the projection's payload files and contributions,
none of which the engine update touches, so with the same source it correctly
ends with `Changed 0`. Only a change in the source fragments changes the
digest and triggers a recompose.

### Alternative: install through the host plugin store

Build the projection first, from `grilling/`: `bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . claude` (or `codex`).

In Claude Code, inside the target project:

```
/plugin marketplace add <workspace>/grilling/dist/claude
/plugin install aidlc-grilling@aidlc-plugins
```

With Codex CLI, inside the target project:

```sh
codex plugin marketplace add <workspace>/grilling/dist/codex
codex plugin add aidlc-grilling@aidlc-plugins   # approve the one-time hook trust prompt
```

On the next session start the plugin's SessionStart hook composes into `.claude/` (`.codex/` on Codex, where the hook fires lazily on the first interaction).

## Development

For development, clone the repository and install its dev dependencies:

```sh
git clone --recurse-submodules https://github.com/amadeus-dlc/aidlc-grilling-plugin.git
cd aidlc-grilling-plugin/grilling
bun install        # dev dependencies only — installs nothing into any project
```

Verify changes with the same steps CI runs:

```sh
bunx tsc --noEmit
bun scripts/sync-contributions.ts --check                   # the 28 contributions match tests/fragment-template.md
bun test                                                    # content, projections, compose, installer, release
bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts .
bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . claude   # → dist/claude/ ; CI builds all seven harnesses
bun ../aidlc-workflows/core/tools/aidlc-plugin-test.ts . --install ../grilling-sandbox --harness claude
                                # compose dry-run — verifies the merge without modifying the target
bun run test:live               # opt-in: a real Claude Code session through the Agent SDK
```

Releases are cut with `bun scripts/release.ts <version>`; the plugin README
describes the preflight and the CI tag check.

## Repository layout

| Path | Role |
|---|---|
| [`grilling/`](grilling/) | The plugin's authored source: manifest, contributions, fragment template, installer and release scripts, tests, decision record |
| [`aidlc-workflows/`](https://github.com/awslabs/aidlc-workflows) | Framework checkout (submodule, pinned to a tag) — supplies the validate/build/compose toolchain and the per-harness `dist/` installs the tests compose against; never edited here |
| `grilling-sandbox/` | Disposable AI-DLC install used as the compose-test and live-check target (`aidlc-plugin-test.ts --install`) — gitignored |
| [`docs/`](docs/) | The plan with its completion record, and the live-check records |
| `aidlc/`, `.claude/`, `.codex/` | This repository develops the plugin with AI-DLC itself: the workflow records and memory, and the harness shells |

## Documentation

- Plugin design — how the mode works, install, anchors, limits: [grilling/README.md](grilling/README.md)
- Design decisions and the selection-key check: [grilling/docs/decisions.md](grilling/docs/decisions.md)
- The plan and its completion record (Japanese): [docs/plugin-plan.md](docs/plugin-plan.md)
- Live-check records (Japanese): [docs/live-check-2026-09-03.md](docs/live-check-2026-09-03.md); later runs are added as `docs/live-check-<date>.md`
- Test suite: [grilling/tests/README.md](grilling/tests/README.md)

## Getting help

- Issues: <https://github.com/amadeus-dlc/aidlc-grilling-plugin/issues>

## License

MIT. See [LICENSE](LICENSE).
