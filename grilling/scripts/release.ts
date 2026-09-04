#!/usr/bin/env bun
// release.ts — publish one stable version of the grilling plugin.
//
// Mirrors deep-spec-analysis/scripts/release.ts (ADR-002): preflight (stable
// SemVer, on main, clean worktree, tag unused locally and on origin), then
// update the manifest, commit, tag, and push main plus the tag atomically.
// Git is injected so the tests never touch a real repository (BR9.5).
//
// Usage: bun grilling/scripts/release.ts <version>
//        bun grilling/scripts/release.ts --check-tag <tag>

import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const PLUGIN_NAME = "grilling";
const STABLE_SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const USAGE = "Usage: bun grilling/scripts/release.ts <version>";

interface PluginManifest {
  readonly name?: unknown;
  readonly version?: unknown;
  readonly [key: string]: unknown;
}

export interface GitResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: Error;
}

export type GitRunner = (args: readonly string[], cwd: string) => GitResult;

export interface ReleaseOptions {
  readonly repoRoot?: string;
  readonly manifestPath?: string;
  readonly runGit?: GitRunner;
}

/** The real spawn. Exported so its mapping of spawnSync's result — including a
 *  git that cannot be started — is covered without a subprocess in the way. */
export function defaultGitRunner(args: readonly string[], cwd: string): GitResult {
  const result = spawnSync("git", args, { cwd, encoding: "utf-8" });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error,
  };
}

function readManifest(manifestPath: string): PluginManifest {
  let manifest: PluginManifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, "utf-8")) as PluginManifest;
  } catch (error) {
    throw new Error(`cannot read plugin manifest ${manifestPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (manifest.name !== PLUGIN_NAME) {
    throw new Error(`plugin manifest name must be ${PLUGIN_NAME}`);
  }
  if (typeof manifest.version !== "string" || !STABLE_SEMVER.test(manifest.version)) {
    throw new Error("plugin manifest version must be a stable Semantic Version");
  }
  return manifest;
}

function runRequiredGit(runGit: GitRunner, repoRoot: string, args: readonly string[]): GitResult {
  const result = runGit(args, repoRoot);
  if (result.error) throw new Error(`git ${args.join(" ")} failed: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim() || `status ${result.status}`;
    throw new Error(`git ${args.join(" ")} failed: ${detail}`);
  }
  return result;
}

function assertUnusedLocalTag(runGit: GitRunner, repoRoot: string, tag: string): void {
  const result = runGit(["show-ref", "--verify", "--quiet", `refs/tags/${tag}`], repoRoot);
  if (result.error) throw new Error(`cannot inspect local tag ${tag}: ${result.error.message}`);
  if (result.status === 0) throw new Error(`local tag ${tag} already exists`);
  if (result.status !== 1) {
    throw new Error(`cannot inspect local tag ${tag}: ${result.stderr.trim() || `status ${result.status}`}`);
  }
}

function assertUnusedRemoteTag(runGit: GitRunner, repoRoot: string, tag: string): void {
  const result = runGit(["ls-remote", "--exit-code", "--tags", "origin", `refs/tags/${tag}`], repoRoot);
  if (result.error) throw new Error(`cannot inspect remote tag ${tag}: ${result.error.message}`);
  if (result.status === 0) throw new Error(`remote tag ${tag} already exists`);
  if (result.status !== 2) {
    throw new Error(`cannot inspect remote tag ${tag}: ${result.stderr.trim() || `status ${result.status}`}`);
  }
}

// BR9.4: the CI tag check — `v<stable semver>` equal to the manifest version.
export function assertTagMatchesManifest(tag: string, manifestPath: string): void {
  if (!tag.startsWith("v") || !STABLE_SEMVER.test(tag.slice(1))) {
    throw new Error(`release tag must be v<stable-semver>, got ${JSON.stringify(tag)}`);
  }
  const manifest = readManifest(manifestPath);
  if (manifest.version !== tag.slice(1)) {
    throw new Error(`release tag ${tag} does not match plugin manifest version ${String(manifest.version)}`);
  }
}

export function release(version: string, options: ReleaseOptions = {}): void {
  // BR9.1: exactly one stable SemVer, no v prefix, no pre-release.
  if (!STABLE_SEMVER.test(version)) {
    throw new Error(`version must be a stable Semantic Version without a v prefix, got ${JSON.stringify(version)}`);
  }

  // This script lives at <repo-root>/grilling/scripts/, and the manifest at
  // <repo-root>/grilling/.aidlc-plugin/plugin.json.
  const repoRoot = resolve(options.repoRoot ?? resolve(import.meta.dir, "../.."));
  const manifestPath = resolve(options.manifestPath ?? resolve(repoRoot, "grilling/.aidlc-plugin/plugin.json"));
  const runGit = options.runGit ?? defaultGitRunner;
  const tag = `v${version}`;

  // BR9.2: preflight is deliberately complete before the manifest, index,
  // refs, or remote are mutated. A failed release can therefore be retried
  // safely.
  const manifest = readManifest(manifestPath);
  const branch = runRequiredGit(runGit, repoRoot, ["branch", "--show-current"]).stdout.trim();
  if (branch !== "main") throw new Error(`release must run on main, current branch is ${branch || "detached HEAD"}`);

  const status = runRequiredGit(runGit, repoRoot, ["status", "--porcelain"]).stdout;
  if (status.trim()) throw new Error("release requires a clean working tree");

  assertUnusedLocalTag(runGit, repoRoot, tag);
  assertUnusedRemoteTag(runGit, repoRoot, tag);

  // BR9.3: manifest → commit → tag → atomic push, stopping at the first failure.
  writeFileSync(manifestPath, `${JSON.stringify({ ...manifest, version }, null, 2)}\n`);
  const manifestRelativePath = relative(repoRoot, manifestPath);
  runRequiredGit(runGit, repoRoot, ["add", "--", manifestRelativePath]);
  // A release may tag the version already present in the manifest (the first
  // public baseline does). Keep the release transaction uniform by allowing
  // that case to create its explicit release commit without a content delta.
  runRequiredGit(runGit, repoRoot, ["commit", "--allow-empty", "-m", `chore(release): publish ${tag}`]);
  runRequiredGit(runGit, repoRoot, ["tag", tag]);
  runRequiredGit(runGit, repoRoot, ["push", "--atomic", "origin", "main", tag]);
}

export interface MainDeps {
  readonly log?: (line: string) => void;
  readonly error?: (line: string) => void;
  readonly manifestPath?: string;
  readonly checkTag?: (tag: string, manifestPath: string) => void;
  readonly publish?: (version: string) => void;
}

/** The command line, as a function: dispatch, print, and return the exit code.
 *  `import.meta.main` only forwards it to `process.exit`, so every branch a
 *  user can reach — the tag check, a release, help, a malformed invocation —
 *  is reachable from a test as well, with the two effectful calls injected. */
export function main(argv: readonly string[], deps: MainDeps = {}): 0 | 1 {
  const log = deps.log ?? ((line: string) => console.log(line));
  const fail = deps.error ?? ((line: string) => console.error(line));
  const manifestPath = deps.manifestPath ?? resolve(import.meta.dir, "../.aidlc-plugin/plugin.json");
  const checkTag = deps.checkTag ?? assertTagMatchesManifest;
  const publish = deps.publish ?? ((version: string) => release(version));
  try {
    if (argv[0] === "--check-tag" && argv.length === 2) {
      checkTag(argv[1] as string, manifestPath);
      log(`release: ${argv[1]} matches the plugin manifest`);
    } else if (argv.length === 1 && argv[0] !== "--help" && argv[0] !== "-h") {
      publish(argv[0] as string);
      log(`release: published v${argv[0]}`);
    } else if (argv.length > 0 && (argv[0] === "--help" || argv[0] === "-h")) {
      log(`${USAGE}\n       bun grilling/scripts/release.ts --check-tag <tag>`);
    } else {
      throw new Error(USAGE);
    }
    return 0;
  } catch (thrown) {
    fail(`release: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
    return 1;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
