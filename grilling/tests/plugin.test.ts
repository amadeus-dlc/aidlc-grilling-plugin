// Content, projection, and compose tests for the grilling plugin.
//
// The aidlc-workflows checkout (this repository's submodule) supplies the
// validator, the builder, the compose hook template, the core stage sources
// the contributions target, and the per-harness dist/ installs the compose
// tests run against. Set AIDLC_WORKFLOWS_CHECKOUT when it lives elsewhere.
//
// Run: bun test (from the plugin root)

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, relative } from "node:path";
import {
  type ContributionTarget,
  ORDER,
  PLUGIN,
  TARGETS,
  contributionPath,
  contributionsDir,
  pluginRoot,
  renderContribution,
  templatePath,
} from "../scripts/sync-contributions.ts";

// ---- fixtures ---------------------------------------------------------------

const checkout = (() => {
  const candidates = [
    process.env.AIDLC_WORKFLOWS_CHECKOUT,
    join(pluginRoot, "..", "aidlc-workflows"),
  ];
  for (const c of candidates) {
    if (c && existsSync(join(c, "core", "tools", "aidlc-plugin-validate.ts"))) return c;
  }
  throw new Error(
    "aidlc-workflows checkout not found — run `git submodule update --init` or set AIDLC_WORKFLOWS_CHECKOUT",
  );
})();
const toolsDir = join(checkout, "core", "tools");
const coreStagesDir = join(checkout, "core", "aidlc-common", "stages");
const targetsTable = JSON.parse(
  readFileSync(join(checkout, "dist", "claude", ".claude", "tools", "data", "plugin-targets.json"), "utf-8"),
) as Record<string, { harnessLeaf: string; manifestDir: string }>;
const HARNESSES = Object.keys(targetsTable).sort();
const template = readFileSync(templatePath, "utf-8");

const SENTINEL_OPEN = (anchor: string) =>
  new RegExp(`<!-- plugin:${PLUGIN}:${escapeRegExp(anchor)}:${ORDER}:([0-9a-f]{8}) -->`);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function run(
  cmd: string[],
  options: { cwd?: string; env?: Record<string, string>; timeout?: number } = {},
) {
  const res = spawnSync(cmd[0], cmd.slice(1), {
    encoding: "utf-8",
    timeout: options.timeout ?? 120_000,
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

// slug -> phase for every core stage whose body mentions its questions file.
function coreStagesOwningQuestions(): Map<string, string> {
  const owners = new Map<string, string>();
  for (const file of walk(coreStagesDir, (p) => p.endsWith(".md"))) {
    if (!readFileSync(file, "utf-8").includes("-questions.md")) continue;
    owners.set(basename(file, ".md"), basename(dirname(file)));
  }
  return owners;
}

function stepHeading(content: string, n: number): { start: number; end: number } | null {
  for (const m of content.matchAll(/^### Step (\d+)(?:-(\d+))?\b.*$/gm)) {
    const lo = Number(m[1]);
    const hi = m[2] ? Number(m[2]) : lo;
    if (n >= lo && n <= hi) return { start: m.index!, end: m.index! + m[0].length };
  }
  return null;
}

function anchorKind(anchor: string): { kind: "after" | "before" | "end"; step: number } {
  if (anchor === "end-of-steps") return { kind: "end", step: 0 };
  const [kind, n] = anchor.split(":");
  return { kind: kind === "after-step" ? "after" : "before", step: Number(n) };
}

function buildProjection(harness: string, outDir: string) {
  return run(["bun", join(toolsDir, "aidlc-plugin-build.ts"), pluginRoot, harness, outDir]);
}

function installFixture(harness: string, into: string): string {
  const project = join(into, `project-${harness}`);
  cpSync(join(checkout, "dist", harness), project, { recursive: true });
  return project;
}

function compose(harness: string, projection: string, project: string) {
  const leaf = targetsTable[harness].harnessLeaf;
  return run([process.execPath, join(projection, "hooks", "compose.ts")], {
    cwd: project,
    env: {
      AIDLC_PLUGIN_ROOT: projection,
      CLAUDE_PLUGIN_ROOT: projection,
      AIDLC_PROJECT_DIR: project,
      CLAUDE_PROJECT_DIR: project,
      AIDLC_HARNESS_DIR: leaf,
    },
  });
}

function composedStagePath(harness: string, project: string, target: ContributionTarget): string {
  return join(project, targetsTable[harness].harnessLeaf, "aidlc-common", "stages", target.phase, `${target.slug}.md`);
}

// ---- authored content -------------------------------------------------------

describe("grilling — authored content", () => {
  test("passes aidlc-plugin-validate", () => {
    const res = run(["bun", join(toolsDir, "aidlc-plugin-validate.ts"), pluginRoot]);
    expect(res.output).toContain("Plugin validation: VALID");
    expect(res.status).toBe(0);
  });

  test("manifest is contributions-only", () => {
    const manifest = JSON.parse(readFileSync(join(pluginRoot, ".aidlc-plugin", "plugin.json"), "utf-8")) as {
      name: string;
      aidlc: { contributes: Record<string, string> };
    };
    expect(manifest.name).toBe(PLUGIN);
    expect(manifest.aidlc.contributes).toEqual({ overlays: "contributions/" });
    for (const dir of ["stages", "agents", "scopes", "sensors", "tools", "knowledge"]) {
      expect(existsSync(join(pluginRoot, dir))).toBe(false);
    }
  });

  test("targets are exactly the core stages that own a questions file", () => {
    const owners = coreStagesOwningQuestions();
    const declared = new Map<string, string>(TARGETS.map((t) => [t.slug, t.phase]));
    expect([...declared.keys()].sort()).toEqual([...owners.keys()].sort());
    for (const [slug, phase] of owners) expect(declared.get(slug)).toBe(phase);
    expect(TARGETS.length).toBe(28);
  });

  test("every contribution is the template rendered for its target, with no extras", () => {
    for (const target of TARGETS) {
      const path = contributionPath(target);
      expect(existsSync(path), relative(pluginRoot, path)).toBe(true);
      expect(readFileSync(path, "utf-8")).toBe(renderContribution(target, template));
    }
    const files = walk(contributionsDir, (p) => p.endsWith(".md")).map((p) => relative(contributionsDir, p)).sort();
    expect(files).toEqual(TARGETS.map((t) => `${t.phase}/${t.slug}.md`).sort());
    const check = run(["bun", join(pluginRoot, "scripts", "sync-contributions.ts"), "--check"]);
    expect(check.status, check.output).toBe(0);
  });

  test("every anchor resolves to a real heading in its target stage source", () => {
    for (const target of TARGETS) {
      const source = readFileSync(join(coreStagesDir, target.phase, `${target.slug}.md`), "utf-8");
      const { kind, step } = anchorKind(target.anchor);
      if (kind === "end") {
        expect(/^## Steps\b/m.test(source), `${target.slug}: ## Steps`).toBe(true);
      } else {
        expect(stepHeading(source, step), `${target.slug}: ### Step ${step}`).not.toBeNull();
      }
    }
  });

  test("the fragment template is well-formed prose", () => {
    expect(template.trim().length).toBeGreaterThan(0);
    expect(template).toContain("`Grill me`");
    expect(template).toContain(
      "`Interview me one question at a time with a recommended answer; drill into every branch until we share the same understanding`",
    );
    expect(template).toContain('**Step 3d: If "Grill me"');
    expect(template).toContain("**Mode:** grill");
    // Sentinel look-alikes would be mistaken for block terminators on upgrade.
    expect(/<!--\s*\/?plugin:/m.test(template)).toBe(false);
    // A nested fragment header would split the prose block.
    expect(/^## fragment:/m.test(template)).toBe(false);
    // Fences must balance so the compose scanner sees the whole block.
    const fences = template.split("\n").filter((line) => /^\s*(`{3,}|~{3,})/.test(line));
    expect(fences.length % 2).toBe(0);
  });
});

// ---- projections ------------------------------------------------------------

describe("grilling — harness projections", () => {
  let tmp = "";
  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), "grilling-build-"));
  });
  afterAll(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  test("seven harnesses are known", () => {
    expect(HARNESSES).toEqual(["claude", "codex", "copilot", "cursor", "kiro", "kiro-ide", "opencode"]);
  });

  for (const harness of HARNESSES) {
    test(`${harness}: the projection carries all contributions and the compose hook`, () => {
      const out = join(tmp, harness);
      const res = buildProjection(harness, out);
      expect(res.status, res.output).toBe(0);
      for (const target of TARGETS) {
        const projected = join(out, "contributions", target.phase, `${target.slug}.md`);
        expect(existsSync(projected), relative(out, projected)).toBe(true);
        expect(readFileSync(projected, "utf-8")).toBe(readFileSync(contributionPath(target), "utf-8"));
      }
      expect(existsSync(join(out, "hooks", "compose.ts"))).toBe(true);
      const hostManifest = JSON.parse(
        readFileSync(join(out, targetsTable[harness].manifestDir, "plugin.json"), "utf-8"),
      ) as { name: string };
      expect(hostManifest.name).toBe(`aidlc-${PLUGIN}`);
      for (const dir of ["stages", "agents", "scopes", "sensors", "tools", "knowledge"]) {
        expect(existsSync(join(out, dir)), `${harness}/${dir} must not be projected`).toBe(false);
      }
    }, 60_000);
  }
});

// ---- compose ----------------------------------------------------------------

for (const harness of ["claude", "kiro"]) {
  describe(`grilling — compose into a ${harness} install`, () => {
    const leaf = targetsTable[harness].harnessLeaf;
    let tmp = "";
    let projection = "";
    let project = "";
    let first: ReturnType<typeof compose>;

    beforeAll(() => {
      tmp = mkdtempSync(join(tmpdir(), `grilling-compose-${harness}-`));
      projection = join(tmp, "dist");
      const build = buildProjection(harness, projection);
      if (build.status !== 0) throw new Error(`build failed: ${build.output}`);
      project = installFixture(harness, tmp);
      first = compose(harness, projection, project);
    });
    afterAll(() => {
      if (tmp) rmSync(tmp, { recursive: true, force: true });
    });

    test("the compose hook exits cleanly", () => {
      expect(first.status, first.output).toBe(0);
    });

    test("every target stage carries the fragment at its anchor", () => {
      const prose = template.trim().replaceAll("{{HARNESS_DIR}}", leaf);
      for (const target of TARGETS) {
        const path = composedStagePath(harness, project, target);
        expect(existsSync(path), path).toBe(true);
        const content = readFileSync(path, "utf-8");
        const open = content.match(SENTINEL_OPEN(target.anchor));
        expect(open, `${target.slug}: open sentinel`).not.toBeNull();
        const close = `<!-- /plugin:${PLUGIN}:${target.anchor}:${ORDER}:${open![1]} -->`;
        const openAt = open!.index!;
        const closeEnd = content.indexOf(close, openAt);
        expect(closeEnd, `${target.slug}: close sentinel`).toBeGreaterThan(openAt);
        expect(content.slice(openAt, closeEnd)).toContain(prose);
        expect(content.match(new RegExp(SENTINEL_OPEN(target.anchor).source, "g"))?.length ?? 0, `${target.slug}: exactly one block`).toBe(1);

        const { kind, step } = anchorKind(target.anchor);
        if (kind === "end") continue;
        const heading = stepHeading(content, step);
        expect(heading, `${target.slug}: ### Step ${step}`).not.toBeNull();
        if (kind === "after") {
          expect(openAt, `${target.slug}: fragment after Step ${step}`).toBeGreaterThan(heading!.end);
          expect(/^#{2,3} /m.test(content.slice(heading!.end, openAt)), `${target.slug}: no heading between Step ${step} and the fragment`).toBe(false);
        } else {
          const blockEnd = closeEnd + close.length;
          expect(blockEnd, `${target.slug}: fragment before Step ${step}`).toBeLessThanOrEqual(heading!.start);
          expect(/^#{2,3} /m.test(content.slice(blockEnd, heading!.start)), `${target.slug}: no heading between the fragment and Step ${step}`).toBe(false);
        }
      }
    });

    test("compose recorded no drops", () => {
      const drops = walk(project, (p) => p.endsWith(".drops"));
      expect(drops.map((p) => `${relative(project, p)}:\n${readFileSync(p, "utf-8")}`)).toEqual([]);
    });

    test("a second compose is a byte-identical no-op", () => {
      const before = new Map(TARGETS.map((t) => [t.slug, readFileSync(composedStagePath(harness, project, t), "utf-8")]));
      const second = compose(harness, projection, project);
      expect(second.status, second.output).toBe(0);
      for (const target of TARGETS) {
        expect(readFileSync(composedStagePath(harness, project, target), "utf-8")).toBe(before.get(target.slug)!);
      }
    });
  });
}

// ---- the shipped compose-tier gate ------------------------------------------

describe("grilling — aidlc-plugin-test.ts", () => {
  let tmp = "";
  beforeAll(() => {
    tmp = mkdtempSync(join(tmpdir(), "grilling-plugin-test-"));
  });
  afterAll(() => {
    if (tmp) rmSync(tmp, { recursive: true, force: true });
  });

  test("passes against a disposable Claude install", () => {
    const project = installFixture("claude", tmp);
    const res = run(
      ["bun", join(toolsDir, "aidlc-plugin-test.ts"), pluginRoot, "--install", project, "--harness", "claude"],
      { timeout: 300_000 },
    );
    expect(res.status, res.output).toBe(0);
  }, 300_000);
});
