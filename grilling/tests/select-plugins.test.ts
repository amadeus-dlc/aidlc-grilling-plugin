// NG1 check for the grilling plugin: does a contributions-only plugin survive
// the `plugins` selection key in tools/data/harness.json?
//
// Opt-in: runs only when GRILLING_SELECT_KEY_CHECK=1 (ADR-005 keeps it out of
// CI; the outcome is recorded by hand in grilling/docs/decisions). It builds
// the Claude projection, copies the checkout's dist/claude install into a
// temp dir, writes the selection key an install carries after
// `aidlc-utility.ts select-plugins <names>`, and runs the projection's real
// hooks/compose.ts against it — the same drive plugin.test.ts uses, plus the
// key. Two keyed installs are composed:
//
//   selected   plugins: ["aidlc", "grilling"]  — the case NG1 asks about:
//                                                every target stage must carry
//                                                the fragment, with no drops
//   excluded   plugins: ["aidlc"]              — the fragment must stay out,
//                                                and compose must say why
//
// The unkeyed install (no `plugins` key at all) is the control plugin.test.ts
// already composes. Nothing here reaches the network. A summary of what each
// compose did is printed so the result can be copied into the decision record.
//
// Run: GRILLING_SELECT_KEY_CHECK=1 bun test tests/select-plugins.test.ts

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { type ContributionTarget, ORDER, PLUGIN, TARGETS, pluginRoot } from "../scripts/sync-contributions.ts";

const CHECK = process.env.GRILLING_SELECT_KEY_CHECK === "1";
const HARNESS = "claude";
const HARNESS_LEAF = ".claude";
// Where the shipped Claude install keeps the selection key (dist/claude).
const HARNESS_JSON = join(HARNESS_LEAF, "tools", "data", "harness.json");
const SELECTED = ["aidlc", PLUGIN];
const EXCLUDED = ["aidlc"];

const checkout = (() => {
  const candidates = [process.env.AIDLC_WORKFLOWS_CHECKOUT, join(pluginRoot, "..", "aidlc-workflows")];
  for (const c of candidates) {
    if (c && existsSync(join(c, "core", "tools", "aidlc-plugin-build.ts"))) return c;
  }
  throw new Error("aidlc-workflows checkout not found — run `git submodule update --init` or set AIDLC_WORKFLOWS_CHECKOUT");
})();
const toolsDir = join(checkout, "core", "tools");

interface KeyedInstall {
  name: string;
  selection: string[];
  project: string;
  compose: ReturnType<typeof run>;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function run(cmd: string[], options: { cwd?: string; env?: Record<string, string> } = {}) {
  const res = spawnSync(cmd[0], cmd.slice(1), {
    encoding: "utf-8",
    timeout: 120_000,
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
  });
  return { ...res, output: `${res.stdout ?? ""}\n${res.stderr ?? ""}` };
}

function walk(dir: string, predicate: (path: string) => boolean): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === "node_modules") continue;
      out.push(...walk(path, predicate));
    } else if (predicate(path)) out.push(path);
  }
  return out.sort();
}

function buildProjection(outDir: string) {
  return run(["bun", join(toolsDir, "aidlc-plugin-build.ts"), pluginRoot, HARNESS, outDir]);
}

// A copy of the shipped install with the selection key written the way
// select-plugins leaves it: the existing harness.json fields plus `plugins`.
function provisionKeyedInstall(into: string, name: string, selection: string[]): string {
  const project = join(into, `project-${name}`);
  cpSync(join(checkout, "dist", HARNESS), project, { recursive: true });
  const path = join(project, HARNESS_JSON);
  if (!existsSync(path)) {
    throw new Error(`harness.json not found at ${relative(project, path)} — the dist/${HARNESS} layout moved; update HARNESS_JSON`);
  }
  const parsed = JSON.parse(readFileSync(path, "utf-8")) as Record<string, unknown>;
  writeFileSync(path, `${JSON.stringify({ ...parsed, plugins: selection }, null, 2)}\n`);
  return project;
}

function readSelectionKey(project: string): unknown {
  const parsed = JSON.parse(readFileSync(join(project, HARNESS_JSON), "utf-8")) as { plugins?: unknown };
  return parsed.plugins;
}

function compose(projection: string, project: string) {
  return run([process.execPath, join(projection, "hooks", "compose.ts")], {
    cwd: project,
    env: {
      AIDLC_PLUGIN_ROOT: projection,
      CLAUDE_PLUGIN_ROOT: projection,
      AIDLC_PROJECT_DIR: project,
      CLAUDE_PROJECT_DIR: project,
      AIDLC_HARNESS_DIR: HARNESS_LEAF,
    },
  });
}

function composedStagePath(project: string, target: ContributionTarget): string {
  return join(project, HARNESS_LEAF, "aidlc-common", "stages", target.phase, `${target.slug}.md`);
}

// Number of this plugin's open sentinels for the target's anchor in a stage.
function fragmentCount(project: string, target: ContributionTarget): number {
  const path = composedStagePath(project, target);
  if (!existsSync(path)) return 0;
  const re = new RegExp(`<!-- plugin:${PLUGIN}:${escapeRegExp(target.anchor)}:${ORDER}:[0-9a-f]{8} -->`, "g");
  return readFileSync(path, "utf-8").match(re)?.length ?? 0;
}

function composedTargets(project: string): ContributionTarget[] {
  return TARGETS.filter((t) => fragmentCount(project, t) === 1);
}

function dropsFiles(project: string): Array<{ path: string; content: string }> {
  return walk(project, (p) => p.endsWith(".drops")).map((p) => ({
    path: relative(project, p),
    content: readFileSync(p, "utf-8"),
  }));
}

function summarize(install: KeyedInstall): string {
  const composed = composedTargets(install.project).length;
  const drops = dropsFiles(install.project);
  return [
    `${install.name}: plugins=${JSON.stringify(install.selection)}`,
    `  compose exit: ${install.compose.status}`,
    `  stages carrying the fragment: ${composed}/${TARGETS.length}`,
    `  drops files: ${drops.length}${drops.map((d) => `\n    ${d.path}:\n${d.content.replace(/^/gm, "      ")}`).join("")}`,
    `  harness.json plugins after compose: ${JSON.stringify(readSelectionKey(install.project))}`,
  ].join("\n");
}

describe.skipIf(!CHECK)(`grilling — plugin selection key in ${HARNESS_JSON} (GRILLING_SELECT_KEY_CHECK=1)`, () => {
  let tmp = "";
  let selected: KeyedInstall;
  let excluded: KeyedInstall;

  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), "grilling-select-plugins-"));
    const projection = join(tmp, "dist-claude");
    const build = buildProjection(projection);
    if (build.status !== 0) throw new Error(`build failed: ${build.output}`);
    const provision = (name: string, selection: string[]): KeyedInstall => {
      const project = provisionKeyedInstall(tmp, name, selection);
      return { name, selection, project, compose: compose(projection, project) };
    };
    selected = provision("selected", SELECTED);
    excluded = provision("excluded", EXCLUDED);
    console.log(`\n--- selection key check ---\n${summarize(selected)}\n${summarize(excluded)}\n---`);
  }, 300_000);

  afterAll(() => {
    if (tmp && process.env.AIDLC_KEEP_TEMP !== "1") rmSync(tmp, { recursive: true, force: true });
    else if (tmp) console.log(`kept selection-key workspace: ${tmp}`);
  });

  test("compose exits cleanly whether or not the key names the plugin", () => {
    expect(selected.compose.status, selected.compose.output).toBe(0);
    expect(excluded.compose.status, excluded.compose.output).toBe(0);
  });

  test("selected: every target stage carries the fragment exactly once", () => {
    for (const target of TARGETS) {
      expect(fragmentCount(selected.project, target), `${target.slug}: one ${PLUGIN} block`).toBe(1);
      expect(readFileSync(composedStagePath(selected.project, target), "utf-8")).toContain("`Grill me`");
    }
    expect(composedTargets(selected.project).length).toBe(TARGETS.length);
  });

  test("selected: compose recorded no drops", () => {
    expect(dropsFiles(selected.project).map((d) => `${d.path}:\n${d.content}`)).toEqual([]);
  });

  test("selected: the selection key still names the plugin after compose", () => {
    const key = readSelectionKey(selected.project);
    expect(Array.isArray(key), `plugins key is ${JSON.stringify(key)}`).toBe(true);
    expect(key as string[]).toContain(PLUGIN);
    expect(key as string[]).toContain("aidlc");
  });

  test("excluded: the fragment lands in no stage and a drop names the select-plugins fix", () => {
    for (const target of TARGETS) {
      expect(fragmentCount(excluded.project, target), `${target.slug}: no ${PLUGIN} block`).toBe(0);
    }
    const drops = dropsFiles(excluded.project);
    expect(drops.length, "an advisory drop explains the disabled plugin").toBeGreaterThanOrEqual(1);
    const text = drops.map((d) => d.content).join("\n");
    expect(text).toContain(`plugin "${PLUGIN}"`);
    expect(text).toContain("select-plugins");
  });
});

// Keep the file from being an empty suite when the gate is off.
test.skipIf(CHECK)(
  `plugin selection key check skipped — set GRILLING_SELECT_KEY_CHECK=1 to compose ${PLUGIN} into keyed Claude installs`,
  () => {},
);
