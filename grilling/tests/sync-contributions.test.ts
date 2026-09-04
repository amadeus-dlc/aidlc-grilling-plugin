// Tests for the contribution generator (BR: contributions match the template).
//
// The 28 contribution files are generated, never hand-edited, and CI fails on
// drift. plugin.test.ts already checks the checkout's files against
// renderContribution; this file drives `sync` and its command line against a
// sandbox plugin root, so the writing half — creating, rewriting, and removing
// files — is exercised without touching the checkout.
//
// Run: bun test tests/sync-contributions.test.ts (from the plugin root)

import { afterEach, describe, expect, test } from "bun:test";
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  TARGETS,
  contributionPath,
  main,
  pluginRoot,
  renderContribution,
  sync,
  templatePath,
} from "../scripts/sync-contributions.ts";

const sandboxes: string[] = [];

afterEach(() => {
  for (const dir of sandboxes.splice(0)) rmSync(dir, { recursive: true, force: true });
});

/** A plugin root holding only the fragment template — no contributions yet. */
function sandboxRoot(): string {
  const root = mkdtempSync(join(tmpdir(), "grilling-sync-"));
  sandboxes.push(root);
  mkdirSync(join(root, "tests"), { recursive: true });
  copyFileSync(templatePath, join(root, "tests", "fragment-template.md"));
  return root;
}

describe("sync-contributions — drift detection", () => {
  test("the checkout's own contributions are in sync", () => {
    expect(sync({ check: true }).drift).toEqual([]);
  });

  test("every target is reported missing when nothing has been generated", () => {
    const root = sandboxRoot();
    const { drift } = sync({ check: true, root });
    expect(drift).toHaveLength(TARGETS.length);
    expect(drift.every((line) => line.startsWith("missing: contributions/"))).toBe(true);
    // check mode is read-only: it names the drift and writes nothing.
    expect(existsSync(join(root, "contributions"))).toBe(false);
  });

  test("a hand-edited file is reported as changed, and an unknown one as extra", () => {
    const root = sandboxRoot();
    sync({ check: false, root });

    const target = TARGETS[0] as (typeof TARGETS)[number];
    const edited = contributionPath(target, join(root, "contributions"));
    writeFileSync(edited, "hand-edited\n");
    const stray = join(root, "contributions", target.phase, "not-a-target.md");
    writeFileSync(stray, "stray\n");

    const { drift } = sync({ check: true, root });
    expect(drift).toContain(`changed: contributions/${target.phase}/${target.slug}.md`);
    expect(drift).toContain(`extra: contributions/${target.phase}/not-a-target.md`);
    expect(readFileSync(edited, "utf-8")).toBe("hand-edited\n");
    expect(existsSync(stray)).toBe(true);
  });
});

describe("sync-contributions — writing", () => {
  test("generates every target from the template, then reports no drift", () => {
    const root = sandboxRoot();
    const first = sync({ check: false, root });
    expect(first.drift).toHaveLength(TARGETS.length);

    const template = readFileSync(templatePath, "utf-8");
    for (const target of TARGETS) {
      const path = contributionPath(target, join(root, "contributions"));
      expect(readFileSync(path, "utf-8")).toBe(renderContribution(target, template));
    }
    expect(sync({ check: true, root }).drift).toEqual([]);
    expect(sync({ check: false, root }).drift).toEqual([]);
  });

  test("restores a hand-edited file and deletes one that belongs to no target", () => {
    const root = sandboxRoot();
    sync({ check: false, root });

    const target = TARGETS[0] as (typeof TARGETS)[number];
    const path = contributionPath(target, join(root, "contributions"));
    writeFileSync(path, "hand-edited\n");
    const stray = join(root, "contributions", target.phase, "not-a-target.md");
    writeFileSync(stray, "stray\n");

    const { drift } = sync({ check: false, root });
    expect(drift).toEqual([
      `changed: contributions/${target.phase}/${target.slug}.md`,
      `extra: contributions/${target.phase}/not-a-target.md`,
    ]);
    expect(readFileSync(path, "utf-8")).toBe(renderContribution(target, readFileSync(templatePath, "utf-8")));
    expect(existsSync(stray)).toBe(false);
  });
});

describe("sync-contributions — command line", () => {
  function cli(argv: readonly string[], root: string) {
    const out: string[] = [];
    const err: string[] = [];
    const code = main(argv, { root, log: (line) => out.push(line), error: (line) => err.push(line) });
    return { code, out, err };
  }

  test("--check names the drift and exits non-zero, then passes once generated", () => {
    const root = sandboxRoot();

    const drifted = cli(["--check"], root);
    expect(drifted.code).toBe(1);
    expect(drifted.err[0]).toContain("drift detected");
    expect(drifted.err).toHaveLength(TARGETS.length + 1);

    cli([], root);
    const clean = cli(["--check"], root);
    expect(clean.code).toBe(0);
    expect(clean.out.join("\n")).toContain(`${TARGETS.length} contributions match the template`);
    expect(clean.err).toEqual([]);
  });

  test("a sync that throws is reported as an error, not raised past the caller", () => {
    // A plugin root with no fragment template: sync cannot read its source.
    const empty = mkdtempSync(join(tmpdir(), "grilling-sync-empty-"));
    sandboxes.push(empty);
    const failed = cli(["--check"], empty);
    expect(failed.code).toBe(1);
    expect(failed.err.join("\n")).toContain("sync-contributions:");
    expect(failed.out).toEqual([]);
  });

  test("without --check it writes and reports what changed", () => {
    const root = sandboxRoot();
    const written = cli([], root);
    expect(written.code).toBe(0);
    expect(written.out[0]).toBe(`sync-contributions: ${TARGETS.length} contributions written (${TARGETS.length} changed)`);
    expect(written.out).toHaveLength(TARGETS.length + 1);
  });
});

describe("sync-contributions — paths", () => {
  test("contributionPath defaults to the checkout and accepts another root", () => {
    const target = TARGETS[0] as (typeof TARGETS)[number];
    expect(contributionPath(target)).toBe(join(pluginRoot, "contributions", target.phase, `${target.slug}.md`));
    expect(contributionPath(target, "/elsewhere")).toBe(join("/elsewhere", target.phase, `${target.slug}.md`));
  });
});
