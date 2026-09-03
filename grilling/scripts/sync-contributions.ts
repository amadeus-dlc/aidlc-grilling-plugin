#!/usr/bin/env bun
// sync-contributions.ts — regenerate contributions/<phase>/<slug>.md from the
// single fragment source (tests/fragment-template.md) and the anchor table
// below. The 28 contribution files differ only in `target:` and the anchor, so
// they are generated, never hand-edited.
//
// Usage: bun scripts/sync-contributions.ts          # (re)write the files
//        bun scripts/sync-contributions.ts --check  # exit 1 on drift, naming files

import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const PLUGIN = "grilling";
export const ORDER = 100;

export interface ContributionTarget {
  phase: "ideation" | "inception" | "construction" | "operation";
  slug: string;
  anchor: string;
}

// One row per core stage that owns a `<slug>-questions.md`. The anchor sits
// right after the step that generates the questions (or right before the step
// that collects the answers), so the orchestrator reads the fourth mode next to
// the protocol's three. `after-questions` is not implemented by compose.
export const TARGETS: ReadonlyArray<ContributionTarget> = [
  { phase: "ideation", slug: "approval-handoff", anchor: "after-step:2" },
  { phase: "ideation", slug: "feasibility", anchor: "after-step:2" },
  { phase: "ideation", slug: "intent-capture", anchor: "after-step:2" },
  { phase: "ideation", slug: "market-research", anchor: "after-step:2" },
  { phase: "ideation", slug: "rough-mockups", anchor: "after-step:2" },
  { phase: "ideation", slug: "scope-definition", anchor: "after-step:2" },
  { phase: "ideation", slug: "team-formation", anchor: "after-step:2" },
  { phase: "inception", slug: "contract-design", anchor: "before-step:3" },
  { phase: "inception", slug: "delivery-planning", anchor: "after-step:2" },
  { phase: "inception", slug: "domain-design", anchor: "before-step:3" },
  { phase: "inception", slug: "practices-discovery", anchor: "after-step:4" },
  { phase: "inception", slug: "refined-mockups", anchor: "after-step:2" },
  { phase: "inception", slug: "requirements-analysis", anchor: "after-step:6" },
  { phase: "inception", slug: "units-generation", anchor: "before-step:3" },
  { phase: "inception", slug: "user-stories", anchor: "before-step:5" },
  { phase: "construction", slug: "ci-pipeline", anchor: "after-step:2" },
  { phase: "construction", slug: "code-generation", anchor: "after-step:3" },
  { phase: "construction", slug: "functional-design", anchor: "before-step:3" },
  { phase: "construction", slug: "infrastructure-design", anchor: "before-step:3" },
  { phase: "construction", slug: "nfr-design", anchor: "before-step:3" },
  { phase: "construction", slug: "nfr-requirements", anchor: "before-step:4" },
  { phase: "operation", slug: "deployment-execution", anchor: "after-step:2" },
  { phase: "operation", slug: "deployment-pipeline", anchor: "after-step:2" },
  { phase: "operation", slug: "environment-provisioning", anchor: "after-step:2" },
  { phase: "operation", slug: "feedback-optimization", anchor: "after-step:2" },
  { phase: "operation", slug: "incident-response", anchor: "after-step:2" },
  { phase: "operation", slug: "observability-setup", anchor: "after-step:2" },
  { phase: "operation", slug: "performance-validation", anchor: "after-step:2" },
];

export const pluginRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
export const templatePath = join(pluginRoot, "tests", "fragment-template.md");
export const contributionsDir = join(pluginRoot, "contributions");

export function contributionPath(target: ContributionTarget): string {
  return join(contributionsDir, target.phase, `${target.slug}.md`);
}

export function renderContribution(target: ContributionTarget, template: string): string {
  return [
    "---",
    `target: ${target.slug}`,
    `plugin: ${PLUGIN}`,
    "fragments:",
    `  - anchor: ${target.anchor}`,
    `    order: ${ORDER}`,
    "---",
    "",
    `## fragment: ${target.anchor}`,
    "",
    template.trim(),
    "",
  ].join("\n");
}

function existingContributionFiles(): string[] {
  if (!existsSync(contributionsDir)) return [];
  const out: string[] = [];
  for (const phase of readdirSync(contributionsDir)) {
    const dir = join(contributionsDir, phase);
    for (const file of readdirSync(dir)) {
      if (file.endsWith(".md")) out.push(join(dir, file));
    }
  }
  return out.sort();
}

export function sync(options: { check: boolean }): { drift: string[] } {
  const template = readFileSync(templatePath, "utf-8");
  const expected = new Map<string, string>();
  for (const target of TARGETS) expected.set(contributionPath(target), renderContribution(target, template));

  const drift: string[] = [];
  for (const [path, content] of expected) {
    const current = existsSync(path) ? readFileSync(path, "utf-8") : null;
    if (current === content) continue;
    drift.push(`${current === null ? "missing" : "changed"}: ${relative(pluginRoot, path)}`);
    if (!options.check) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, content);
    }
  }
  for (const path of existingContributionFiles()) {
    if (expected.has(path)) continue;
    drift.push(`extra: ${relative(pluginRoot, path)}`);
    if (!options.check) rmSync(path);
  }
  return { drift };
}

if (import.meta.main) {
  const check = process.argv.includes("--check");
  const { drift } = sync({ check });
  if (check) {
    if (drift.length === 0) {
      console.log(`sync-contributions: ${TARGETS.length} contributions match the template`);
    } else {
      console.error("sync-contributions: drift detected — run `bun scripts/sync-contributions.ts`");
      for (const line of drift) console.error(`  ${line}`);
      process.exit(1);
    }
  } else {
    console.log(`sync-contributions: ${TARGETS.length} contributions written (${drift.length} changed)`);
    for (const line of drift) console.log(`  ${line}`);
  }
}
