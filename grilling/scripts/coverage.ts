#!/usr/bin/env bun
//
// coverage.ts — line coverage gate over the lcov `bun test --coverage` writes.
//
// Ported from amadeus-dlc/amadeus-ng's scripts/coverage.sh (cargo-llvm-cov) by
// way of deep-spec-analysis/scripts/coverage.ts: the gate shape (absolute plus
// relative, a throwaway worktree for the base, a float tolerance) is kept and
// only the measurement is Bun's.
//
// Gates:
//   - Absolute: this package's line coverage must be >= ABSOLUTE_THRESHOLD (%).
//     The floor is stated once, in the constant below. Below it, exit 1.
//   - Relative (only with `--base <git-ref>`): the base ref is checked out into
//     a temporary `git worktree` and measured under the same conditions as head.
//     head below base fails; equal or above passes, within TOLERANCE. The
//     worktree is always removed, measurement failure included (`finally`).
//   - No arguments = absolute only. `--base <ref>` runs both.
//
// What is measured:
//   - bunfig.toml ([test] coveragePathIgnorePatterns) is the source of truth for
//     the measurement scope; this script carries no exclusions of its own. It
//     runs `bun test --coverage --coverage-reporter=lcov` and sums LF/LH across
//     every lcov record into one percentage.
//   - head's bunfig.toml is copied over the base worktree's (pinCoverageConfig)
//     so both sides share one denominator. Bun reads bunfig.toml from the cwd,
//     so without the copy a PR could widen its own exclusions and clear the
//     relative gate on a different denominator. This mirrors the shell original
//     passing one --ignore-filename-regex to both head and base. Changing the
//     exclusions stays a reviewable diff, which is where it belongs.
//
// The base measurement needs the aidlc-workflows submodule (the tests compose
// against its dist/<harness> installs) and `bun install --frozen-lockfile` for
// the pinned dev dependencies, so the worktree gets both before it is measured.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// --- thresholds (stated once, here) ------------------------------------------
export const ABSOLUTE_THRESHOLD = 90.0;
export const TOLERANCE = 0.01;
// -----------------------------------------------------------------------------

const PACKAGE_DIR = "grilling";
const SUBMODULE = "aidlc-workflows";
const USAGE = `Usage: bun grilling/scripts/coverage.ts [options]

Options:
  --base <git-ref>   Enable the relative gate: check the ref out into a
                     temporary worktree, measure it as head is measured, compare.
  --help, -h         Show this help

Thresholds (constants at the top of this script):
  Absolute: pass at ABSOLUTE_THRESHOLD=${ABSOLUTE_THRESHOLD} (%) or above.
  Relative: fail when head drops below base; equal or above passes. Tolerance TOLERANCE=${TOLERANCE}.
  Measurement scope: bunfig.toml, [test] coveragePathIgnorePatterns.

Examples:
  bun grilling/scripts/coverage.ts
  bun grilling/scripts/coverage.ts --base origin/main`;

export interface CommandResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: Error;
}

export type CommandRunner = (command: string, args: readonly string[], cwd: string) => CommandResult;

export interface GateOptions {
  /** Base ref for the relative gate. Absent = absolute gate only. */
  readonly baseRef?: string;
  /** Repository root (the parent of grilling/). */
  readonly repoRoot?: string;
  /** Line coverage % for the checkout rooted at the given directory. */
  readonly measure?: (repoRoot: string) => number;
  /** Check the base ref out into a temporary worktree; return its root. */
  readonly checkoutBase?: (repoRoot: string, baseRef: string) => string;
  /** Tear the worktree down. Called even when measure throws. */
  readonly removeWorktree?: (repoRoot: string, worktreeDir: string) => void;
  readonly log?: (line: string) => void;
}

export interface GateReport {
  readonly exitCode: 0 | 1;
  readonly headPercent: number;
  readonly basePercent: number | null;
}

/** The real spawn. Exported so its mapping of spawnSync's result — including a
 *  binary that does not exist — is covered without a subprocess in the way. */
export function defaultRunner(command: string, args: readonly string[], cwd: string): CommandResult {
  const result = spawnSync(command, args, { cwd, encoding: "utf-8", maxBuffer: 64 * 1024 * 1024 });
  return { status: result.status, stdout: result.stdout ?? "", stderr: result.stderr ?? "", error: result.error };
}

function describeFailure(result: CommandResult): string {
  if (result.error) return result.error.message;
  const tail = `${result.stdout}\n${result.stderr}`.trim().split("\n").slice(-8).join("\n");
  return `status ${result.status}${tail ? `\n${tail}` : ""}`;
}

/** Sum lcov's LF (measurable lines) and LH (hit lines) across every record and
 *  return line coverage as a 0-100 percentage. Null when there are no records. */
export function parseLcovLinePercent(lcov: string): number | null {
  let found = 0;
  let hit = 0;
  let records = 0;
  for (const raw of lcov.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("SF:")) records += 1;
    else if (line.startsWith("LF:")) found += Number(line.slice(3));
    else if (line.startsWith("LH:")) hit += Number(line.slice(3));
  }
  if (records === 0 || !Number.isFinite(found) || !Number.isFinite(hit)) return null;
  if (found === 0) return 100;
  return (hit / found) * 100;
}

/** True when a >= b - tol. */
export function geWithTolerance(a: number, b: number, tol: number): boolean {
  return a >= b - tol;
}

/** Read the failed-test count off bun's summary line (e.g. " 2 fail"). */
export function failedTestCount(output: string): number {
  const match = output.match(/^\s*(\d+)\s+fail\b/m);
  return match ? Number(match[1]) : 0;
}

/** Run bun test in the given checkout's grilling/ and return line coverage %
 *  from the lcov it writes. Anything short of a clean run throws — a red suite
 *  must never be reported as a coverage number. */
export function measureWithBun(repoRoot: string, run: CommandRunner = defaultRunner): number {
  const packageDir = join(repoRoot, PACKAGE_DIR);
  const coverageDir = mkdtempSync(join(tmpdir(), "grilling-coverage-"));
  try {
    const result = run(
      "bun",
      ["test", "--coverage", "--coverage-reporter=lcov", `--coverage-dir=${coverageDir}`],
      packageDir,
    );
    if (result.error) throw new Error(`cannot start bun test in ${packageDir}: ${result.error.message}`);
    const failed = failedTestCount(`${result.stdout}\n${result.stderr}`);
    if (failed > 0) throw new Error(`${failed} test(s) failed in ${packageDir}; coverage is not judged`);
    // A run can exit non-zero without ever printing an "N fail" line — a module
    // that fails to load, an unhandled error between tests, a killed process —
    // and still leave an lcov behind. Reading that lcov would report a partial
    // run as a coverage number, on the base side of the relative gate included.
    if (result.status !== 0) {
      throw new Error(
        `bun test exited with status ${result.status} in ${packageDir}; coverage is not judged: ${describeFailure(result)}`,
      );
    }
    const lcovPath = join(coverageDir, "lcov.info");
    if (!existsSync(lcovPath)) throw new Error(`no lcov.info was written to ${lcovPath}: ${describeFailure(result)}`);
    const percent = parseLcovLinePercent(readFileSync(lcovPath, "utf-8"));
    if (percent === null) throw new Error(`cannot read line coverage from ${lcovPath}`);
    return percent;
  } finally {
    rmSync(coverageDir, { recursive: true, force: true });
  }
}

/** Copy head's bunfig.toml over the base worktree's. Bun reads [test] settings
 *  (coveragePathIgnorePatterns and the rest) from the cwd's bunfig.toml, so
 *  without this head and base would be measured against different denominators
 *  and a PR that widened its own exclusions would clear the relative gate on
 *  the strength of that alone. Copying moves both sides together, so the
 *  comparison survives a legitimate change to the exclusions. */
export function pinCoverageConfig(repoRoot: string, worktreeDir: string): void {
  const source = join(repoRoot, PACKAGE_DIR, "bunfig.toml");
  const target = join(worktreeDir, PACKAGE_DIR, "bunfig.toml");
  if (!existsSync(source)) throw new Error(`head has no bunfig.toml at ${source}`);
  if (!existsSync(join(worktreeDir, PACKAGE_DIR))) {
    throw new Error(`base worktree has no ${PACKAGE_DIR}/ directory (${worktreeDir})`);
  }
  copyFileSync(source, target);
}

function requireOk(result: CommandResult, what: string): void {
  if (result.error || result.status !== 0) throw new Error(`${what}: ${describeFailure(result)}`);
}

/** Check the base ref out into a temporary worktree, make it runnable, return its root. */
export function checkoutBaseWorktree(repoRoot: string, baseRef: string, run: CommandRunner = defaultRunner): string {
  const worktreeDir = mkdtempSync(join(tmpdir(), "grilling-coverage-base-"));
  // `git worktree add` refuses a path that already exists, and mkdtemp made one.
  rmSync(worktreeDir, { recursive: true, force: true });
  requireOk(run("git", ["worktree", "add", "--detach", worktreeDir, baseRef], repoRoot), `git worktree add (${baseRef})`);
  try {
    requireOk(run("git", ["submodule", "update", "--init", "--", SUBMODULE], worktreeDir), "git submodule update (base worktree)");
    // Before install: bunfig.toml can also carry [install] settings, so the
    // dependency layout has to match head's too.
    pinCoverageConfig(repoRoot, worktreeDir);
    requireOk(run("bun", ["install", "--frozen-lockfile"], join(worktreeDir, PACKAGE_DIR)), "bun install (base worktree)");
  } catch (error) {
    removeWorktree(repoRoot, worktreeDir, run);
    throw error;
  }
  return worktreeDir;
}

export function removeWorktree(repoRoot: string, worktreeDir: string, run: CommandRunner = defaultRunner): void {
  const result = run("git", ["worktree", "remove", "--force", worktreeDir], repoRoot);
  if (result.error || result.status !== 0) rmSync(worktreeDir, { recursive: true, force: true });
}

function formatPercent(value: number): string {
  return value.toFixed(2);
}

/** Evaluate the absolute gate, plus the relative gate when baseRef is set. */
export function runGate(options: GateOptions = {}): GateReport {
  const repoRoot = resolve(options.repoRoot ?? resolve(import.meta.dir, "../.."));
  const measure = options.measure ?? measureWithBun;
  const checkoutBase = options.checkoutBase ?? checkoutBaseWorktree;
  const remove = options.removeWorktree ?? removeWorktree;
  const log = options.log ?? ((line: string) => console.log(line));

  let exitCode: 0 | 1 = 0;

  log(`==> measuring head line coverage (${repoRoot})`);
  const headPercent = measure(repoRoot);
  log(`head line coverage: ${formatPercent(headPercent)}%`);

  if (geWithTolerance(headPercent, ABSOLUTE_THRESHOLD, 0)) {
    log(`[PASS] absolute gate: head (${formatPercent(headPercent)}%) >= threshold (${ABSOLUTE_THRESHOLD}%)`);
  } else {
    log(`[FAIL] absolute gate: head (${formatPercent(headPercent)}%) < threshold (${ABSOLUTE_THRESHOLD}%)`);
    exitCode = 1;
  }

  let basePercent: number | null = null;
  if (options.baseRef) {
    log(`==> checking base (${options.baseRef}) out into a temporary worktree`);
    const worktreeDir = checkoutBase(repoRoot, options.baseRef);
    try {
      log(`==> measuring base line coverage (${worktreeDir})`);
      basePercent = measure(worktreeDir);
    } finally {
      remove(repoRoot, worktreeDir);
    }
    log(`base (${options.baseRef}) line coverage: ${formatPercent(basePercent)}%`);

    if (geWithTolerance(headPercent, basePercent, TOLERANCE)) {
      log(`[PASS] relative gate: head (${formatPercent(headPercent)}%) >= base (${formatPercent(basePercent)}%) - tolerance (${TOLERANCE})`);
    } else {
      log(`[FAIL] relative gate: head (${formatPercent(headPercent)}%) < base (${formatPercent(basePercent)}%) - tolerance (${TOLERANCE})`);
      exitCode = 1;
    }
  }

  return { exitCode, headPercent, basePercent };
}

export function parseArgs(args: readonly string[]): { baseRef?: string; help: boolean } {
  let baseRef: string | undefined;
  let help = false;
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--base") {
      const value = args[i + 1];
      if (!value) throw new Error("--base requires a git-ref");
      baseRef = value;
      i += 1;
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    } else {
      throw new Error(`unknown argument '${arg}'\n${USAGE}`);
    }
  }
  return { baseRef, help };
}

export interface MainDeps {
  readonly log?: (line: string) => void;
  readonly error?: (line: string) => void;
  readonly gate?: (options: GateOptions) => GateReport;
}

/** The command line, as a function: parse, print, and return the exit code.
 *  `import.meta.main` only forwards it to `process.exit`, so every branch a
 *  user can reach — help, a bad argument, a passing gate, a failing one — is
 *  reachable from a test as well. */
export function main(argv: readonly string[], deps: MainDeps = {}): 0 | 1 {
  const log = deps.log ?? ((line: string) => console.log(line));
  const error = deps.error ?? ((line: string) => console.error(line));
  const gate = deps.gate ?? runGate;
  try {
    const parsed = parseArgs(argv);
    if (parsed.help) {
      log(USAGE);
      return 0;
    }
    return gate({ baseRef: parsed.baseRef }).exitCode;
  } catch (thrown) {
    error(`error: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
    return 1;
  }
}

if (import.meta.main) process.exit(main(process.argv.slice(2)));
