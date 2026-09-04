// Installer tests for the grilling plugin (BR8.1–BR8.12, BR10.8).
//
// Mirrors deep-spec-analysis/tests/installer.test.ts. The pure pieces
// (selector exclusivity, tag ordering, manifest validation, tar.gz safety,
// payload hashing) are tested through the exported functions. The end-to-end
// part drives `bun scripts/install.ts` against a disposable Claude install
// (a copy of the checkout's dist/claude, as plugin.test.ts does) with
// `--from <this repository's root>`, so nothing here reaches the network:
// `--tag`, `--ref`, and latest are deliberately not exercised. The
// source-change test edits a temporary copy of the repository root, never
// the checkout itself.
//
// Run: bun test tests/installer.test.ts (from the plugin root)

import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, resolve } from "node:path";
import {
  acquireLocal,
  canonicalPayloadSha256,
  extractTarGz,
  type InstallationProvenance,
  latestStableTag,
  parseStableSemver,
  selectSourceSelector,
  validateManifest,
} from "../scripts/install.ts";
import { PLUGIN, TARGETS, pluginRoot, templatePath } from "../scripts/sync-contributions.ts";

// ---- fixtures ---------------------------------------------------------------

const checkout = (() => {
  const candidates = [process.env.AIDLC_WORKFLOWS_CHECKOUT, join(pluginRoot, "..", "aidlc-workflows")];
  for (const c of candidates) {
    if (c && existsSync(join(c, "dist", "claude", ".claude", "tools", "aidlc-plugin-build.ts"))) return c;
  }
  throw new Error("aidlc-workflows checkout not found — run `git submodule update --init` or set AIDLC_WORKFLOWS_CHECKOUT");
})();
const installerPath = join(pluginRoot, "scripts", "install.ts");
// `--from` names the repository root — the checkout that contains grilling/.
const repoRoot = resolve(pluginRoot, "..");
const manifestVersion = (JSON.parse(readFileSync(join(pluginRoot, ".aidlc-plugin", "plugin.json"), "utf-8")) as {
  version: string;
}).version;
const HARNESS_LEAF = ".claude";
const PROVENANCE = join(HARNESS_LEAF, "tools", "data", "grilling-install.json");
const SENTINEL = `<!-- plugin:${PLUGIN}:`;

const temporaryRoots: string[] = [];

function temporaryRoot(prefix = "grilling-installer-test-"): string {
  const root = mkdtempSync(join(tmpdir(), prefix));
  temporaryRoots.push(root);
  return root;
}

afterAll(() => {
  if (process.env.AIDLC_KEEP_TEMP === "1") return;
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

function installFixture(into: string): string {
  const project = join(into, "project-claude");
  cpSync(join(checkout, "dist", "claude"), project, { recursive: true });
  return project;
}

// A repository root shaped like this one (grilling/.aidlc-plugin/plugin.json)
// whose manifest carries the given fields.
function repoWithManifest(manifest: Record<string, unknown>): string {
  const repo = temporaryRoot("grilling-installer-repo-");
  mkdirSync(join(repo, PLUGIN, ".aidlc-plugin"), { recursive: true });
  writeFileSync(join(repo, PLUGIN, ".aidlc-plugin", "plugin.json"), `${JSON.stringify(manifest)}\n`);
  return repo;
}

function runInstaller(args: string[]) {
  const res = spawnSync("bun", [installerPath, ...args], { encoding: "utf-8", timeout: 180_000 });
  return { ...res, output: `${res.stdout ?? ""}\n${res.stderr ?? ""}` };
}

// A copy of this repository root holding only what the build and the installer
// read (manifest, contributions, scripts, the fragment template) — no
// node_modules, no dist — so a test can edit the SOURCE without touching the
// checkout.
function copyRepoRoot(into: string): string {
  const repo = join(into, "repo");
  for (const part of [".aidlc-plugin", "contributions", "scripts"]) {
    cpSync(join(pluginRoot, part), join(repo, PLUGIN, part), { recursive: true });
  }
  mkdirSync(join(repo, PLUGIN, "tests"), { recursive: true });
  cpSync(templatePath, join(repo, PLUGIN, "tests", "fragment-template.md"));
  return repo;
}

function readProvenance(project: string): InstallationProvenance {
  return JSON.parse(readFileSync(join(project, PROVENANCE), "utf-8")) as InstallationProvenance;
}

// path -> sha256 of every regular file below root, for byte-identity checks.
function snapshot(root: string): Map<string, string> {
  const out = new Map<string, string>();
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) out.set(relative(root, path), createHash("sha256").update(readFileSync(path)).digest("hex"));
    }
  };
  visit(root);
  return out;
}

function composedStagePath(project: string, phase: string, slug: string): string {
  return join(project, HARNESS_LEAF, "aidlc-common", "stages", phase, `${slug}.md`);
}

function tarGz(entries: readonly { name: string; bytes: Uint8Array; type?: string }[]): Uint8Array {
  const chunks: Uint8Array[] = [];
  const encoder = new TextEncoder();
  for (const entry of entries) {
    const header = new Uint8Array(512);
    header.set(encoder.encode(entry.name), 0);
    header.set(encoder.encode("0000777\0"), 100);
    header.set(encoder.encode("0000000\0"), 108);
    header.set(encoder.encode("0000000\0"), 116);
    header.set(encoder.encode(entry.bytes.length.toString(8).padStart(11, "0") + "\0"), 124);
    header.set(encoder.encode("00000000000\0"), 136);
    header.fill(32, 148, 156);
    header[156] = (entry.type ?? "0").charCodeAt(0);
    header.set(encoder.encode("ustar\0"), 257);
    const sum = header.reduce((total, byte) => total + byte, 0);
    header.set(encoder.encode(sum.toString(8).padStart(6, "0") + "\0 "), 148);
    chunks.push(header, entry.bytes);
    const padding = (512 - (entry.bytes.length % 512)) % 512;
    if (padding) chunks.push(new Uint8Array(padding));
  }
  chunks.push(new Uint8Array(1024));
  const size = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const tar = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    tar.set(chunk, offset);
    offset += chunk.length;
  }
  return Bun.gzipSync(tar.slice().buffer as ArrayBuffer);
}

// ---- source selection -------------------------------------------------------

describe("installer source selection", () => {
  test("accepts one selector at a time and defaults to latest (BR8.2)", () => {
    expect(selectSourceSelector({ from: "/repo" })).toEqual({ kind: "local", value: "/repo" });
    expect(selectSourceSelector({ ref: "main" })).toEqual({ kind: "ref", value: "main" });
    expect(selectSourceSelector({ tag: "v1.0.0" })).toEqual({ kind: "tag", value: "v1.0.0" });
    expect(selectSourceSelector({})).toEqual({ kind: "latest", value: "" });
    expect(() => selectSourceSelector({ from: "/repo", tag: "v1.0.0" })).toThrow("mutually exclusive");
    expect(() => selectSourceSelector({ ref: "main", tag: "v1.0.0" })).toThrow("--ref and --tag");
    expect(() => selectSourceSelector({ from: "/repo", ref: "main", tag: "v1.0.0" })).toThrow("mutually exclusive");
  });

  test("selects the greatest stable Semantic Version tag", () => {
    expect(parseStableSemver("v1.2.3")).toEqual([1, 2, 3]);
    expect(parseStableSemver("1.2.3")).toEqual([1, 2, 3]);
    expect(parseStableSemver("v1.2.3-rc.1")).toBeNull();
    expect(parseStableSemver("v01.2.3")).toBeNull();
    expect(latestStableTag(["v0.9.0", "v2.0.0-rc.1", "v1.10.0", "not-a-version"])).toBe("v1.10.0");
    expect(latestStableTag(["v1.0.0-beta.1"])).toBeNull();
  });

  test("accepts only a repository root whose grilling/ manifest is valid (BR8.4)", () => {
    const repo = repoWithManifest({ name: PLUGIN, version: "0.1.0" });
    const plugin = join(repo, PLUGIN);
    expect(acquireLocal(repo).pluginRoot).toBe(plugin);
    expect(acquireLocal(repo).source).toBe("local");
    expect(() => acquireLocal(plugin)).toThrow("plugin root itself was provided");
    expect(() => acquireLocal(temporaryRoot())).toThrow(`${PLUGIN}/.aidlc-plugin/plugin.json`);
    expect(validateManifest(acquireLocal(repo)).version).toBe("0.1.0");

    const renamed = repoWithManifest({ name: "deep-spec-analysis", version: "0.1.0" });
    expect(() => validateManifest(acquireLocal(renamed))).toThrow(`plugin manifest name must be ${PLUGIN}`);
    const prerelease = repoWithManifest({ name: PLUGIN, version: "0.2.0-rc.1" });
    expect(() => validateManifest(acquireLocal(prerelease))).toThrow("stable Semantic Version");
    // A requested tag must equal v<version> (the --tag path's manifest rule).
    expect(() => validateManifest({ ...acquireLocal(repo), requestedTag: "v0.2.0" })).toThrow(
      "tag v0.2.0 does not match manifest version 0.1.0",
    );
    expect(() => validateManifest({ ...acquireLocal(repo), requestedTag: "v0.1.0" })).not.toThrow();
  });
});

// ---- archive and provenance integrity ---------------------------------------

describe("installer archive and provenance integrity", () => {
  test("extracts regular files below the destination", () => {
    const destination = temporaryRoot();
    const payload = new TextEncoder().encode(`{"name":"${PLUGIN}","version":"0.1.0"}\n`);
    extractTarGz(tarGz([
      { name: "repo-rev/", bytes: new Uint8Array(), type: "5" },
      { name: `repo-rev/${PLUGIN}/.aidlc-plugin/plugin.json`, bytes: payload },
    ]), destination);
    const manifest = join(destination, "repo-rev", PLUGIN, ".aidlc-plugin", "plugin.json");
    expect(readFileSync(manifest, "utf-8")).toContain(PLUGIN);
  });

  test("rejects path traversal, absolute paths, and archive links (BR8.5)", () => {
    const destination = temporaryRoot();
    expect(() => extractTarGz(tarGz([{ name: "../escaped", bytes: new Uint8Array() }]), destination)).toThrow("unsafe archive path");
    expect(existsSync(join(destination, "..", "escaped"))).toBe(false);
    expect(() => extractTarGz(tarGz([{ name: "repo/a/../../escaped", bytes: new Uint8Array() }]), destination)).toThrow("unsafe archive path");
    expect(() => extractTarGz(tarGz([{ name: "/etc/escaped", bytes: new Uint8Array() }]), destination)).toThrow("unsafe archive path");
    expect(() => extractTarGz(tarGz([{ name: "repo/link", bytes: new Uint8Array(), type: "2" }]), destination)).toThrow("archive links are not allowed");
    expect(() => extractTarGz(tarGz([{ name: "repo/hardlink", bytes: new Uint8Array(), type: "1" }]), destination)).toThrow("archive links are not allowed");
    expect(readdirSync(destination)).toEqual([]);
  });

  test("hashes path and content bytes in byte-sorted order", () => {
    const a = { path: "tools/a.ts", bytes: new TextEncoder().encode("a") };
    const b = { path: "tools/b.ts", bytes: new TextEncoder().encode("b") };
    expect(canonicalPayloadSha256([b, a])).toBe(canonicalPayloadSha256([a, b]));
    expect(canonicalPayloadSha256([a, b])).not.toBe(
      canonicalPayloadSha256([a, { ...b, bytes: new TextEncoder().encode("B") }]),
    );
    expect(canonicalPayloadSha256([a, b])).not.toBe(
      canonicalPayloadSha256([a, { ...b, path: "tools/c.ts" }]),
    );
    expect(canonicalPayloadSha256([])).toMatch(/^sha256:[0-9a-f]{64}$/);
  });
});

// ---- end to end against a disposable Claude install -------------------------

describe("installer against a disposable Claude install", () => {
  let tmp = "";
  let project = "";

  beforeAll(() => {
    tmp = temporaryRoot("grilling-installer-e2e-");
    project = installFixture(tmp);
  });

  test("rejects bad arguments and sources before touching the target (BR8.1–BR8.4)", () => {
    const before = snapshot(project);

    const combined = runInstaller(["--project", project, "--from", repoRoot, "--tag", "v0.1.0"]);
    expect(combined.status, combined.output).toBe(1);
    expect(combined.stderr).toContain("mutually exclusive");

    const updateWithSelector = runInstaller(["--project", project, "--update", "--from", repoRoot]);
    expect(updateWithSelector.status, updateWithSelector.output).toBe(1);
    expect(updateWithSelector.stderr).toContain("--update cannot be combined");

    const updateWithoutProvenance = runInstaller(["--project", project, "--update"]);
    expect(updateWithoutProvenance.status, updateWithoutProvenance.output).toBe(1);
    expect(updateWithoutProvenance.stderr).toContain("requires installation provenance");

    const unknownHarness = runInstaller(["--project", project, "--harness", "vim", "--from", repoRoot]);
    expect(unknownHarness.status, unknownHarness.output).toBe(1);
    expect(unknownHarness.stderr).toContain('unknown harness "vim"');

    const missingProject = runInstaller(["--project", join(tmp, "nowhere"), "--from", repoRoot]);
    expect(missingProject.status, missingProject.output).toBe(1);
    expect(missingProject.stderr).toContain("project directory not found");

    const renamed = repoWithManifest({ name: "deep-spec-analysis", version: "0.1.0" });
    const wrongName = runInstaller(["--project", project, "--from", renamed]);
    expect(wrongName.status, wrongName.output).toBe(1);
    expect(wrongName.stderr).toContain(`plugin manifest name must be ${PLUGIN}`);

    const bare = temporaryRoot();
    mkdirSync(join(bare, HARNESS_LEAF), { recursive: true });
    writeFileSync(join(bare, HARNESS_LEAF, "sentinel.txt"), "unchanged\n");
    const noToolchain = runInstaller(["--project", bare, "--from", repoRoot]);
    expect(noToolchain.status, noToolchain.output).toBe(1);
    expect(noToolchain.stderr).toContain("AI-DLC plugin toolchain is missing");
    expect(readFileSync(join(bare, HARNESS_LEAF, "sentinel.txt"), "utf-8")).toBe("unchanged\n");

    expect(snapshot(project)).toEqual(before);
    expect(existsSync(join(project, PROVENANCE))).toBe(false);
  }, 180_000);

  test("--dry-run builds and rehearses compose without writing to the target (BR8.11)", () => {
    const before = snapshot(project);
    const res = runInstaller(["--project", project, "--from", repoRoot, "--dry-run"]);
    expect(res.status, res.output).toBe(0);
    expect(res.stdout).toContain("dry run passed");
    expect(snapshot(project)).toEqual(before);
    expect(existsSync(join(project, PROVENANCE))).toBe(false);
  }, 180_000);

  test("--from composes the fragment into every target stage and records provenance (BR8.8, BR8.10, BR8.12)", () => {
    const res = runInstaller(["--project", project, "--from", repoRoot]);
    expect(res.status, res.output).toBe(0);
    expect(res.stdout).toContain("Changed 1");
    expect(res.stdout).toContain("`Grill me` as its fourth option");
    expect(res.stdout).toContain("re-run `/aidlc plugin sync`");

    for (const target of TARGETS) {
      const path = composedStagePath(project, target.phase, target.slug);
      expect(existsSync(path), path).toBe(true);
      expect(readFileSync(path, "utf-8"), `${target.slug}: sentinel`).toContain(SENTINEL);
    }
    expect(TARGETS.length).toBe(28);

    const provenancePath = join(project, PROVENANCE);
    expect(statSync(provenancePath).isFile()).toBe(true);
    const provenance = JSON.parse(readFileSync(provenancePath, "utf-8")) as InstallationProvenance;
    expect(Object.keys(provenance).sort()).toEqual(["installed_at", "payload_sha256", "ref", "source", "version"]);
    expect(provenance.version).toBe(manifestVersion);
    expect(provenance.source).toBe("local");
    expect(provenance.ref).toBe(repoRoot);
    expect(Number.isNaN(Date.parse(provenance.installed_at))).toBe(false);
    expect(provenance.payload_sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
    // The digest covers the projection's contributions: for a contributions-only
    // plugin it must never be the digest of an empty payload.
    expect(provenance.payload_sha256).not.toBe(canonicalPayloadSha256([]));
    // No leftover temporary file from the atomic write.
    expect(readdirSync(join(project, HARNESS_LEAF, "tools", "data")).filter((f) => f.startsWith("grilling-install.json.tmp"))).toEqual([]);
  }, 180_000);

  test("a second run is Changed 0 and leaves the target byte-identical (BR8.7)", () => {
    const before = snapshot(project);
    const res = runInstaller(["--project", project, "--from", repoRoot]);
    expect(res.status, res.output).toBe(0);
    expect(res.stdout).toContain("Changed 0");
    expect(res.stdout).not.toContain("Changed 1");
    expect(snapshot(project)).toEqual(before);
  }, 180_000);
});

// ---- source change detection ------------------------------------------------
// The plugin ships no payload files, so "already installed" must be decided
// from the contributions: a changed fragment in the source has to recompose,
// and only an unchanged source may end with Changed 0.

describe("installer against a source whose fragments change", () => {
  let tmp = "";
  let project = "";
  let repo = "";

  beforeAll(() => {
    tmp = temporaryRoot("grilling-installer-recompose-");
    project = installFixture(tmp);
    repo = copyRepoRoot(tmp);
  });

  test("a changed fragment recomposes with a new digest; the unchanged source is then Changed 0 (BR8.7, BR8.10)", () => {
    const stagePath = composedStagePath(project, "ideation", "intent-capture");
    const marker = "Recompose marker: this sentence exists only in the edited source fragment.";

    const first = runInstaller(["--project", project, "--from", repo]);
    expect(first.status, first.output).toBe(0);
    expect(first.stdout).toContain("Changed 1");
    expect(readFileSync(stagePath, "utf-8")).toContain(SENTINEL);
    expect(readFileSync(stagePath, "utf-8")).not.toContain(marker);
    const initial = readProvenance(project);
    expect(initial.ref).toBe(repo);

    // Edit the source the way a developer does: change the template, then
    // regenerate the 28 contributions from the copy's own generator.
    const template = join(repo, PLUGIN, "tests", "fragment-template.md");
    writeFileSync(template, `${readFileSync(template, "utf-8").trimEnd()}\n\n${marker}\n`);
    const sync = spawnSync("bun", [join(repo, PLUGIN, "scripts", "sync-contributions.ts")], { encoding: "utf-8", timeout: 60_000 });
    expect(sync.status, `${sync.stdout}\n${sync.stderr}`).toBe(0);
    expect(readFileSync(join(repo, PLUGIN, "contributions", "ideation", "intent-capture.md"), "utf-8")).toContain(marker);
    // The checkout's own contributions are untouched.
    expect(readFileSync(join(pluginRoot, "contributions", "ideation", "intent-capture.md"), "utf-8")).not.toContain(marker);

    const second = runInstaller(["--project", project, "--from", repo]);
    expect(second.status, second.output).toBe(0);
    expect(second.stdout).toContain("Changed 1");
    expect(second.stdout).not.toContain("Changed 0");
    for (const target of TARGETS) {
      const path = composedStagePath(project, target.phase, target.slug);
      expect(readFileSync(path, "utf-8"), `${target.slug}: recomposed body`).toContain(marker);
    }
    const recomposed = readProvenance(project);
    expect(recomposed.payload_sha256).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(recomposed.payload_sha256).not.toBe(initial.payload_sha256);
    expect(recomposed.version).toBe(initial.version);
    expect(recomposed.source).toBe(initial.source);
    expect(recomposed.ref).toBe(initial.ref);

    const before = snapshot(project);
    const third = runInstaller(["--project", project, "--from", repo]);
    expect(third.status, third.output).toBe(0);
    expect(third.stdout).toContain("Changed 0");
    expect(third.stdout).not.toContain("Changed 1");
    expect(snapshot(project)).toEqual(before);
    expect(readProvenance(project).payload_sha256).toBe(recomposed.payload_sha256);
  }, 600_000);
});
