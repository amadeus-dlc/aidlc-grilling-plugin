# grilling tests

English | [日本語](README.ja.md)

Run with `bun install && bun test` from the plugin root. Everything lives in
`plugin.test.ts`; the sibling `aidlc-workflows` checkout (this repository's
submodule) supplies the validator, the builder, the compose hook, the core
stage sources, and the per-harness `dist/` installs. Set
`AIDLC_WORKFLOWS_CHECKOUT` when it lives elsewhere.

- **Authored content** — `aidlc-plugin-validate.ts` is VALID; the manifest
  contributes `overlays` only; the contribution targets are exactly the core
  stages whose body mentions a `-questions.md` (both directions, phase
  included); every contribution equals the template rendered for its target
  and `sync-contributions.ts --check` agrees; every anchor resolves to a real
  `### Step N` heading in the core stage source; the template carries the
  label, the description, Step 3d, no sentinel look-alike, no nested fragment
  header, and balanced fences.
- **Harness projections** — `aidlc-plugin-build.ts` succeeds for all seven
  harnesses into a temp dir; each projection carries the 28 contributions
  byte-identical, the compose hook, and a host manifest named
  `aidlc-grilling`, and nothing under `stages/`, `agents/`, `scopes/`,
  `sensors/`, `tools/`, or `knowledge/`.
- **Compose** — for Claude and Kiro: a copy of the checkout's `dist/<harness>`
  install is composed with the real emitted `hooks/compose.ts`; every target
  stage carries exactly one sentinel-delimited block at its anchor (after the
  named step with no heading in between, or immediately before it), the block
  holds the template prose with `{{HARNESS_DIR}}` substituted, no `*.drops`
  file was written, and a second compose leaves every stage byte-identical.
- **Shipped gate** — `aidlc-plugin-test.ts . --install <temp Claude install>
  --harness claude` exits 0 (validate, build, compose, graph recompile,
  idempotency, drop scan).

`fragment-template.md` is the only hand-edited source of the fragment prose;
it lives here because `tests/` is never composed into an install.
