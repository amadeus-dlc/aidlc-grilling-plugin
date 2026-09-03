// Live check of the Grill me mode on the Claude Code harness.
//
// Opt-in: runs only when AIDLC_CLAUDE_SDK_LIVE=1 (the same gate the framework
// uses for its own live harness tests). It builds the Claude projection,
// composes it into a disposable copy of the checkout's dist/claude install,
// and drives `/aidlc` through the Claude Agent SDK with tests/harness/
// sdk-drive.ts. The SDK's canUseTool callback receives every AskUserQuestion
// the orchestrator renders — the real tool call, not a prose fallback — so the
// test asserts on the structured options the user would see:
//
//   menu 1  the interaction-mode question: Guide me / I'll edit the file /
//           Chat / Grill me, with Grill me's description verbatim
//   menu 2  after choosing Grill me: exactly one question, the recommended
//           option first and marked "(Recommended)"
//   menu 3  the next question, again alone and with a recommendation, asked
//           only after menu 2's answer was written back with **Mode:** grill
//
// Cost/time: roughly 5 minutes and a few dollars on the default `sonnet`
// model (set GRILLING_LIVE_MODEL to override). Auth: the developer's own
// Claude Code login (CLAUDE_CONFIG_DIR is forwarded); the shipped Bedrock
// default is switched off in the disposable install's settings.local.json,
// mirroring the deep-spec-analysis E2E override.
//
// Run: bun run test:live      (from the plugin root)

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
import { homedir, tmpdir } from "node:os";
import { basename, dirname, join } from "node:path";
import { PLUGIN, pluginRoot } from "../scripts/sync-contributions.ts";
import { driveAidlc, type DriveResult } from "./harness/sdk-drive.ts";

const LIVE = process.env.AIDLC_CLAUDE_SDK_LIVE === "1";
const MODEL = process.env.GRILLING_LIVE_MODEL?.trim() || "sonnet";
const PROMPT =
  "/aidlc --scope feature Build a small command-line tool that prints a personalised greeting for a given name";
const MODE_LABELS = ["Guide me", "I'll edit the file", "Chat", "Grill me"];
const GRILL_ME_DESCRIPTION =
  "Interview me one question at a time with a recommended answer; drill into every branch until we share the same understanding";
const DRIVE_TIMEOUT_MS = 15 * 60_000;

const checkout = (() => {
  const candidates = [process.env.AIDLC_WORKFLOWS_CHECKOUT, join(pluginRoot, "..", "aidlc-workflows")];
  for (const c of candidates) {
    if (c && existsSync(join(c, "core", "tools", "aidlc-plugin-build.ts"))) return c;
  }
  throw new Error("aidlc-workflows checkout not found — run `git submodule update --init` or set AIDLC_WORKFLOWS_CHECKOUT");
})();

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

function run(cmd: string[], options: { cwd?: string; env?: Record<string, string> } = {}) {
  const res = spawnSync(cmd[0], cmd.slice(1), {
    encoding: "utf-8",
    timeout: 120_000,
    cwd: options.cwd,
    env: { ...process.env, ...options.env },
  });
  if (res.status !== 0) throw new Error(`${cmd.join(" ")} failed:\n${res.stdout}\n${res.stderr}`);
  return res;
}

// A disposable Claude install with the plugin composed in and the shipped
// Bedrock default switched off (settings.local.json wins over settings.json).
function provisionInstall(tmp: string): { project: string } {
  const projection = join(tmp, "dist-claude");
  run(["bun", join(checkout, "core", "tools", "aidlc-plugin-build.ts"), pluginRoot, "claude", projection]);
  const project = join(tmp, "project");
  cpSync(join(checkout, "dist", "claude"), project, { recursive: true });
  run([process.execPath, join(projection, "hooks", "compose.ts")], {
    cwd: project,
    env: {
      AIDLC_PLUGIN_ROOT: projection,
      CLAUDE_PLUGIN_ROOT: projection,
      AIDLC_PROJECT_DIR: project,
      CLAUDE_PROJECT_DIR: project,
      AIDLC_HARNESS_DIR: ".claude",
    },
  });
  writeFileSync(
    join(project, ".claude", "settings.local.json"),
    JSON.stringify(
      {
        _comment:
          "Live-test override: disable the shipped Bedrock default and use the developer's Claude Code login. Empty strings neutralize the Bedrock model redirects from settings.json.",
        env: {
          CLAUDE_CODE_USE_BEDROCK: "",
          ANTHROPIC_DEFAULT_FABLE_MODEL: "",
          ANTHROPIC_DEFAULT_OPUS_MODEL: "",
          ANTHROPIC_DEFAULT_SONNET_MODEL: "",
          ANTHROPIC_DEFAULT_HAIKU_MODEL: "",
        },
        model: MODEL,
      },
      null,
      2,
    ),
  );
  return { project };
}

function describeMenus(r: DriveResult): string {
  return r.askedQuestions
    .map((menu, i) => {
      const lines = [`menu ${i + 1}:`];
      for (const q of menu.questions) {
        lines.push(`  [${q.header ?? ""}] ${q.question}`);
        q.options.forEach((o, j) => lines.push(`    ${j + 1}. ${o.label}${o.description ? ` — ${o.description}` : ""}`));
        lines.push(`  answered: ${JSON.stringify(menu.answers[q.question])}`);
      }
      return lines.join("\n");
    })
    .join("\n");
}

describe.skipIf(!LIVE)("grilling — live Claude Code harness (AIDLC_CLAUDE_SDK_LIVE=1)", () => {
  let tmp = "";
  let project = "";
  let result: DriveResult;

  beforeAll(async () => {
    tmp = mkdtempSync(join(tmpdir(), "grilling-live-claude-"));
    ({ project } = provisionInstall(tmp));
    result = await driveAidlc(PROMPT, {
      projectDir: project,
      timeoutMs: DRIVE_TIMEOUT_MS,
      model: MODEL,
      settingSources: ["project", "local"],
      // Menu 1 is the interaction-mode question: choose Grill me. Every later
      // menu takes its first option, which the fragment requires to be the
      // recommended one.
      answerScript: { kind: "sequence", specs: [{ label: "Grill me" }], fallback: { optionIndex: 0 } },
      stopAfterAskUserQuestionAt: 3,
      env: {
        CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR?.trim() || join(homedir(), ".claude"),
        CLAUDE_CODE_USE_BEDROCK: "",
        ANTHROPIC_DEFAULT_FABLE_MODEL: "",
        ANTHROPIC_DEFAULT_OPUS_MODEL: "",
        ANTHROPIC_DEFAULT_SONNET_MODEL: "",
        ANTHROPIC_DEFAULT_HAIKU_MODEL: "",
      },
    });
    console.log(`\n--- live run (${MODEL}) ---\n${describeMenus(result)}\n---`);
  }, DRIVE_TIMEOUT_MS + 60_000);

  afterAll(() => {
    if (tmp && process.env.AIDLC_KEEP_TEMP !== "1") rmSync(tmp, { recursive: true, force: true });
    else if (tmp) console.log(`kept live-test workspace: ${tmp}`);
  });

  test("the run reached three AskUserQuestion menus and stopped there", () => {
    expect(result.timedOut, "drive timed out").toBe(false);
    expect(result.stoppedAfterAskUserQuestion).toBe(true);
    expect(result.askedQuestions.length).toBe(3);
  });

  test("menu 1 offers Grill me as the fourth interaction mode, verbatim", () => {
    const menu = result.askedQuestions[0];
    expect(menu.questions.length).toBe(1);
    const q = menu.questions[0];
    expect(q.options.map((o) => o.label)).toEqual(MODE_LABELS);
    expect(q.options[3].description).toBe(GRILL_ME_DESCRIPTION);
    expect(menu.answers[q.question]).toBe("Grill me");
    const askResults = result.toolResults.filter((t) => t.toolName === "AskUserQuestion");
    expect(askResults.length).toBeGreaterThanOrEqual(1);
    expect(askResults[0].isError).toBe(false);
  });

  test("menus 2 and 3 each ask one question with the recommended option first", () => {
    for (const menu of result.askedQuestions.slice(1)) {
      expect(menu.questions.length).toBe(1);
      const q = menu.questions[0];
      expect(q.options.length).toBeGreaterThanOrEqual(2);
      expect(q.options[0].label, `first option must be marked recommended: ${q.options[0].label}`).toMatch(/\(Recommended\)/);
      expect(menu.answers[q.question]).toBe(q.options[0].label);
    }
  });

  test("the mode choice and the first answer were logged and written back", () => {
    const intents = join(project, "aidlc", "spaces", "default", "intents");
    const questionFiles = walk(intents, (p) => p.endsWith("intent-capture-questions.md"));
    expect(questionFiles.length).toBe(1);
    const questions = readFileSync(questionFiles[0], "utf-8");
    // Menu 2's answer is written back, carrying the mode marker, before menu 3
    // is asked. The marker's exact placement is model-authored formatting, so
    // only its presence is asserted here; the fragment prescribes its own line.
    expect(/^\[Answer\]: \S/m.test(questions)).toBe(true);
    expect(/\*\*Mode:\*\* grill/.test(questions)).toBe(true);

    // Audit shards live at <record>/audit/<host>-<clone>.md; match on path
    // segments, not on a separator, so the lookup also works on Windows.
    const audit = walk(intents, (p) => basename(dirname(p)) === "audit" && p.endsWith(".md"))
      .map((p) => readFileSync(p, "utf-8"))
      .join("\n");
    expect(audit).toContain(`**Options**: ${MODE_LABELS.join(",")}`);
    expect(audit).toMatch(/\*\*Event\*\*: QUESTION_ANSWERED[\s\S]*?\*\*Details\*\*: Grill me/);
    // One DECISION_RECORDED per menu: the mode choice plus each interview question.
    expect((audit.match(/\*\*Event\*\*: DECISION_RECORDED/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

// Keep the file from being an empty suite when the gate is off.
test.skipIf(LIVE)(`live Claude check skipped — set AIDLC_CLAUDE_SDK_LIVE=1 to drive the ${PLUGIN} plugin through the SDK`, () => {});
