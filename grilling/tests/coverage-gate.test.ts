// Tests for the line coverage gate (BR: CI quality gates).
//
// Mirrors deep-spec-analysis/tests/coverage-gate.test.ts. Everything here is
// pure: the lcov arithmetic and the argument parser run directly, and the gate
// decisions run through runGate with measurement, checkout, and teardown
// injected, so no test spawns bun or git. measureWithBun, checkoutBaseWorktree,
// and removeWorktree take a CommandRunner, so their real bodies run against a
// fake that records the commands and stages the files the real ones would find;
// they and pinCoverageConfig touch the filesystem, so they get throwaway
// directories.
//
// Run: bun test tests/coverage-gate.test.ts (from the plugin root)

import { afterEach, describe, expect, test } from "bun:test";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ABSOLUTE_THRESHOLD,
  type CommandRunner,
  TOLERANCE,
  checkoutBaseWorktree,
  failedTestCount,
  geWithTolerance,
  measureWithBun,
  parseArgs,
  parseLcovLinePercent,
  pinCoverageConfig,
  removeWorktree,
  runGate,
} from "../scripts/coverage.ts";

const LCOV = [
  "TN:",
  "SF:scripts/release.ts",
  "FNF:2",
  "FNH:2",
  "LF:10",
  "LH:9",
  "end_of_record",
  "SF:scripts/sync-contributions.ts",
  "LF:30",
  "LH:30",
  "end_of_record",
  "",
].join("\n");

describe("coverage gate — lcov parsing", () => {
  test("sums LF/LH across every record into one line percentage", () => {
    expect(parseLcovLinePercent(LCOV)).toBeCloseTo(97.5, 10);
  });

  test("an lcov without records yields null, and zero measurable lines count as full coverage", () => {
    expect(parseLcovLinePercent("")).toBeNull();
    expect(parseLcovLinePercent("SF:x.ts\nLF:0\nLH:0\nend_of_record\n")).toBe(100);
  });

  test("reads the failed-test count from bun's summary line only", () => {
    expect(failedTestCount(" 44 pass\n 14 skip\n 0 fail\n")).toBe(0);
    expect(failedTestCount("some text\n 3 fail\n")).toBe(3);
    expect(failedTestCount("no summary here")).toBe(0);
  });

  test("geWithTolerance treats equality and the tolerance band as a pass", () => {
    expect(geWithTolerance(60, 60, 0)).toBe(true);
    expect(geWithTolerance(59.995, 60, TOLERANCE)).toBe(true);
    expect(geWithTolerance(59.98, 60, TOLERANCE)).toBe(false);
  });
});

describe("coverage gate — decisions", () => {
  function gate(head: number, base?: number) {
    const log: string[] = [];
    const removed: string[] = [];
    const report = runGate({
      baseRef: base === undefined ? undefined : "origin/main",
      repoRoot: "/repo",
      measure: (root) => (root === "/repo" ? head : (base as number)),
      checkoutBase: () => "/tmp/base-worktree",
      removeWorktree: (_root, dir) => {
        removed.push(dir);
      },
      log: (line) => log.push(line),
    });
    return { report, log, removed };
  }

  test("absolute gate alone passes at the threshold and fails below it", () => {
    expect(gate(ABSOLUTE_THRESHOLD).report).toEqual({ exitCode: 0, headPercent: ABSOLUTE_THRESHOLD, basePercent: null });
    const failing = gate(ABSOLUTE_THRESHOLD - 0.01);
    expect(failing.report.exitCode).toBe(1);
    expect(failing.log.some((line) => line.startsWith("[FAIL] absolute gate"))).toBe(true);
  });

  test("relative gate passes when head matches, exceeds, or sits within tolerance of base", () => {
    expect(gate(70, 70).report.exitCode).toBe(0);
    expect(gate(71, 70).report.exitCode).toBe(0);
    expect(gate(70 - TOLERANCE / 2, 70).report.exitCode).toBe(0);
  });

  test("relative gate fails when head drops below base by more than the tolerance, and the worktree is always removed", () => {
    const dropped = gate(69.9, 70);
    expect(dropped.report).toEqual({ exitCode: 1, headPercent: 69.9, basePercent: 70 });
    expect(dropped.log.some((line) => line.startsWith("[FAIL] relative gate"))).toBe(true);
    expect(dropped.removed).toEqual(["/tmp/base-worktree"]);
  });

  test("a head above the floor still fails when it regressed against base", () => {
    const regressed = gate(ABSOLUTE_THRESHOLD + 10, ABSOLUTE_THRESHOLD + 20);
    expect(regressed.report.exitCode).toBe(1);
    expect(regressed.log.some((line) => line.startsWith("[PASS] absolute gate"))).toBe(true);
    expect(regressed.log.some((line) => line.startsWith("[FAIL] relative gate"))).toBe(true);
  });

  test("the worktree is removed even when the base measurement throws", () => {
    const removed: string[] = [];
    expect(() =>
      runGate({
        baseRef: "origin/main",
        repoRoot: "/repo",
        measure: (root) => {
          if (root === "/repo") return 70;
          throw new Error("base tests failed");
        },
        checkoutBase: () => "/tmp/base-worktree",
        removeWorktree: (_root, dir) => {
          removed.push(dir);
        },
        log: () => {},
      }),
    ).toThrow("base tests failed");
    expect(removed).toEqual(["/tmp/base-worktree"]);
  });

  test("parseArgs accepts --base <ref> and --help, and rejects anything else", () => {
    expect(parseArgs([])).toEqual({ baseRef: undefined, help: false });
    expect(parseArgs(["--base", "origin/main"])).toEqual({ baseRef: "origin/main", help: false });
    expect(parseArgs(["-h"]).help).toBe(true);
    expect(() => parseArgs(["--base"])).toThrow("--base requires a git-ref");
    expect(() => parseArgs(["--nope"])).toThrow("unknown argument");
  });
});

describe("coverage gate — one coverage config for head and base", () => {
  const sandboxes: string[] = [];

  afterEach(() => {
    for (const dir of sandboxes.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function pair(headConfig: string, baseConfig: string | null): { repoRoot: string; worktree: string; basePath: string } {
    const repoRoot = mkdtempSync(join(tmpdir(), "grilling-pin-head-"));
    const worktree = mkdtempSync(join(tmpdir(), "grilling-pin-base-"));
    sandboxes.push(repoRoot, worktree);
    mkdirSync(join(repoRoot, "grilling"), { recursive: true });
    writeFileSync(join(repoRoot, "grilling", "bunfig.toml"), headConfig);
    mkdirSync(join(worktree, "grilling"), { recursive: true });
    const basePath = join(worktree, "grilling", "bunfig.toml");
    if (baseConfig !== null) writeFileSync(basePath, baseConfig);
    return { repoRoot, worktree, basePath };
  }

  test("head's bunfig replaces the base worktree's, so both sides share one denominator", () => {
    const head = '[test]\ncoveragePathIgnorePatterns = ["tests/**", "scripts/install.ts"]\n';
    const { repoRoot, worktree, basePath } = pair(head, '[test]\ncoveragePathIgnorePatterns = ["scripts/**"]\n');
    pinCoverageConfig(repoRoot, worktree);
    expect(readFileSync(basePath, "utf-8")).toBe(head);
  });

  test("a base worktree without its own bunfig still receives head's", () => {
    const head = '[test]\ncoveragePathIgnorePatterns = ["tests/**"]\n';
    const { repoRoot, worktree, basePath } = pair(head, null);
    pinCoverageConfig(repoRoot, worktree);
    expect(readFileSync(basePath, "utf-8")).toBe(head);
  });

  test("a missing head bunfig or an unrecognisable worktree is an error, never a silent skip", () => {
    const missingHead = mkdtempSync(join(tmpdir(), "grilling-pin-nohead-"));
    const worktree = mkdtempSync(join(tmpdir(), "grilling-pin-base-"));
    sandboxes.push(missingHead, worktree);
    mkdirSync(join(worktree, "grilling"), { recursive: true });
    expect(() => pinCoverageConfig(missingHead, worktree)).toThrow("head has no bunfig.toml");

    const { repoRoot } = pair("[test]\n", null);
    const emptyWorktree = mkdtempSync(join(tmpdir(), "grilling-pin-empty-"));
    sandboxes.push(emptyWorktree);
    expect(() => pinCoverageConfig(repoRoot, emptyWorktree)).toThrow("base worktree has no grilling/ directory");
  });
});

describe("coverage gate — measurement", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  /** Stands in for `bun test --coverage`: records the invocation and writes the
   *  lcov the real bun would write into the --coverage-dir it was handed. */
  function fakeBun(options: { lcov?: string; summary?: string; error?: Error }): {
    run: CommandRunner;
    calls: Array<{ command: string; args: readonly string[]; cwd: string }>;
    coverageDirs: string[];
  } {
    const calls: Array<{ command: string; args: readonly string[]; cwd: string }> = [];
    const coverageDirs: string[] = [];
    const run: CommandRunner = (command, args, cwd) => {
      calls.push({ command, args: [...args], cwd });
      const flag = args.find((arg) => arg.startsWith("--coverage-dir="));
      if (flag) {
        const dir = flag.slice("--coverage-dir=".length);
        coverageDirs.push(dir);
        if (options.lcov !== undefined) writeFileSync(join(dir, "lcov.info"), options.lcov);
      }
      return { status: 0, stdout: options.summary ?? " 71 pass\n 14 skip\n 0 fail\n", stderr: "", error: options.error };
    };
    return { run, calls, coverageDirs };
  }

  test("runs bun test in the checkout's grilling/ and returns the lcov percentage", () => {
    const fake = fakeBun({ lcov: LCOV });
    expect(measureWithBun("/repo", fake.run)).toBeCloseTo(97.5, 10);
    expect(fake.calls[0]?.command).toBe("bun");
    expect(fake.calls[0]?.args.slice(0, 3)).toEqual(["test", "--coverage", "--coverage-reporter=lcov"]);
    expect(fake.calls[0]?.cwd).toBe(join("/repo", "grilling"));
  });

  test("the temporary coverage directory is removed on success and on failure alike", () => {
    const ok = fakeBun({ lcov: LCOV });
    measureWithBun("/repo", ok.run);
    expect(existsSync(ok.coverageDirs[0] as string)).toBe(false);

    const red = fakeBun({ lcov: LCOV, summary: " 2 fail\n" });
    expect(() => measureWithBun("/repo", red.run)).toThrow();
    expect(existsSync(red.coverageDirs[0] as string)).toBe(false);
  });

  test("a red suite is an error, never a coverage number", () => {
    const red = fakeBun({ lcov: LCOV, summary: " 69 pass\n 2 fail\n" });
    expect(() => measureWithBun("/repo", red.run)).toThrow("2 test(s) failed");
  });

  test("a bun that never started, a missing lcov, and an empty lcov are all errors", () => {
    expect(() => measureWithBun("/repo", fakeBun({ error: new Error("spawn ENOENT") }).run)).toThrow(
      "cannot start bun test",
    );
    expect(() => measureWithBun("/repo", fakeBun({}).run)).toThrow("no lcov.info was written");
    expect(() => measureWithBun("/repo", fakeBun({ lcov: "" }).run)).toThrow("cannot read line coverage");
  });
});

describe("coverage gate — base worktree lifecycle", () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
  });

  function headRoot(): string {
    const repoRoot = mkdtempSync(join(tmpdir(), "grilling-worktree-head-"));
    dirs.push(repoRoot);
    mkdirSync(join(repoRoot, "grilling"), { recursive: true });
    writeFileSync(join(repoRoot, "grilling", "bunfig.toml"), '[test]\ncoveragePathIgnorePatterns = ["tests/**"]\n');
    return repoRoot;
  }

  /** Stands in for git and bun: `worktree add` materialises the checkout the
   *  real command would create, and `fail` names the one step that goes wrong. */
  function fakeGit(fail?: string): {
    run: CommandRunner;
    calls: Array<{ command: string; args: readonly string[] }>;
  } {
    const calls: Array<{ command: string; args: readonly string[] }> = [];
    const run: CommandRunner = (command, args, _cwd) => {
      calls.push({ command, args: [...args] });
      const step = `${command} ${args[0]} ${args[1] ?? ""}`.trim();
      const failed = fail !== undefined && step.startsWith(fail);
      if (command === "git" && args[0] === "worktree" && args[1] === "add" && !failed) {
        mkdirSync(join(args[3] as string, "grilling"), { recursive: true });
      }
      if (failed) return { status: 1, stdout: "", stderr: "boom" };
      return { status: 0, stdout: "", stderr: "" };
    };
    return { run, calls };
  }

  test("checks the ref out, initialises the submodule, pins head's bunfig, then installs", () => {
    const repoRoot = headRoot();
    const fake = fakeGit();
    const worktree = checkoutBaseWorktree(repoRoot, "origin/main", fake.run);
    dirs.push(worktree);
    expect(fake.calls.map((call) => `${call.command} ${call.args[0]}`)).toEqual([
      "git worktree",
      "git submodule",
      "bun install",
    ]);
    expect(readFileSync(join(worktree, "grilling", "bunfig.toml"), "utf-8")).toContain("coveragePathIgnorePatterns");
  });

  test("a failed checkout reports which step failed and leaves no worktree behind", () => {
    const repoRoot = headRoot();
    const fake = fakeGit("git worktree add");
    expect(() => checkoutBaseWorktree(repoRoot, "origin/main", fake.run)).toThrow("git worktree add (origin/main)");
    expect(fake.calls).toHaveLength(1);
  });

  test("a step that fails after the checkout still tears the worktree down", () => {
    const repoRoot = headRoot();
    const fake = fakeGit("bun install");
    let worktree = "";
    const run: CommandRunner = (command, args, cwd) => {
      if (command === "git" && args[0] === "worktree" && args[1] === "add") worktree = args[3] as string;
      return fake.run(command, args, cwd);
    };
    expect(() => checkoutBaseWorktree(repoRoot, "origin/main", run)).toThrow("bun install (base worktree)");
    expect(worktree).not.toBe("");
    dirs.push(worktree);
    // Teardown targets the worktree that was actually created — the throw must
    // not leave a half-built checkout on disk for the next run to trip over.
    expect(fake.calls.at(-1)?.args).toEqual(["worktree", "remove", "--force", worktree]);
  });

  test("removeWorktree falls back to deleting the directory when git refuses", () => {
    const kept = mkdtempSync(join(tmpdir(), "grilling-worktree-kept-"));
    dirs.push(kept);
    removeWorktree("/repo", kept, () => ({ status: 0, stdout: "", stderr: "" }));
    expect(existsSync(kept)).toBe(true);

    const dropped = mkdtempSync(join(tmpdir(), "grilling-worktree-dropped-"));
    removeWorktree("/repo", dropped, () => ({ status: 1, stdout: "", stderr: "not a working tree" }));
    expect(existsSync(dropped)).toBe(false);
  });
});
