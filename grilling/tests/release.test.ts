// Release tool tests for the grilling plugin (BR9.1–BR9.5, BR10.9).
//
// Mirrors deep-spec-analysis/tests/release.test.ts. Git is a scripted runner
// that records every call, and the manifest is a copy under mkdtemp, so no
// real repository is read or written.
//
// Run: bun test tests/release.test.ts (from the plugin root)

import { afterEach, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertTagMatchesManifest,
  release,
  type GitResult,
  type GitRunner,
} from "../scripts/release";

const sandboxes: string[] = [];

function fixture(version = "0.1.0"): { repoRoot: string; manifestPath: string; original: string } {
  const repoRoot = mkdtempSync(join(tmpdir(), "grilling-release-"));
  sandboxes.push(repoRoot);
  const manifestPath = join(repoRoot, "grilling", ".aidlc-plugin", "plugin.json");
  mkdirSync(join(repoRoot, "grilling", ".aidlc-plugin"), { recursive: true });
  const original = `${JSON.stringify({ name: "grilling", version, description: "fixture" }, null, 2)}\n`;
  writeFileSync(manifestPath, original);
  return { repoRoot, manifestPath, original };
}

function result(status: number, stdout = "", stderr = ""): GitResult {
  return { status, stdout, stderr };
}

function scriptedRunner(overrides: Readonly<Record<string, GitResult>> = {}): {
  readonly calls: string[][];
  readonly runner: GitRunner;
} {
  const calls: string[][] = [];
  return {
    calls,
    runner: (args) => {
      const call = [...args];
      calls.push(call);
      const key = call.join(" ");
      if (overrides[key]) return overrides[key];
      if (key === "branch --show-current") return result(0, "main\n");
      if (key === "status --porcelain") return result(0);
      if (key.startsWith("show-ref ")) return result(1);
      if (key.startsWith("ls-remote ")) return result(2);
      return result(0);
    },
  };
}

function mutationCalls(calls: readonly string[][]): string[][] {
  return calls.filter(([command]) => ["add", "commit", "tag", "push"].includes(command));
}

afterEach(() => {
  if (process.env.AIDLC_KEEP_TEMP === "1") return;
  for (const sandbox of sandboxes.splice(0)) rmSync(sandbox, { recursive: true, force: true });
});

describe("release preflight", () => {
  test("rejects an unstable, incomplete, or v-prefixed version without running git or changing the manifest (BR9.1)", () => {
    const { repoRoot, manifestPath, original } = fixture();
    const { calls, runner } = scriptedRunner();

    expect(() => release("v1.0.0", { repoRoot, manifestPath, runGit: runner })).toThrow("without a v prefix");
    expect(() => release("1.0", { repoRoot, manifestPath, runGit: runner })).toThrow("stable Semantic Version");
    expect(() => release("1.0.0-rc1", { repoRoot, manifestPath, runGit: runner })).toThrow("stable Semantic Version");
    expect(() => release("01.0.0", { repoRoot, manifestPath, runGit: runner })).toThrow("stable Semantic Version");
    expect(calls).toEqual([]);
    expect(readFileSync(manifestPath, "utf-8")).toBe(original);
  });

  test("rejects a non-main branch before any mutation (BR9.2)", () => {
    const { repoRoot, manifestPath, original } = fixture();
    const { calls, runner } = scriptedRunner({ "branch --show-current": result(0, "feature/release\n") });

    expect(() => release("1.2.3", { repoRoot, manifestPath, runGit: runner })).toThrow("must run on main");
    expect(mutationCalls(calls)).toEqual([]);
    expect(readFileSync(manifestPath, "utf-8")).toBe(original);
  });

  test("rejects a dirty worktree before any mutation (BR9.2)", () => {
    const { repoRoot, manifestPath, original } = fixture();
    const { calls, runner } = scriptedRunner({ "status --porcelain": result(0, " M README.md\n") });

    expect(() => release("1.2.3", { repoRoot, manifestPath, runGit: runner })).toThrow("clean working tree");
    expect(mutationCalls(calls)).toEqual([]);
    expect(readFileSync(manifestPath, "utf-8")).toBe(original);
  });

  test("rejects an existing local or remote tag before any mutation (BR9.2)", () => {
    const local = fixture();
    const localTag = "show-ref --verify --quiet refs/tags/v1.2.3";
    const localRun = scriptedRunner({ [localTag]: result(0) });
    expect(() => release("1.2.3", { repoRoot: local.repoRoot, manifestPath: local.manifestPath, runGit: localRun.runner }))
      .toThrow("local tag v1.2.3 already exists");
    expect(mutationCalls(localRun.calls)).toEqual([]);
    expect(readFileSync(local.manifestPath, "utf-8")).toBe(local.original);

    const remote = fixture();
    const remoteTag = "ls-remote --exit-code --tags origin refs/tags/v1.2.3";
    const remoteRun = scriptedRunner({ [remoteTag]: result(0, "deadbeef\trefs/tags/v1.2.3\n") });
    expect(() => release("1.2.3", { repoRoot: remote.repoRoot, manifestPath: remote.manifestPath, runGit: remoteRun.runner }))
      .toThrow("remote tag v1.2.3 already exists");
    expect(mutationCalls(remoteRun.calls)).toEqual([]);
    expect(readFileSync(remote.manifestPath, "utf-8")).toBe(remote.original);
  });
});

describe("release mutation", () => {
  test("updates the manifest, commits in English, tags, and atomically pushes main plus the tag (BR9.3)", () => {
    const { repoRoot, manifestPath } = fixture();
    const { calls, runner } = scriptedRunner();

    release("1.2.3", { repoRoot, manifestPath, runGit: runner });

    expect(JSON.parse(readFileSync(manifestPath, "utf-8"))).toEqual({
      name: "grilling",
      version: "1.2.3",
      description: "fixture",
    });
    expect(mutationCalls(calls)).toEqual([
      ["add", "--", "grilling/.aidlc-plugin/plugin.json"],
      ["commit", "--allow-empty", "-m", "chore(release): publish v1.2.3"],
      ["tag", "v1.2.3"],
      ["push", "--atomic", "origin", "main", "v1.2.3"],
    ]);
  });

  test("stops at the first failing mutation and creates the release commit even without a content delta", () => {
    const baseline = fixture("0.1.0");
    const baselineRun = scriptedRunner();
    release("0.1.0", { repoRoot: baseline.repoRoot, manifestPath: baseline.manifestPath, runGit: baselineRun.runner });
    expect(mutationCalls(baselineRun.calls)).toContainEqual([
      "commit", "--allow-empty", "-m", "chore(release): publish v0.1.0",
    ]);
    expect(mutationCalls(baselineRun.calls).at(-1)).toEqual([
      "push", "--atomic", "origin", "main", "v0.1.0",
    ]);

    const failing = fixture();
    const failingRun = scriptedRunner({ "tag v1.2.3": result(128, "", "fatal: tag 'v1.2.3' already exists") });
    expect(() => release("1.2.3", { repoRoot: failing.repoRoot, manifestPath: failing.manifestPath, runGit: failingRun.runner }))
      .toThrow("git tag v1.2.3 failed: fatal: tag 'v1.2.3' already exists");
    expect(mutationCalls(failingRun.calls).map(([command]) => command)).toEqual(["add", "commit", "tag"]);
  });
});

describe("release tag consistency", () => {
  test("accepts a release tag matching the manifest (BR9.4)", () => {
    const { manifestPath } = fixture("1.2.3");
    expect(() => assertTagMatchesManifest("v1.2.3", manifestPath)).not.toThrow();
  });

  test("rejects a release tag that differs from the manifest or is not v<stable-semver> (BR9.4)", () => {
    const { manifestPath } = fixture("1.2.3");
    expect(() => assertTagMatchesManifest("v1.2.4", manifestPath)).toThrow(
      "release tag v1.2.4 does not match plugin manifest version 1.2.3",
    );
    expect(() => assertTagMatchesManifest("1.2.3", manifestPath)).toThrow("must be v<stable-semver>");
    expect(() => assertTagMatchesManifest("v1.2.3-rc.1", manifestPath)).toThrow("must be v<stable-semver>");
    const { manifestPath: renamed } = fixture("1.2.3");
    writeFileSync(renamed, `${JSON.stringify({ name: "deep-spec-analysis", version: "1.2.3" })}\n`);
    expect(() => assertTagMatchesManifest("v1.2.3", renamed)).toThrow("plugin manifest name must be grilling");
  });
});
