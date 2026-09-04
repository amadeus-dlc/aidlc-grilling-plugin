# grilling — AIDLC plugin

English | [日本語](README.ja.md)

**Grill me** for [AI-DLC v2](https://github.com/awslabs/aidlc-workflows): a
fourth interaction mode for every stage's clarifying questions. Instead of a
batch (Guide me), a file hand-off (I'll edit the file), or free conversation
(Chat), the orchestrator interviews you in **rounds of independent questions**,
each with a recommended answer and its reasoning, decides the small things
itself as recorded assumptions, and follows every branch your answers open
until you both share the same understanding. It is a contributions-only
plugin: no new stages, agents, scopes, sensors, or tools. Core is never
modified — disable the plugin and the vanilla workflow remains.

The procedure is Matt Pocock's [`grilling`](https://github.com/mattpocock/skills)
skill in its current, round-based version, inlined into the stages so it works
on every harness without that skill being installed, and mapped onto AI-DLC's
questions file, audit log, and Depth setting.

## What it adds

| Piece | File(s) | Purpose |
|---|---|---|
| 28 contributions | `contributions/<phase>/<slug>.md` | One per core stage that owns a `<slug>-questions.md`. Each splices the same prose fragment next to the stage's question step. Generated from the template below, never hand-edited. |
| Fragment template | `tests/fragment-template.md` | The single source of the fragment prose: the fourth option (label, description) and the **Step 3d** interview procedure — rounds, decision tiers and the Depth table, decided assumptions, the ledger, rendering, fact lookups, finishing, and the one-question-at-a-time switch. |
| Generator | `scripts/sync-contributions.ts` | Renders the 28 files from the template and its anchor table; `--check` exits non-zero on drift and names the files. |
| Installer | `scripts/install.ts` | One-command install into an AI-DLC project: fetch a tag, a branch, or a local checkout; build the harness projection; compose; record provenance. See [Install](#install). |
| Release tool | `scripts/release.ts` | `release.ts <version>` bumps the manifest, commits, tags, and pushes atomically after a preflight; `--check-tag <tag>` is the CI guard on tag pushes. See [Release](#release). |
| Tests | `tests/plugin.test.ts`, `tests/installer.test.ts`, `tests/release.test.ts`, `tests/live-claude.test.ts` (opt-in), `tests/select-plugins.test.ts` (opt-in) | Content, projections, compose, the shipped gate, the installer end to end, the release preflight and mutation order, a live Claude Code run, and the selection-key check. See [tests/README.md](tests/README.md). |
| Decision record | `docs/decisions.md` | Why the plugin has this shape, and the measured selection-key check. |

## How the mode works

When a stage offers the interaction-mode choice (stage-protocol §3 Step 2), the
fragment adds a fourth option after the protocol's three:

- **Grill me** — Interview me in rounds of independent questions, each with a recommended answer; drill into every branch until we share the same understanding

Rendering stays with each harness's question-rendering annex; the fragment adds
the option and nothing else. In practice the four labels fill Claude Code's
`AskUserQuestion` with its built-in Other as the escape, and on the
numbered-prose harnesses (Kiro CLI, Kiro IDE, Cursor, opencode, Copilot, and the
Codex fallback) the annex's numbering invariant puts Other on line `5` after
Grill me.

Choosing it runs **Step 3d** — Guide me run as an interview over a design tree.
Everything the protocol prescribes for Guide me applies unchanged: structured
questions rendered per the annex, the §3 decision / answer log pair around
every screen, and the questions file as the source of truth. What differs:

1. **The design tree and the frontier.** The stage's drafted questions become
   decisions in a tree, each with its prerequisites and its size (below);
   decisions an answer reveals are added as the interview goes. The frontier is
   every decision whose prerequisites are settled, and each **round** asks the
   whole frontier. The questions of a round are independent of each other — a
   question whose answer depends on another question still open belongs to a
   later round. After every answer the tree is updated and the frontier
   recomputed. There is no cap on the number of questions; the size of the
   decisions limits the interview.
2. **Decision size and Depth.** Every decision is sized by two questions —
   *reach* (if this flipped later, what else would change?) and *undo* (how
   hard is it to reverse?) — into one of five tiers, each defined in the
   fragment with a judgment question, an example, and a counter-example:
   **XL** changes the shape of the solution, **L** a component's responsibility
   or a contract between components, **M** user-visible behaviour inside one
   component, **S** a local choice such as a default or a name, **SS** a choice
   the user never sees. When two tiers fit, the larger wins. `**Depth**` in
   `aidlc-state.md` sets the smallest tier the human is asked about:

   | Depth | Ask the human | Decide yourself, as a decided assumption |
   |---|---|---|
   | Minimal | XL, L | M, S, SS |
   | Standard | XL, L, M | S, SS |
   | Comprehensive | XL, L, M, S | SS |

3. **Decided assumptions.** A decision below the threshold is decided with the
   answer the agent would have recommended and written down, never silently:
   right after that round's questions in the questions file, under a heading
   in the conversation language (in English `### Decided assumptions (round
   <n>)`), one line per decision — `- [<tier>] <decision> — <reason>`.
4. **The ledger.** Before a round is presented it is appended to the questions
   file: a round heading, then each question with a number in one sequence
   across the file, a title, one line of context, its options (the last one
   `X. Other (please specify)`), the recommended option with its reason, and a
   blank `[Answer]:` tag. Each answer is written back as soon as it arrives —
   the option letter (or the free text for Other) in the `[Answer]:` tag and
   `**Mode:** grill` on its own line beneath it — before the next screen, and
   every screen gets its §3 decision / answer pair with a fresh timestamp.
5. **Rendering.** On Claude Code the recommended option is listed first with
   " (Recommended)" appended — for the screen only; the file keeps its option
   order and letters. One screen holds at most four questions, so a round of
   five or more is split into screens of four, each written back and logged
   before the next; the frontier is not recomputed between the screens of one
   round. On a harness that renders questions as numbered prose the whole
   round is one message in the upstream format — `❓ **Q<n>** - **<title>**:
   <body and options>` / `➡️ <recommended answer and reason>`, questions
   separated by `---` — with the option order unchanged; the user answers by
   number, e.g. `1 A, 2 B`.
6. **Facts are looked up, not asked.** File contents, configuration, prior
   stage artifacts, the reference implementation: a sub-agent finds them where
   the harness offers one, otherwise the orchestrator looks them up itself. A
   running lookup holds back only the decisions that depend on it; the rest of
   the frontier is asked now. A question waiting on a lookup is appended at
   once with a blank `[Answer]:` and `**Pending:** <what is being looked up>`
   beneath it; if the result settles it, the tag gets `Resolved by lookup
   (round <n>)` and the decision goes into that round's decided assumptions.
7. **Finishing: shared understanding first.** The interview ends when the
   frontier is empty. The stage then rejoins Step 3a: the consolidated summary
   lists every answer and, after them, every decided assumption in round order
   — that is the bulk confirmation — followed by the review brief and the
   Looks correct / Request changes checkpoint. No artifact is generated before
   that confirmation. On Request changes an objected assumption is promoted to
   a question in the next round, and an objection to an answered question
   reopens that branch; the rounds continue and the summary returns when the
   frontier empties again. Only when the user says the interview has gone far
   enough does it stop early, recording the remaining decisions as decided
   assumptions with their tiers.
8. **One question at a time.** If `## Corrections` in
   `aidlc/spaces/<active-space>/memory/project.md` carries a line saying that
   Grill me should ask one question at a time — judged by meaning, in any
   language — or the user asks for it during the interview, each screen holds
   a single question. The frontier, the ledger, and the decided assumptions do
   not change. A request made in conversation applies to the rest of the
   stage; persisting it is left to the §13 learnings ritual.

Mode switching mid-stage and the always-allowed follow-ups are unchanged.

## Install

The recommended path is the installer, which fetches a tagged release, builds
the projection for your harness, composes it, and records provenance:

```sh
VERSION=v0.2.0
curl -fsSL "https://raw.githubusercontent.com/amadeus-dlc/aidlc-grilling-plugin/${VERSION}/grilling/scripts/install.ts" |
  bun - --project <your-aidlc-project> --tag "${VERSION}"   # --harness codex, kiro, … (default: claude)
```

`--from <repo-root>` builds from a local checkout (the repository root that
contains `grilling/`), `--ref <branch>` follows a branch, no selector resolves
the latest stable tag, `--update` reuses the recorded selector, and `--dry-run`
rehearses the compose without writing to the project. The full option table
and the provenance record (`<harness>/tools/data/grilling-install.json`) are in
the [root README](../README.md). Store harnesses (Claude Code, Codex, Copilot,
opencode) compose straight from the built `dist/`; storeless harnesses (Kiro,
Kiro IDE, Cursor) get the projection folder-dropped into the project first.
There is no trust gate on this path — point it only at a build you would run
code from.

To install through a host plugin store instead, build the projection for your
harness (from this directory; the toolchain comes from the sibling
`aidlc-workflows` checkout):

```bash
bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts .
bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . claude     # → dist/claude/ ; repeat per harness
```

| Harness | Install |
|---|---|
| Claude Code | `/plugin marketplace add <repo>/grilling/dist/claude` → `/plugin install aidlc-grilling@aidlc-plugins`. The SessionStart hook composes on the next session. |
| Codex CLI | `codex plugin marketplace add <repo>/grilling/dist/codex` → `codex plugin add aidlc-grilling@aidlc-plugins` (approve the hook trust once; the hook composes on the first interaction). |
| Kiro CLI | Folder-drop `dist/kiro/.` into the project, then `AIDLC_PLUGIN_ROOT=<…>/dist/kiro AIDLC_PROJECT_DIR=<project> AIDLC_HARNESS_DIR=.kiro aidlc plugin sync` (or `bun <…>/dist/kiro/hooks/compose.ts` when `aidlc` is not on PATH). |
| Kiro IDE / Cursor / opencode / Copilot | Folder-drop (or the host store where one exists) → the SessionStart hook composes; otherwise `/aidlc plugin sync`. |

Contributions merge only for **enabled** plugins. Check with `/aidlc plugin list`;
when the selection is narrowed, add this plugin with
`/aidlc plugin select aidlc,grilling` (no `plugins` key means every plugin is
enabled; the measured behaviour with a selection key is in
[docs/decisions.md](docs/decisions.md)). `/aidlc --doctor` reports the merged
state under **Composed plugin surface**.

### Upgrade

An engine reinstall or upgrade copies stock stage sources over the composed
ones, so the merged fragments disappear. Run `/aidlc plugin sync` afterwards
(or start a new session on a harness with the compose hook). The installer's
`--update` does not do this for you: its provenance digest covers the
projection's payload files and contributions, none of which the engine update
touches, so with the same source it ends with `Changed 0`. A source whose
fragments changed does change the digest, and the next installer run
recomposes it. Composition is idempotent: re-running it never duplicates a
fragment.

### Live check

Start a workflow and reach `intent-capture`. The interaction-mode question
must show four options plus Other. Choose **Grill me**: the first screen
carries two to four independent questions, each with its recommended option
first and marked `(Recommended)`; the questions file gains a round heading,
the questions, and — where the Depth threshold left decisions to the agent —
a decided-assumptions section; every answer is written back with
`**Mode:** grill` and the audit shard records each screen; and the
consolidated summary at the end lists the answers and the decided assumptions
before the Looks correct / Request changes checkpoint. On a numbered-prose
harness, confirm that Other is line `5` and that the round arrives as one
❓ / ➡️ message.

On Claude Code this check is automated: `bun run test:live` drives a real
session through the Claude Agent SDK and asserts on the `AskUserQuestion`
calls themselves (see [tests/README.md](tests/README.md)). The recorded runs
live in the repository's `docs/` as `live-check-<date>.md`.

## Anchors

Each contribution splices the fragment right after the step that generates
the stage's questions, or right before the step that collects the answers.
`after-questions` is not implemented by compose, so it is not used. The table
is the `TARGETS` constant in `scripts/sync-contributions.ts`; the tests assert
that every anchor resolves to a real `### Step N` heading in core.

| Phase | Stage | Anchor |
|---|---|---|
| ideation | approval-handoff, feasibility, intent-capture, market-research, rough-mockups, scope-definition, team-formation | `after-step:2` |
| inception | delivery-planning, refined-mockups | `after-step:2` |
| inception | contract-design, domain-design, units-generation | `before-step:3` |
| inception | practices-discovery | `after-step:4` |
| inception | requirements-analysis | `after-step:6` |
| inception | user-stories | `before-step:5` |
| construction | ci-pipeline | `after-step:2` |
| construction | code-generation | `after-step:3` (its questions file is created in Step 3, Plan Approval) |
| construction | functional-design, infrastructure-design, nfr-design | `before-step:3` |
| construction | nfr-requirements | `before-step:4` |
| operation | deployment-execution, deployment-pipeline, environment-provisioning, feedback-optimization, incident-response, observability-setup, performance-validation | `after-step:2` |

All 28 fragments share `order: 100`; `(plugin, anchor, order)` is unique per
target, so nothing collides.

## Development

```bash
bun install                                   # dev deps only (bun types, tsc, Agent SDK)
bunx tsc --noEmit
bun scripts/sync-contributions.ts             # regenerate the 28 files after editing the template
bun scripts/sync-contributions.ts --check     # drift guard (also run by CI and the tests)
bun test                                      # content + projection + compose + installer + release suites
bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts .
bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . claude   # repeat per harness; CI builds all seven
bun ../aidlc-workflows/core/tools/aidlc-plugin-test.ts . --install ../grilling-sandbox --harness claude
bun scripts/install.ts --project ../grilling-sandbox --from ..     # the installer against the sandbox, from this checkout
bun run test:live                             # opt-in: drive a real Claude session through the Agent SDK (see tests/README.md)
GRILLING_SELECT_KEY_CHECK=1 bun test tests/select-plugins.test.ts   # opt-in: compose into installs that carry a plugins selection key
```

The compose-tier command and the installer need a disposable AI-DLC install to
compose against; create it from the checkout's shipped distribution (it is
gitignored):

```bash
mkdir -p ../grilling-sandbox && cp -R ../aidlc-workflows/dist/claude/. ../grilling-sandbox/
```

To edit the fragment, change `tests/fragment-template.md` and run the
generator; editing a contribution directly is reverted by the next sync and
fails the drift test.

### Release

```bash
bun scripts/release.ts 0.2.0                 # preflight, then manifest → commit → tag → atomic push
bun scripts/release.ts --check-tag v0.2.0    # what CI runs on a tag push
```

`release.ts <version>` accepts a stable Semantic Version only (no `v` prefix,
no pre-release). Its preflight requires the `main` branch, a clean working
tree, and a `v<version>` tag that exists neither locally nor on `origin`;
nothing is modified until every check passes. It then writes the version into
`.aidlc-plugin/plugin.json`, commits `chore(release): publish v<version>`,
tags, and runs `git push --atomic origin main v<version>`, stopping at the
first failure. CI runs `--check-tag` on every `v*` tag push and fails when the
tag and the manifest version differ.

## Layout

```
grilling/
├── .aidlc-plugin/plugin.json          # manifest: contributes.overlays only
├── contributions/<phase>/<slug>.md    # 28 generated contributions
├── docs/decisions.md                  # design decisions and the selection-key check (+ decisions.ja.md)
├── scripts/
│   ├── sync-contributions.ts          # generator + anchor table + --check
│   ├── install.ts                     # one-command installer
│   └── release.ts                     # version bump + tag + atomic push; --check-tag for CI
└── tests/
    ├── fragment-template.md           # the only hand-edited fragment prose
    ├── plugin.test.ts                 # content, projections, compose, shipped gate
    ├── installer.test.ts              # install.ts against a disposable Claude install
    ├── release.test.ts                # release.ts with an injected git
    ├── live-claude.test.ts            # opt-in: live Claude run through the Agent SDK
    ├── select-plugins.test.ts         # opt-in: the plugins selection key (NG1)
    └── harness/sdk-drive.ts           # SDK driver copied from aidlc-workflows (local changes listed in its header)
```

## Limits

- This is a prompt-level addition. The stage protocol itself still lists three
  modes; the fragment states that Grill me is offered *in addition* to them.
- The fragment defines only the option and the interview procedure. How a
  question is rendered and how it is logged remain the core protocol's and the
  harness annexes' business; the fragment refers to them instead of restating
  commands or numbering.
- Claude Code's `AskUserQuestion` allows four options per question and four
  questions per screen, so Grill me fills the last mode slot and a round of
  five or more questions is split across screens; a fifth mode cannot be added
  the same way.
- The frontier is a judgment, not a computation. Two questions that turn out
  to depend on each other can land in the same round; the remedy is to say so,
  and the affected branch is asked again in the next round.
- Rounds are the default. One question at a time is a switch — a
  `## Corrections` line in the space's `project.md`, or a request during the
  interview — not a separate mode.
- Grill me does not replace Chat: it is questions-file driven and logs every
  screen, which Chat does not.
- `**Mode:** grill`, `**Pending:**`, and the tier tags are markers for the
  record; no core tool validates them.
- Verification so far is Claude Code only; see decision 5 in
  [docs/decisions.md](docs/decisions.md).
