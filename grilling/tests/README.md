# grilling tests

English | [日本語](README.ja.md)

Run with `bun install && bun test` from the plugin root. The sibling
`aidlc-workflows` checkout (this repository's submodule) supplies the
validator, the builder, the compose hook, the core stage sources, and the
per-harness `dist/` installs; set `AIDLC_WORKFLOWS_CHECKOUT` when it lives
elsewhere. No suite reaches the network. The two opt-in suites stay skipped
unless their environment variable is set.

- **`plugin.test.ts` — authored content** — `aidlc-plugin-validate.ts` is
  VALID; the manifest contributes `overlays` only; the contribution targets
  are exactly the core stages whose body mentions a `-questions.md` (both
  directions, phase included); every contribution equals the template
  rendered for its target and `sync-contributions.ts --check` agrees; every
  anchor resolves to a real `### Step N` heading in the core stage source;
  the template carries the label, the round-based description (and not the
  one-question-at-a-time description of 0.1.0), Step 3d, the fixed tokens
  the interview writes (`(Recommended)`, `**Mode:** grill`, `**Pending:**`,
  `Decided assumptions`, the tier tags, `❓` / `➡️`,
  `X. Other (please specify)`), the Depth table, the one-question-at-a-time
  switch, at most 150 lines, no sentinel look-alike, no nested fragment
  header, and balanced fences.
- **`plugin.test.ts` — harness projections** — `aidlc-plugin-build.ts`
  succeeds for all seven harnesses into a temp dir; each projection carries
  the 28 contributions byte-identical, the compose hook, and a host manifest
  named `aidlc-grilling`, and nothing under `stages/`, `agents/`, `scopes/`,
  `sensors/`, `tools/`, or `knowledge/`.
- **`plugin.test.ts` — compose** — for Claude and Kiro: a copy of the
  checkout's `dist/<harness>` install is composed with the real emitted
  `hooks/compose.ts`; every target stage carries exactly one
  sentinel-delimited block at its anchor (after the named step with no
  heading in between, or immediately before it), the block holds the
  template prose with `{{HARNESS_DIR}}` substituted, no `*.drops` file was
  written, and a second compose leaves every stage byte-identical.
- **`plugin.test.ts` — shipped gate** — `aidlc-plugin-test.ts . --install
  <temp Claude install> --harness claude` exits 0 (validate, build, compose,
  graph recompile, idempotency, drop scan).
- **`installer.test.ts`** — the pure pieces through the exported functions
  (selector exclusivity, stable-tag ordering, manifest validation, tar.gz
  safety against path traversal, absolute paths, and links, canonical payload
  hashing), then `bun scripts/install.ts` end to end against a disposable
  copy of the checkout's `dist/claude` with `--from <this repository's
  root>`: bad arguments and sources are rejected before the target is touched
  (combined selectors, `--update` with a selector or without provenance, an
  unknown harness, a missing project, a wrong manifest name, a project
  without the toolchain); `--dry-run` writes nothing; a real run composes the
  fragment into all 28 target stages and writes the five-field provenance
  atomically; a second run is `Changed 0` and byte-identical. `--tag`,
  `--ref`, and latest are deliberately not exercised.
- **`release.test.ts`** — git is a scripted runner that records every call,
  and the manifest a copy under mkdtemp: unstable, incomplete, and
  `v`-prefixed versions are rejected without running git; a non-`main`
  branch, a dirty tree, and an existing local or remote tag stop before any
  mutation; a release updates the manifest and calls `add → commit
  --allow-empty → tag → push --atomic origin main v<version>` in that order,
  stopping at the first failure; `--check-tag` accepts a matching
  `v<stable-semver>` and rejects a mismatch, a bare version, a pre-release,
  and a renamed manifest.
- **`live-claude.test.ts`** (opt-in with `AIDLC_CLAUDE_SDK_LIVE=1`, or
  `bun run test:live`) — composes the plugin into a disposable copy of
  `dist/claude`, switches the shipped Bedrock default off in that copy's
  `settings.local.json`, and drives `/aidlc --scope feature …` through the
  Claude Agent SDK with `harness/sdk-drive.ts` (copied from the framework's
  test harness; its header lists the local changes). The SDK's `canUseTool`
  receives the real `AskUserQuestion` calls, so the test asserts on the
  structured options: menu 1 is Guide me / I'll edit the file / Chat / Grill
  me with the description verbatim; after answering Grill me, menu 2 — the
  first round — carries two to four questions, each with its `(Recommended)`
  option first, and menu 3 at most four, again recommended first; the
  questions file holds a filled `[Answer]:` and `**Mode:** grill`, and the
  audit shard the 4-option `DECISION_RECORDED`, the `QUESTION_ANSWERED` for
  Grill me, and at least three `DECISION_RECORDED` events (one per screen).
  Whether the questions of one screen were really independent is not
  machine-checked: a person reads the printed menus and records the verdict
  in `docs/live-check-<date>.md`. Uses the developer's own Claude Code login
  (`CLAUDE_CONFIG_DIR` is forwarded) and the `sonnet` model unless
  `GRILLING_LIVE_MODEL` says otherwise; expect about five minutes and a few
  dollars per run. `AIDLC_KEEP_TEMP=1` keeps the workspace.
- **`select-plugins.test.ts`** (opt-in with `GRILLING_SELECT_KEY_CHECK=1`) —
  the selection-key check: builds the Claude projection, copies `dist/claude`
  twice, writes `plugins: ["aidlc", "grilling"]` into one copy's
  `tools/data/harness.json` and `["aidlc"]` into the other, and runs the real
  `hooks/compose.ts` against each. Selected: exit 0, all 28 stages carry the
  fragment exactly once, no drops, the key is kept. Excluded: exit 0, no
  stage carries it, and an advisory drop names the `select-plugins` fix. The
  summary is printed so the result can be copied into `docs/decisions.md`.

`fragment-template.md` is the only hand-edited source of the fragment prose;
it lives here because `tests/` is never composed into an install.
