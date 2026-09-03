# grilling — AIDLC plugin

English | [日本語](README.ja.md)

**Grill me** for [AI-DLC v2](https://github.com/awslabs/aidlc-workflows): a
fourth interaction mode for every stage's clarifying questions. Instead of a
batch (Guide me), a file hand-off (I'll edit the file), or free conversation
(Chat), the orchestrator interviews you **one question at a time**, each with a
recommended answer and its reasoning, and follows every branch your answers
open until you both share the same understanding. It is a contributions-only
plugin: no new stages, agents, scopes, sensors, or tools. Core is never
modified — disable the plugin and the vanilla workflow remains.

The procedure is the `/grilling` skill's, inlined into the stages so it works on
every harness without that skill being installed.

## What it adds

| Piece | File(s) | Purpose |
|---|---|---|
| 28 contributions | `contributions/<phase>/<slug>.md` | One per core stage that owns a `<slug>-questions.md`. Each splices the same prose fragment next to the stage's question step. Generated from the template below, never hand-edited. |
| Fragment template | `tests/fragment-template.md` | The single source of the fragment prose: the fourth option (label, description, rendering rules) and the **Step 3d** procedure. |
| Generator | `scripts/sync-contributions.ts` | Renders the 28 files from the template and its anchor table; `--check` exits non-zero on drift and names the files. |
| Tests | `tests/plugin.test.ts` | Validator, target set, template equality, anchor resolution, all seven projections, compose into Claude and Kiro installs (position, zero drops, idempotency), and the shipped compose-tier gate. |

## How the mode works

When a stage offers the interaction-mode choice (stage-protocol §3 Step 2), the
fragment adds a fourth option after the protocol's three:

- **Grill me** — Interview me one question at a time with a recommended answer; drill into every branch until we share the same understanding

Rendering stays with each harness's question-rendering annex; the fragment adds
the option and nothing else. In practice the four labels fill Claude Code's
`AskUserQuestion` with its built-in Other as the escape, and on the
numbered-prose harnesses (Kiro CLI, Kiro IDE, Cursor, opencode, Copilot, and the
Codex fallback) the annex's numbering invariant puts Other on line `5` after
Grill me.

Choosing it runs **Step 3d** — Guide me with a batch size of one, a recommended
answer on every question, and dependency-ordered follow-ups. The bookkeeping is
identical to Guide me:

1. Questions are ordered by dependency and presented one per turn; the
   recommended option is listed first with "(Recommended)".
2. Facts (existing code, prior artifacts, configuration) are looked up, not
   asked; only decisions go to the human.
3. Every question goes through the stage protocol's own logging pair and
   Question interaction log entry; the answer is written back to its
   `[Answer]:` tag with `**Mode:** grill` on the line beneath.
4. Follow-up questions are appended to the questions file with a blank
   `[Answer]:` tag before the turn ends, so the forwarding-loop Stop hook sees a
   pending human-wait.
5. When every tag is filled the stage rejoins Step 3a: consolidated summary,
   `aidlc-review-brief.ts summary`, and the Looks correct / Request changes
   checkpoint.

Mode switching mid-stage, the depth table, and the always-allowed follow-ups
are unchanged.

## Install

Build the projection for your harness (from this directory; the toolchain comes
from the sibling `aidlc-workflows` checkout):

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
enabled). `/aidlc --doctor` reports the merged state under **Composed plugin
surface**.

### Upgrade

An engine reinstall or upgrade copies stock stage sources over the composed
ones, so the merged fragments disappear. Run `/aidlc plugin sync` afterwards
(or start a new session on a harness with the compose hook). Composition is
idempotent: re-running it never duplicates a fragment.

### Live check

Start a workflow and reach `intent-capture`. The interaction-mode question
must show four options plus Other. Choose **Grill me**: questions arrive one
at a time with a recommended answer, the questions file and the audit shard
update after every answer, and the consolidated-summary confirmation appears
at the end. On a numbered-prose harness, confirm that Other is line `5`.

On Claude Code this check is automated: `bun run test:live` drives a real
session through the Claude Agent SDK and asserts on the `AskUserQuestion`
calls themselves (see `tests/README.md`). The recorded runs live in the
repository's `docs/`.

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
bun install                                   # dev deps only (bun types, tsc)
bun test                                      # content + projection + compose suites
bunx tsc --noEmit
bun scripts/sync-contributions.ts             # regenerate the 28 files after editing the template
bun scripts/sync-contributions.ts --check     # drift guard (also run by the tests)
bun ../aidlc-workflows/core/tools/aidlc-plugin-test.ts . --install ../grilling-sandbox --harness claude
bun run test:live                             # opt-in: drive a real Claude session through the Agent SDK (see tests/README.md)
```

The compose-tier command needs a disposable AI-DLC install to compose against; create
it from the checkout's shipped distribution (it is gitignored):

```bash
mkdir -p ../grilling-sandbox && cp -R ../aidlc-workflows/dist/claude/. ../grilling-sandbox/
```

To edit the fragment, change `tests/fragment-template.md` and run the
generator; editing a contribution directly is reverted by the next sync and
fails the drift test.

## Layout

```
grilling/
├── .aidlc-plugin/plugin.json          # manifest: contributes.overlays only
├── contributions/<phase>/<slug>.md    # 28 generated contributions
├── scripts/sync-contributions.ts      # generator + anchor table + --check
└── tests/
    ├── fragment-template.md           # the only hand-edited fragment prose
    ├── plugin.test.ts                 # content, projections, compose, shipped gate
    ├── live-claude.test.ts            # opt-in live Claude run through the Agent SDK
    └── harness/sdk-drive.ts           # SDK driver copied from aidlc-workflows (3 local changes)
```

## Limits

- This is a prompt-level addition. The stage protocol itself still lists three
  modes; the fragment states that Grill me is offered *in addition* to them.
- The fragment defines only the option and the interview procedure. How a
  question is rendered and how it is logged remain the core protocol's and the
  harness annexes' business; the fragment refers to them instead of restating
  commands or numbering.
- Claude Code's `AskUserQuestion` allows four options, so Grill me fills the
  last slot; a fifth mode cannot be added the same way.
- Grill me does not replace Chat: it is questions-file driven and logs every
  question, which Chat does not.
- `**Mode:** grill` is a marker for the record; no core tool validates the
  `Mode` value.
