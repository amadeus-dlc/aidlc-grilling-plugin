#!/usr/bin/env bun
// install.ts — one-command installer for the grilling plugin.
//
// Automates the folder-drop flow documented in aidlc-workflows
// docs/reference/18-plugin-mechanism.md: build the harness projection with
// aidlc-plugin-build.ts, copy it into the target project (the drop IS the
// trust decision — there is no store trust gate on this path), then compose
// via `aidlc plugin sync` or, when the aidlc CLI is absent, by running the
// projection's hooks/compose.ts directly. Compose is idempotent, so
// re-running the installer is safe.
//
// Mirrors deep-spec-analysis/scripts/install.ts (ADR-001): the plugin name,
// repository, provenance file, source-selector exclusivity, the empty
// tombstone list, the completion notes, and one digest rule are the deltas:
// because this plugin ships contributions only (no payload files), the
// provenance digest covers the projection's contributions/** as well, so a
// changed fragment recomposes instead of ending with `Changed 0`.
//
// Usage: bun grilling/scripts/install.ts --project <path>
//        [--harness claude] [--from <repo-root> | --ref <branch> | --tag <tag>]
//        [--update] [--dry-run] [--skip-build]

import { createHash, randomUUID } from "node:crypto";
import {
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { spawnSync } from "node:child_process";

const USAGE =
  "Usage: bun grilling/scripts/install.ts --project <path> [--harness <name>] [--from <repo-root> | --ref <branch> | --tag <tag>] [--update] [--dry-run] [--skip-build]";

const REPOSITORY = "amadeus-dlc/aidlc-grilling-plugin";
const PLUGIN_NAME = "grilling";
const PROVENANCE_FILE = "grilling-install.json";
const USER_AGENT = `${PLUGIN_NAME}-installer`;

export type SourceKind = "local" | "ref" | "tag" | "latest";

export interface InstallationProvenance {
  readonly version: string;
  readonly ref: string;
  readonly source: SourceKind;
  readonly installed_at: string;
  readonly payload_sha256: string;
}

interface ResolvedSource {
  readonly pluginRoot: string;
  readonly source: SourceKind;
  readonly ref: string;
  readonly requestedTag: string | null;
  readonly cleanupRoot: string | null;
}

interface Manifest {
  readonly name?: unknown;
  readonly version?: unknown;
}

type Fetcher = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export function parseStableSemver(value: string): readonly [number, number, number] | null {
  const match = value.match(/^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
}

export function latestStableTag(tags: readonly string[]): string | null {
  return tags
    .map((tag) => ({ tag, parsed: parseStableSemver(tag) }))
    .filter((entry): entry is { tag: string; parsed: readonly [number, number, number] } => entry.parsed !== null)
    .sort((a, b) => {
      for (let i = 0; i < 3; i++) {
        const difference = b.parsed[i] - a.parsed[i];
        if (difference !== 0) return difference;
      }
      return a.tag.localeCompare(b.tag);
    })[0]?.tag ?? null;
}

// BR8.2: at most one source selector; none means the latest stable tag.
// Combining selectors is an error, never a silent precedence.
export function selectSourceSelector(input: {
  readonly from?: string;
  readonly ref?: string;
  readonly tag?: string;
}): { readonly kind: SourceKind; readonly value: string } {
  const given = (
    [
      ["--from", input.from],
      ["--ref", input.ref],
      ["--tag", input.tag],
    ] as const
  ).filter(([, value]) => Boolean(value));
  if (given.length > 1) {
    throw new Error(`source selectors are mutually exclusive, got ${given.map(([flag]) => flag).join(" and ")}`);
  }
  if (input.from) return { kind: "local", value: input.from };
  if (input.ref) return { kind: "ref", value: input.ref };
  if (input.tag) return { kind: "tag", value: input.tag };
  return { kind: "latest", value: "" };
}

export function canonicalPayloadSha256(
  entries: readonly { readonly path: string; readonly bytes: Uint8Array }[],
): string {
  const digest = createHash("sha256");
  for (const entry of [...entries].sort((a, b) => Buffer.compare(Buffer.from(a.path), Buffer.from(b.path)))) {
    digest.update(entry.path);
    digest.update("\0");
    digest.update(entry.bytes);
    digest.update("\0");
  }
  return `sha256:${digest.digest("hex")}`;
}

function isInside(root: string, candidate: string): boolean {
  const rel = relative(root, candidate);
  return rel === "" || (!rel.startsWith(`..${sep}`) && rel !== ".." && !isAbsolute(rel));
}

function tarText(bytes: Uint8Array, start: number, length: number): string {
  const end = bytes.subarray(start, start + length).indexOf(0);
  return new TextDecoder().decode(bytes.subarray(start, start + (end < 0 ? length : end))).trim();
}

// BR8.5: reject `..` segments, absolute paths, and link entries; never write
// outside the extraction root.
export function extractTarGz(archive: Uint8Array, destination: string): void {
  const bytes = Bun.gunzipSync(archive.slice().buffer as ArrayBuffer);
  mkdirSync(destination, { recursive: true });
  for (let offset = 0; offset + 512 <= bytes.length;) {
    const header = bytes.subarray(offset, offset + 512);
    if (header.every((byte) => byte === 0)) break;
    const name = tarText(header, 0, 100);
    const prefix = tarText(header, 345, 155);
    const entryName = prefix ? `${prefix}/${name}` : name;
    const sizeText = tarText(header, 124, 12);
    const size = Number.parseInt(sizeText || "0", 8);
    if (!Number.isSafeInteger(size) || size < 0) throw new Error(`invalid tar size for ${entryName}`);
    if (!entryName || entryName.startsWith("/") || entryName.split("/").includes("..")) {
      throw new Error(`unsafe archive path: ${entryName || "<empty>"}`);
    }
    const target = resolve(destination, entryName);
    if (!isInside(destination, target)) throw new Error(`archive entry escapes extraction root: ${entryName}`);
    const type = String.fromCharCode(header[156] ?? 0);
    const bodyStart = offset + 512;
    const bodyEnd = bodyStart + size;
    if (bodyEnd > bytes.length) throw new Error(`truncated tar entry: ${entryName}`);
    if (type === "2" || type === "1") {
      throw new Error(`archive links are not allowed: ${entryName}`);
    }
    if (type === "5") {
      mkdirSync(target, { recursive: true });
    } else if (type === "0" || type === "\0" || type === "") {
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, bytes.subarray(bodyStart, bodyEnd));
    } else if (type !== "x" && type !== "g" && type !== "L") {
      throw new Error(`unsupported tar entry type ${JSON.stringify(type)}: ${entryName}`);
    }
    offset = bodyStart + Math.ceil(size / 512) * 512;
  }
}

// The authored plugin tree lives at <repo-root>/grilling/ (the directory named
// after the plugin), so a GitHub source archive unpacks to
// <repo>-<rev>/grilling/.aidlc-plugin/plugin.json.
function findPluginRoot(root: string): string | null {
  const visit = (directory: string): string | null => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const child = join(directory, entry.name);
      if (entry.name === PLUGIN_NAME && existsSync(join(child, ".aidlc-plugin", "plugin.json"))) return child;
      const nested = visit(child);
      if (nested) return nested;
    }
    return null;
  };
  return visit(root);
}

async function fetchBytes(url: string, fetcher: Fetcher): Promise<Uint8Array> {
  const response = await fetcher(url, { headers: { "User-Agent": USER_AGENT } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}

export async function resolveLatestTag(fetcher: Fetcher = fetch): Promise<string> {
  const response = await fetcher(`https://api.github.com/repos/${REPOSITORY}/tags?per_page=100`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": USER_AGENT },
  });
  if (!response.ok) throw new Error(`GitHub tags API returned HTTP ${response.status}`);
  const body = await response.json() as unknown;
  if (!Array.isArray(body)) throw new Error("GitHub tags API returned an invalid document");
  const names = body.flatMap((entry) =>
    entry && typeof entry === "object" && typeof (entry as { name?: unknown }).name === "string"
      ? [(entry as { name: string }).name]
      : []
  );
  if (names.length === 0) throw new Error("GitHub tags API returned no tags");
  const tag = latestStableTag(names);
  if (!tag) throw new Error("GitHub repository has no stable Semantic Versioning tag");
  return tag;
}

// BR8.6: only GitHub's public archive endpoints are used; no credentials.
export async function acquireRemote(
  kind: "ref" | "tag" | "latest",
  requested: string,
  fetcher: Fetcher = fetch,
): Promise<ResolvedSource> {
  const resolvedRef = kind === "latest" ? await resolveLatestTag(fetcher) : requested;
  const namespace = kind === "ref" ? "heads" : "tags";
  const url = `https://codeload.github.com/${REPOSITORY}/tar.gz/refs/${namespace}/${encodeURIComponent(resolvedRef)}`;
  const cleanupRoot = mkdtempSync(join(tmpdir(), `${PLUGIN_NAME}-source-`));
  try {
    extractTarGz(await fetchBytes(url, fetcher), cleanupRoot);
    const pluginRoot = findPluginRoot(cleanupRoot);
    if (!pluginRoot) throw new Error(`archive does not contain ${PLUGIN_NAME}/.aidlc-plugin/plugin.json`);
    return {
      pluginRoot,
      source: kind,
      ref: resolvedRef,
      requestedTag: kind === "ref" ? null : resolvedRef,
      cleanupRoot,
    };
  } catch (error) {
    rmSync(cleanupRoot, { recursive: true, force: true });
    throw error;
  }
}

// `--from` names the REPOSITORY root (the checkout that contains grilling/),
// not the plugin root itself — the same meaning as the source archive's root.
export function acquireLocal(repoRoot: string): ResolvedSource {
  const root = resolve(repoRoot);
  if (existsSync(join(root, ".aidlc-plugin", "plugin.json"))) {
    throw new Error(`--from expects a repository root containing ${PLUGIN_NAME}/; the plugin root itself was provided: ${root}`);
  }
  const pluginRoot = join(root, PLUGIN_NAME);
  if (!existsSync(join(pluginRoot, ".aidlc-plugin", "plugin.json"))) {
    throw new Error(`--from expects a repository root with ${PLUGIN_NAME}/.aidlc-plugin/plugin.json: ${root}`);
  }
  return { pluginRoot, source: "local", ref: root, requestedTag: null, cleanupRoot: null };
}

// BR8.4: name must be `grilling`, version a stable SemVer, and a requested
// tag must equal `v<version>`.
export function validateManifest(source: ResolvedSource): { manifest: Manifest; version: string } {
  const path = join(source.pluginRoot, ".aidlc-plugin", "plugin.json");
  let manifest: Manifest;
  try {
    manifest = JSON.parse(readFileSync(path, "utf-8")) as Manifest;
  } catch (error) {
    throw new Error(`cannot read plugin manifest ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (manifest.name !== PLUGIN_NAME) throw new Error(`plugin manifest name must be ${PLUGIN_NAME}`);
  if (typeof manifest.version !== "string" || !parseStableSemver(manifest.version)) {
    throw new Error("plugin manifest version must be a stable Semantic Version");
  }
  if (source.requestedTag && source.requestedTag.replace(/^v/, "") !== manifest.version) {
    throw new Error(`tag ${source.requestedTag} does not match manifest version ${manifest.version}`);
  }
  return { manifest, version: manifest.version };
}

interface PluginTarget {
  harnessName: string;
  harnessLeaf: string;
  // "store" hosts (claude, codex, copilot, opencode) keep the plugin outside
  // the project, so compose reads straight from dist/ and nothing is copied.
  // The storeless kinds (kiro, kiro-ide, cursor) expect the projection
  // folder-dropped into the project root.
  kind: "store" | "kiro" | "kiro-ide" | "cursor";
}

function fail(message: string): never {
  console.error(`install: ${message}`);
  process.exit(1);
}

function run(
  label: string,
  command: string[],
  options: { cwd?: string; env?: Record<string, string> } = {},
): void {
  console.log(`\n▸ ${label}`);
  const result = spawnSync(command[0], command.slice(1), {
    stdio: "inherit",
    cwd: options.cwd,
    env: options.env ? { ...process.env, ...options.env } : process.env,
  });
  if (result.error) fail(`${label} failed: ${result.error.message}`);
  if (result.status !== 0) fail(`${label} exited with status ${result.status}`);
}

// ---- arguments --------------------------------------------------------------

if (import.meta.main) {
let projectArg = "";
let harness = "claude";
let dryRun = false;
let skipBuild = false;
let fromArg = "";
let refArg = "";
let tagArg = "";
let update = false;

const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === "--project") projectArg = args[++i] ?? "";
  else if (arg === "--harness") harness = args[++i] ?? "";
  else if (arg === "--from") fromArg = args[++i] ?? "";
  else if (arg === "--ref") refArg = args[++i] ?? "";
  else if (arg === "--tag") tagArg = args[++i] ?? "";
  else if (arg === "--update") update = true;
  else if (arg === "--dry-run") dryRun = true;
  else if (arg === "--skip-build") skipBuild = true;
  else if (arg === "--help" || arg === "-h") {
    console.log(USAGE);
    process.exit(0);
  } else fail(`unknown argument "${arg}"\n${USAGE}`);
}
if (!projectArg) fail(`--project is required\n${USAGE}`);

let selector: { readonly kind: SourceKind; readonly value: string };
try {
  selector = selectSourceSelector({ from: fromArg, ref: refArg, tag: tagArg });
} catch (error) {
  fail(`${error instanceof Error ? error.message : String(error)}\n${USAGE}`);
}

// ---- workspace layout -------------------------------------------------------

const projectDir = resolve(projectArg);
if (!existsSync(projectDir) || !statSync(projectDir).isDirectory()) {
  fail(`project directory not found: ${projectDir}`);
}
const harnessLeaves: Readonly<Record<string, string>> = {
  claude: ".claude",
  codex: ".codex",
  copilot: ".aidlc",
  cursor: ".cursor",
  kiro: ".kiro",
  "kiro-ide": ".kiro",
  opencode: ".aidlc",
};
const expectedLeaf = harnessLeaves[harness];
if (!expectedLeaf) fail(`unknown harness "${harness}" — expected one of: ${Object.keys(harnessLeaves).sort().join(", ")}`);
const toolsDir = join(projectDir, expectedLeaf, "tools");
const builderPath = join(toolsDir, "aidlc-plugin-build.ts");
const pluginTestPath = join(toolsDir, "aidlc-plugin-test.ts");
const targetsPath = join(toolsDir, "data", "plugin-targets.json");
if (!existsSync(builderPath) || !existsSync(pluginTestPath) || !existsSync(targetsPath)) {
  fail(
    `AI-DLC plugin toolchain is missing under ${toolsDir} — install AI-DLC for the ` +
      `"${harness}" harness first, then re-run this installer`,
  );
}
const targets = JSON.parse(readFileSync(targetsPath, "utf-8")) as Record<
  string,
  PluginTarget
>;
const target = targets[harness];
if (!target) {
  fail(
    `unknown harness "${harness}" — expected one of: ${Object.keys(targets).sort().join(", ")}`,
  );
}

if (!existsSync(join(projectDir, target.harnessLeaf))) {
  fail(
    `${projectDir} has no ${target.harnessLeaf}/ — install AI-DLC v2 for the ` +
      `"${harness}" harness there first (see aidlc-workflows dist/${harness}/)`,
  );
}

const provenancePath = join(projectDir, target.harnessLeaf, "tools", "data", PROVENANCE_FILE);

function readProvenance(): InstallationProvenance | null {
  if (!existsSync(provenancePath)) return null;
  try {
    const value = JSON.parse(readFileSync(provenancePath, "utf-8")) as InstallationProvenance;
    if (
      typeof value.version !== "string" ||
      typeof value.ref !== "string" ||
      !["local", "ref", "tag", "latest"].includes(value.source) ||
      typeof value.installed_at !== "string" ||
      !/^sha256:[0-9a-f]{64}$/.test(value.payload_sha256)
    ) return null;
    return value;
  } catch {
    return null;
  }
}

// BR8.3: --update reuses the recorded source; a fixed tag is already final.
const existingProvenance = readProvenance();
if (update && selector.kind !== "latest") fail("--update cannot be combined with --from, --ref, or --tag");
if (update && !existingProvenance) {
  fail("--update requires installation provenance; run a normal install with --from, --ref, --tag, or latest first");
}
if (update && existingProvenance?.source === "tag") {
  console.log(`Changed 0 — fixed tag ${existingProvenance.ref} is already installed`);
  process.exit(0);
}

let resolvedSource: ResolvedSource;
try {
  if (update && existingProvenance) {
    resolvedSource = existingProvenance.source === "local"
      ? acquireLocal(existingProvenance.ref)
      : await acquireRemote(
          existingProvenance.source === "ref" ? "ref" : "latest",
          existingProvenance.source === "ref" ? existingProvenance.ref : "",
        );
  } else if (selector.kind === "local") {
    resolvedSource = acquireLocal(selector.value);
  } else if (selector.kind === "ref") {
    resolvedSource = await acquireRemote("ref", selector.value);
  } else if (selector.kind === "tag") {
    resolvedSource = await acquireRemote("tag", selector.value);
  } else if (skipBuild) {
    // Development-only compatibility: --skip-build intentionally consumes the
    // already-built projection beside this script and never performs network I/O.
    const localPluginRoot = dirname(import.meta.dir);
    resolvedSource = {
      pluginRoot: localPluginRoot,
      source: "local",
      ref: dirname(localPluginRoot),
      requestedTag: null,
      cleanupRoot: null,
    };
  } else {
    resolvedSource = await acquireRemote("latest", "");
  }
} catch (error) {
  fail(`source acquisition failed: ${error instanceof Error ? error.message : String(error)}`);
}
const pluginRoot = resolvedSource.pluginRoot;
if (resolvedSource.cleanupRoot) {
  process.on("exit", () => rmSync(resolvedSource.cleanupRoot!, { recursive: true, force: true }));
}
let pluginVersion = "";
try {
  pluginVersion = validateManifest(resolvedSource).version;
} catch (error) {
  fail(`source validation failed: ${error instanceof Error ? error.message : String(error)}`);
}

// ---- build ------------------------------------------------------------------

const distDir = join(pluginRoot, "dist", harness);
if (skipBuild) {
  if (!existsSync(distDir)) fail(`--skip-build but ${distDir} does not exist`);
} else {
  run(`build dist/${harness}/`, [
    "bun",
    builderPath,
    pluginRoot,
    harness,
  ]);
}

// ---- dry run ----------------------------------------------------------------
// BR8.11: aidlc-plugin-test.ts composes into a temporary copy of the install
// roots, so the target project is never written.

if (dryRun) {
  run("compose dry-run (target is not modified)", [
    "bun",
    pluginTestPath,
    pluginRoot,
    "--install",
    projectDir,
    "--harness",
    harness,
  ]);
  console.log("\n✓ dry run passed — rerun without --dry-run to install");
  process.exit(0);
}

// ---- upgrade refresh --------------------------------------------------------
// The compose hook copies payload files no-clobber: new files land, but a
// file that already exists in the harness tree is never overwritten. That is
// the right default for a user-owned tree — and the wrong one for a plugin
// UPGRADE, where it leaves the previous version's files coexisting with the
// new version's. Before composing, remove the plugin's OWN payload files from
// the harness tree so compose re-places the current versions. Only files this
// plugin's projection ships are touched; contribution merges into core stages
// are content-based and refresh themselves.
//
// BR8.9: grilling ships contributions only, so none of these directories
// exist in its projection and the refresh is a no-op (0 files). The step is
// kept so a future payload-bearing release upgrades correctly.

const PAYLOAD_MAP: [string, string[]][] = [
  ["sensors", ["sensors"]],
  ["tools", ["tools"]],
  ["knowledge", ["knowledge"]],
  ["agents", ["agents"]],
  ["scopes", ["scopes"]],
  ["stages", ["aidlc-common", "stages"]],
];

function walkFiles(root: string): string[] {
  const out: string[] = [];
  const visit = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, entry.name);
      if (entry.isDirectory()) visit(p);
      else out.push(relative(root, p));
    }
  };
  visit(root);
  return out.sort();
}

function payloadDigest(entries: readonly { path: string; bytes: Uint8Array }[]): string {
  return canonicalPayloadSha256(entries);
}

function candidatePayloadEntries(): { path: string; bytes: Uint8Array }[] {
  const entries: { path: string; bytes: Uint8Array }[] = [];
  for (const [srcDir, dstParts] of PAYLOAD_MAP) {
    const srcRoot = join(distDir, srcDir);
    if (!existsSync(srcRoot)) continue;
    for (const rel of walkFiles(srcRoot)) {
      const source = join(srcRoot, rel);
      if (lstatSync(source).isSymbolicLink()) continue;
      entries.push({
        path: [...dstParts, ...rel.split(sep)].join("/"),
        // Compose materializes harness placeholders in Markdown payloads. Hash
        // the bytes that will exist in the destination, not the projection
        // template bytes, so an unchanged source can be recognized pre-write.
        bytes: Buffer.from(
          readFileSync(source, "utf-8").replaceAll("{{HARNESS_DIR}}", target.harnessLeaf),
          "utf-8",
        ),
      });
    }
  }
  return entries;
}

// The projection's contributions/** — the fragments compose merges INTO the
// core stages by content. They never land in the harness tree under their own
// names, so they cannot be compared against the destination the way payload
// files are; but they are what this plugin actually installs, so they enter
// the provenance digest (BR8.7): a changed fragment in the source must not be
// mistaken for "already installed" just because the payload map is empty.
function candidateContributionEntries(): { path: string; bytes: Uint8Array }[] {
  const srcRoot = join(distDir, "contributions");
  if (!existsSync(srcRoot)) return [];
  const entries: { path: string; bytes: Uint8Array }[] = [];
  for (const rel of walkFiles(srcRoot)) {
    const source = join(srcRoot, rel);
    if (lstatSync(source).isSymbolicLink()) continue;
    entries.push({
      path: ["contributions", ...rel.split(sep)].join("/"),
      bytes: Buffer.from(
        readFileSync(source, "utf-8").replaceAll("{{HARNESS_DIR}}", target.harnessLeaf),
        "utf-8",
      ),
    });
  }
  return entries;
}

function installedPayloadEntries(): { path: string; bytes: Uint8Array }[] | null {
  const entries: { path: string; bytes: Uint8Array }[] = [];
  for (const candidate of candidatePayloadEntries()) {
    if (candidate.path === `tools/data/${PROVENANCE_FILE}`) continue;
    const installed = join(projectDir, target.harnessLeaf, ...candidate.path.split("/"));
    if (!existsSync(installed) || !lstatSync(installed).isFile() || lstatSync(installed).isSymbolicLink()) return null;
    entries.push({ path: candidate.path, bytes: readFileSync(installed) });
  }
  return entries;
}

function sameResolvedSource(provenance: InstallationProvenance): boolean {
  return provenance.source === resolvedSource.source && provenance.ref === resolvedSource.ref;
}

// BR8.10: five fields, written to a temporary file and renamed into place.
// `payload_sha256` is the digest over the payload files AND the projection's
// contributions (see provenanceDigest), not over payload files alone.
function writeProvenance(payloadSha256: string): void {
  const provenance: InstallationProvenance = {
    version: pluginVersion,
    ref: resolvedSource.ref,
    source: resolvedSource.source,
    installed_at: new Date().toISOString(),
    payload_sha256: payloadSha256,
  };
  mkdirSync(dirname(provenancePath), { recursive: true });
  const temporary = `${provenancePath}.tmp-${process.pid}-${randomUUID()}`;
  try {
    writeFileSync(temporary, `${JSON.stringify(provenance, null, 2)}\n`, { flag: "wx" });
    renameSync(temporary, provenancePath);
  } finally {
    rmSync(temporary, { force: true });
  }
}

function refreshPluginPayloads(): number {
  let refreshed = 0;
  for (const [srcDir, dstParts] of PAYLOAD_MAP) {
    const srcRoot = join(distDir, srcDir);
    if (!existsSync(srcRoot)) continue;
    for (const rel of walkFiles(srcRoot)) {
      const dst = join(projectDir, target.harnessLeaf, ...dstParts, rel);
      if (existsSync(dst)) {
        rmSync(dst, { force: true });
        refreshed += 1;
      }
    }
  }
  return refreshed;
}

// Tombstones for retired payloads: files or directories a previous version
// shipped that the current dist no longer carries. Compose is no-clobber and
// the refresh above only removes what the current dist still ships, so an
// orphan survives every upgrade unless it is listed here.
interface RemovedPayload {
  readonly parts: readonly string[];
  // "directory" removes the whole tree (a retired layer, not a single file).
  readonly kind: "file" | "directory";
}

// BR8.9: empty. grilling has only ever shipped contributions (merged into the
// core stages by content, never as files of its own), so there is nothing to
// retire. Append here in the same change that retires a payload file.
const REMOVED_PAYLOADS: readonly RemovedPayload[] = [];

// The digest recorded in provenance and compared against it: payload files
// plus contributions. Paths never collide (contributions/ is not in
// PAYLOAD_MAP) and canonicalPayloadSha256 sorts by path, so the concatenation
// order is irrelevant.
function provenanceDigest(
  payload: readonly { path: string; bytes: Uint8Array }[],
  contributions: readonly { path: string; bytes: Uint8Array }[],
): string {
  return payloadDigest([...payload, ...contributions]);
}

const beforePayload = installedPayloadEntries();
const candidatePayload = candidatePayloadEntries();
const candidateContributions = candidateContributionEntries();
const candidateDigest = provenanceDigest(candidatePayload, candidateContributions);
const hasTombstonedPayload = REMOVED_PAYLOADS.some((payload) =>
  existsSync(join(projectDir, target.harnessLeaf, ...payload.parts))
);
// BR8.7: same source and ref, same version, no tombstoned file left behind,
// the destination's payload files byte-equal to the candidate's (payload files
// only — contributions have no file of their own in the harness tree), and
// the recorded provenance digest (payload files + contributions) equal to the
// candidate's — nothing to do. A changed fragment in the source fails the last
// test and recomposes; an engine update that overwrote the composed stages
// changes neither side and is not detected here (re-run `/aidlc plugin sync`).
if (
  existingProvenance &&
  sameResolvedSource(existingProvenance) &&
  existingProvenance.version === pluginVersion &&
  beforePayload &&
  !hasTombstonedPayload &&
  payloadDigest(beforePayload) === payloadDigest(candidatePayload) &&
  existingProvenance.payload_sha256 === candidateDigest
) {
  console.log(`Changed 0 — ${resolvedSource.source} ${resolvedSource.ref} is already installed`);
  process.exit(0);
}

function removeTombstonedPayloads(): number {
  let removed = 0;
  for (const payload of REMOVED_PAYLOADS) {
    const dst = join(projectDir, target.harnessLeaf, ...payload.parts);
    if (!existsSync(dst)) continue;
    try {
      rmSync(dst, { force: true, recursive: payload.kind === "directory" });
    } catch (error) {
      // An orphan that cannot be removed must not be ignored: the next compose
      // would leave the stale file in place.
      fail(`cannot remove retired payload ${dst}: ${error instanceof Error ? error.message : String(error)}`);
    }
    removed += 1;
  }
  return removed;
}

const refreshed = refreshPluginPayloads();
if (refreshed > 0) {
  console.log(
    `\n▸ upgrade refresh: removed ${refreshed} previously composed plugin file(s) so compose re-places the current versions`,
  );
}
const tombstoned = removeTombstonedPayloads();
if (tombstoned > 0) {
  console.log(
    `\n▸ upgrade cleanup: removed ${tombstoned} retired plugin file(s) that this version no longer ships`,
  );
}

// ---- drop (storeless harnesses only) + compose ------------------------------
// BR8.8: store harnesses compose straight from dist/; storeless harnesses get
// the projection folder-dropped into the project first. `aidlc plugin sync`
// is preferred when the CLI is on PATH; otherwise the projection's own
// hooks/compose.ts runs with the same environment.

if (target.kind === "store") {
  console.log(
    `\n▸ ${harness} is a store harness — composing directly from dist/, nothing is copied into the project`,
  );
} else {
  console.log(`\n▸ copy ${distDir} → ${projectDir} (folder-drop, ${target.kind} layout)`);
  cpSync(distDir, projectDir, { recursive: true });
}

const composeEnv = {
  AIDLC_PLUGIN_ROOT: distDir,
  AIDLC_PROJECT_DIR: projectDir,
  AIDLC_HARNESS_DIR: target.harnessLeaf,
  AIDLC_HARNESS_NAME: target.harnessName,
};
const aidlcBin = Bun.which("aidlc");
if (aidlcBin) {
  run("compose (aidlc plugin sync)", [aidlcBin, "plugin", "sync"], {
    cwd: projectDir,
    env: composeEnv,
  });
} else {
  run("compose (hooks/compose.ts)", ["bun", join(distDir, "hooks", "compose.ts")], {
    cwd: projectDir,
    env: composeEnv,
  });
}

// ---- verify -----------------------------------------------------------------
// The projection ships contributions only, so the one artifact compose must
// leave behind is the fragment merged into a target stage. Check a single
// core stage for the plugin's sentinel, the way the reference installer
// checks a single sensor file: a missing sentinel means compose ran but the
// fragment did not land.

const sentinelStage = join(
  projectDir,
  target.harnessLeaf,
  "aidlc-common",
  "stages",
  "inception",
  "requirements-analysis.md",
);
if (!existsSync(sentinelStage) || !readFileSync(sentinelStage, "utf-8").includes(`<!-- plugin:${PLUGIN_NAME}:`)) {
  fail(`compose finished but ${sentinelStage} carries no ${PLUGIN_NAME} fragment — check the compose output above`);
}

const installedPayload = installedPayloadEntries();
if (!installedPayload) fail("compose completed but one or more plugin-owned payload files are missing");
// Record the destination's payload bytes plus the contributions that were just
// composed, so the next run's candidate digest matches exactly when — and only
// when — the source is unchanged.
writeProvenance(provenanceDigest(installedPayload, candidateContributions));

// BR8.12 / ADR-007: how to see the mode, and what to do after an engine update.
console.log(
  `\n✓ installed into ${projectDir} (${target.harnessLeaf}/) — ` +
    "the Grill me mode is composed into every question stage.\n" +
    "  Next: at the next question stage, the mode menu offers `Grill me` as its fourth option.\n" +
    "  Note: after reinstalling or updating the AI-DLC engine, re-run `/aidlc plugin sync` to compose it again.",
);
console.log(`Changed 1 — recorded ${pluginVersion} from ${resolvedSource.source} ${resolvedSource.ref}`);
}
