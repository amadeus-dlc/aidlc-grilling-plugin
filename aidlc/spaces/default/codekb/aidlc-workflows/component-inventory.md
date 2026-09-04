# Component Inventory — aidlc-workflows（プラグイン機構を中心に）

> 各コンポーネントは `###` 見出しで一意に命名し、`reverse-engineering-timestamp.md` の `analyzed.components` と逐語一致させる。健全性は architecture-guide の RE チェックリストに従い `healthy` / `at-risk` / `degraded` で記す。依存の詳細は `dependencies.md`、契約の詳細は `api-documentation.md` に一度だけ置き、ここでは責務・境界・本 intent との関係に絞る。

## Inventory Summary

| コンポーネント | 主ファイル | 健全性 | intent 関連度 |
|---|---|---|---|
| Plugin Validator | `core/tools/aidlc-plugin-validate.ts` | at-risk | 高 |
| Plugin Projection Emitter | `core/tools/aidlc-plugin-emit.ts` | healthy | 高 |
| Plugin Build CLI | `core/tools/aidlc-plugin-build.ts` | healthy | 高 |
| Plugin Compose Test CLI | `core/tools/aidlc-plugin-test.ts` | healthy | 高 |
| Plugin Scaffold CLI | `core/tools/aidlc-plugin-create.ts` | healthy | 低 |
| Compose Hook Template | `scripts/plugin-hooks-template/compose.ts` | at-risk | 最高 |
| Plugin Compose Launcher | `scripts/plugin-hooks-template/aidlc-plugin-compose.ts` | healthy | 中 |
| Stage Graph Compiler | `core/tools/aidlc-graph.ts` | at-risk | 中 |
| Runner Generator | `core/tools/aidlc-runner-gen.ts` | healthy | 低 |
| Harness Include Repointer | `core/tools/aidlc-includes.ts` | healthy | 低 |
| Packager | `scripts/package.ts` | healthy | 中 |
| Binary Builder | `scripts/build-binaries.ts` | healthy | 低 |
| Harness Manifests | `harness/*/manifest.ts`、`scripts/manifest-types.ts` | healthy | 中 |
| Harness Emitters | `harness/{codex,copilot,opencode}/emit.ts` | healthy | 低 |
| Harness Hook Adapters | `harness/*/hooks/*-adapter.ts`、`harness/opencode/plugin/*.ts` | at-risk | 低 |
| Cursor Installer | `harness/cursor/install.ts` | at-risk | 中 |
| Packager Support Scripts | `scripts/{agent-knowledge,onboarding,ci-changelog-guard,docs-rewrite-links}.ts` | healthy | 低 |
| test-pro Reference Plugin | `plugins/test-pro/` | healthy | 高 |
| Plugin Documentation | `docs/reference/18-plugin-mechanism.md`、`docs/harness-engineering/10-authoring-a-plugin.md` | at-risk | 高 |

## Components

### Plugin Validator

- **責務**: authored plugin root をオフラインで検査し、`{valid, errors, warnings}` を返す。manifest の形と名前、stage schema、scope / agent の識別、成果物衝突、`tools/` のテスト混入、symlink、vendored compose hook のバイト一致、contribution の `target` / `plugin` / `adds.produces` 接頭辞（`aidlc-plugin-validate.ts:751-795`）。
- **境界**: 同梱 `tools/data/plugin-authoring-context.json` を根拠にし、無ければソースツリーへフォールバック（`401-436`）。AIDLC プロジェクトも checkout も不要（`2-6`）。
- **依存**: `node:fs` / `node:path` のみ。他 4 ツールがこれを import する。
- **健全性**: at-risk。contribution 検査が薄く（anchor 名、fragment 対応、本文有無を見ない）、`adds` の YAML 解析が compose と別実装（`455-479` vs `compose.ts:2106-2118`）。
- **intent**: `grilling` の validate は `target` 28 本の存在と `plugin: grilling` しか保証しない。

### Plugin Projection Emitter

- **責務**: 一つの plugin root と一つの `PluginTarget` から、ホストプラグイン射影を `outDir` に書く。所有マーカー、ホスト manifest `aidlc-<name>`、`marketplace.json`、`hooks/compose.ts`（＋ cursor / kiro-ide の launcher）、ホスト配線、`CONTENT_DIRS` のコピー、agent の reviewer knowledge 吸収（`aidlc-plugin-emit.ts:74-82,290-322,324-418,421-458,595-660`）。
- **境界**: packager と standalone builder の **共通実装**（`1-6`）。出力所有マーカーと symlink 拒否で破壊的操作を防ぐ（`511-563`）。`runWithOwnerStampedLock` でビルドを直列化（`31-37,70-72`）。
- **依存**: `aidlc-plugin-validate.ts`、`aidlc-lib.ts`。
- **健全性**: healthy。
- **intent**: `contributions/` はそのままコピーされ、変換は agent ファイルにしか掛からない（`421-458`）。

### Plugin Build CLI

- **責務**: `<plugin-root> <harness> [outDir]` を受け、in-process で validate → `readPluginTargets(plugin-targets.json)` → `buildPluginProjection`。出力境界（既定はプラグインルート）を決めて emitter に渡す（`aidlc-plugin-build.ts:139-152,186-222`）。
- **依存**: emit、validate。
- **健全性**: healthy。
- **intent**: `grilling/scripts/` からハーネスごとに呼ぶ CI の中核。

### Plugin Compose Test CLI

- **責務**: 実インストールの `installRoots` を使い捨て候補へコピーし、射影 build → compose 1 回目（drop 0）→ graph compile → stage / scope 存在 → compose 2 回目（byte 不変）→ 実インストール不変、を一つの JSON verdict にまとめる（`aidlc-plugin-test.ts:187-203,432-472,604-625,665-696,707-728`）。
- **境界**: `--dist` は予約（`787-799`）。共有 leaf（`.kiro`、`.aidlc`）は `--harness` 必須。
- **依存**: build、emit、validate、実 `hooks/compose.ts`（子プロセス）、インストール先 `aidlc-graph.ts`。
- **健全性**: healthy。
- **intent**: stage / scope が空のプラグインでは意味のあるゲートが「drop なし」と「冪等」の 2 つになる。`grilling` の CI が最低限持つべき検査。

### Plugin Scaffold CLI

- **責務**: 6 ファイルの決定的スキャフォールドを非空でないターゲットへ原子的に書く（`aidlc-plugin-create.ts:198-222,260-282,283-330`）。
- **依存**: validate（`validatePluginName`）。
- **健全性**: healthy。
- **intent**: 低（`grilling` は既に存在）。生成物は stage / scope / agent を含み、contributions のみのプラグインの雛形ではない。

### Compose Hook Template

- **責務**: SessionStart（または `aidlc plugin sync`）で走り、プラグインの primitives を no-clobber コピーし、選択で有効なら `contributions/` をコアステージのソースへマージし、sidecar と drops を書き、必要なら graph compile → SKILL.md 表更新 → runner 再生成を行う（`compose.ts:420-2451`）。
- **境界**: 単一ファイル・依存ゼロ、インストール先 `aidlc-lib.ts` / `aidlc-stage-schema.ts` を動的 import（`103-115`）。ワークスペースロック下で実行し、旧エンジンではスキップ（`433-452`）。fail-open（`397-417,1405-1413`）。
- **依存（実行時）**: インストール先 lib / schema / graph / runner-gen、`tools/data/harness.json`。
- **健全性**: at-risk。2451 行の単一ファイル（設計判断、`2-9`）、`after-questions` 未実装（`1711`）、`adds.requires_stage` は advisory drop（`2153-2158`）、Cursor installer にロジック複製、fail-open。
- **intent**: 最高。`grilling` の 28 contribution はすべてこの `locateAnchor` / `spliceFragment` / `pluginEnabledBySelection` / 再コンパイル契機（`2376-2399`: `changed` / graph 欠落 / 再試行マーカー。stage 無しプラグインでは graph 欠落検知が効かずマーカーが唯一の自己修復経路）を通る。

### Plugin Compose Launcher

- **責務**: cursor / kiro-ide 向けの Windows 安全なランチャ。`workspace_roots` から AI-DLC インストールを一意に選び、`aidlc plugin sync` → `bun compose.ts` フォールバック（`aidlc-plugin-compose.ts:11-92`）。
- **依存**: `Bun.which("aidlc")`、同梱 `compose.ts`。
- **健全性**: healthy。
- **intent**: 中（Cursor / Kiro IDE 配布時の入口）。

### Stage Graph Compiler

- **責務**: ステージ frontmatter（コア + プラグイン）を `stage-graph.json` / `scope-grid.json` にコンパイルし、doctor と実行時解決へ 8 関数 API を提供（`aidlc-graph.ts:1-25`）。`compile` は `AIDLC_WORKSPACE_LOCK_OWNER_PID` で親ロックを継承（`2817-2831`）。
- **依存**: `aidlc-lib.ts`、`aidlc-stage-schema.ts`（流し読み）。
- **健全性**: at-risk。2962 行の巨大ファイル、先頭コメントの「31 stage definitions」は現在 33 本と一致しない（コメント drift）。
- **intent**: 中。contributions のみのプラグインは新ノードを追加しないが、マージされた `produces` / `consumes` / `sensors` / `scopes` はここで再コンパイルされて効く。

### Runner Generator

- **責務**: コンパイル済みグラフから `/aidlc-<stage>` ランナー、`/aidlc-init`、`/aidlc-compose`、`runner: true` のスコープランナーを `skills/` に生成し、`check` / `scopes --check` で drift を検出（`aidlc-runner-gen.ts:1-28,109-274,558-591,809-832`）。
- **依存**: `loadGraph()`、`scopes/*.md`。codex / copilot emit が dist 内の本モジュールを `require`。
- **健全性**: healthy。
- **intent**: 低（`grilling` は stage / scope を持たないため生成物に影響しない。compose は `recompiled` 時に `write` を必ず走らせる）。

### Harness Include Repointer

- **責務**: 各ハーネスの native include（Claude `@` stub、Kiro resources glob、Kiro IDE steering、Codex `AIDLC_RULES_DIR`、opencode `instructions`、Cursor `.mdc`）の `aidlc/spaces/<X>/memory` ポインタだけを in-place で書き換える（`aidlc-includes.ts:1-40,176`）。
- **健全性**: healthy。
- **intent**: 低。

### Packager

- **責務**: `core/` + `harness/<name>/` → `dist/<name>/` の 6 段パイプライン（copy + トークン置換、authored surface コピー、graph compile、runner 生成、harness emit、SKILL.md 表更新、`package.ts:9-26`）、`tools/data`（`harness.json`、`plugin-targets.json`、`plugin-authoring-context.json`、hook テンプレート）の生成、`dist/plugins/<name>/<harness>/` の射影（`emitPlugins`、`1109`）、`--check` の drift guard、`plugin build` / `codex trust` サブコマンド。
- **依存**: `aidlc-plugin-emit.ts`、`aidlc-tiers.ts`、`agent-knowledge.ts`、`onboarding.ts`、`harness/*/manifest.ts`（動的 require）、dist 内ツールの子プロセス実行（`789-818`）。
- **健全性**: healthy（1252 行だがサブコマンドごとに区画化）。
- **intent**: 中。`plugin-targets.json` と authoring context の出所。

### Binary Builder

- **責務**: `dist/claude/.claude/tools/aidlc.ts` を `bun build --compile` し（`build-binaries.ts:1731`）、30 種超のゲート（`pluginSelectGate`、`delegatePluginSyncGate`、`realPluginSyncGate` を含む、`611-642,952-1031`）で検証。実行前に `package.ts --check` 必須（`1895-1909`）。
- **健全性**: healthy。
- **intent**: 低。

### Harness Manifests

- **責務**: `HarnessManifest` 型（`scripts/manifest-types.ts:67`）に従い、`coreDirs` / `harnessFiles` / `rulesRename` / `skipRunnerGen` / `emit` / `onboarding` / `plugin?` を宣言する 7 ファイル。`plugin` は copilot `.plugin` store、cursor `.cursor-plugin` cursor、kiro `.kiro-plugin` kiro、kiro-ide `.kiro-plugin` kiro-ide、opencode `.opencode-plugin` store + `installRoots: [".opencode"]`、claude / codex は既定（`<harnessDir>-plugin`、store）。
- **健全性**: healthy。ただし `harness/codex/manifest.ts:34` の `{ src: "rules", dst: "aidlc-rules" }` は `core/rules/` が存在しないため `package.ts:634` の `existsSync` で無視される死んだ行、`harness/kiro/manifest.ts:51-67` は 15 本の agent JSON を手書き列挙、`harness/claude/manifest.ts:78-80` のコメント「Codex is the only harness that ships an emit.ts today」は copilot / opencode にも emit がある現状と食い違う。
- **intent**: 中（`plugin-targets.json` の 7 行の出所）。

### Harness Emitters

- **責務**: codex（`config.toml`、`hooks.json`、`trust-seed.toml`、`AGENTS.md`、agent TOML、`.agents/skills/`）、copilot、opencode の手続き的射影。dist 内 `aidlc-runner-gen.ts` を `require` してランナーを合成（`harness/codex/emit.ts:375-389`、`harness/copilot/emit.ts:112-124`）。
- **健全性**: healthy。
- **intent**: 低。

### Harness Hook Adapters

- **責務**: ハーネス固有のイベント JSON を stdin で受け、`<target>` でコアフックへディスパッチ（codex 14 / copilot 8 / cursor 9 / kiro 13 / kiro-ide 11 ターゲット、opencode は plugin API）。
- **健全性**: at-risk。`aidlc-cursor-adapter.ts` 3079 行（shell 解析・git 安全性判定 `535-2580`）、`kiro-ide/hooks/aidlc-kiro-adapter.ts` 2029 行（legacy Plan Approval 仲介 `175-504,1238-1603`）。`tsconfig.json` から除外され `tsconfig.adapters.json` で dist 側を型検査。
- **intent**: 低（プラグイン合成はこの経路を通らない）。

### Cursor Installer

- **責務**: `dist/cursor` の非破壊インストーラ。project-owned ファイルを保全し、JSON を構造マージし、レシート `.cursor/aidlc-install.json` で管理ファイルを追跡。再インストール時に **compose と同じアルゴリズム** で plugin 合成ステージを再構成する（`hashProse` / `locateAnchor` / `spliceFragment` / `mergeListValues` / `mergeConsumes` / `mergeRequiredSections` / `rebuildPluginComposedStage`、`harness/cursor/install.ts:300-784`）。sidecar の読み取りも独自実装（`126-300`）。
- **健全性**: at-risk。compose との二重実装（同期義務）。
- **intent**: 中（Cursor での再インストール後に `grilling` の fragment が正しく復元されるかは、この実装が compose と一致していることに依存）。

### Packager Support Scripts

- **責務**: `agent-knowledge.ts`（reviewer 集合の収集。`plugins/*/stages` も走査、`33-58`；知識吸収と delegated preflight 注入、`67-126`）、`onboarding.ts`（`CLAUDE.md` / `AGENTS.md` の骨格 + fills 描画）、`manifest-types.ts`（型）、`ci-changelog-guard.ts`、`docs-rewrite-links.ts`。
- **健全性**: healthy。
- **intent**: 低。

### test-pro Reference Plugin

- **責務**: プラグイン機構の一次リファレンス fixture。stages 2（`test-pro-integration` 3.85、`test-pro-full-suite`）、contributions 4（`build-and-test` は `after-step:8` ×3、`after-step:9` ×2、`in:Sensors` ×1）、sensors 2、tools 3（doctor 含む）、scope 1（`runner: true`）、agent 1、knowledge 1、tests 1（`tests/plugin.test.ts` は `validatePluginContent` と、`dist/plugins/test-pro/claude/hooks/compose.ts` を実走させたうえで doctor 出力に `Plugin check (test-pro):` が出ることを検証、`45-91`）。
- **健全性**: healthy。
- **intent**: 高。contribution の書式・fragment 複数・`in:` anchor・doctor 契約の唯一の実例。ただし stage / scope を持つため、contributions のみのケース（`grilling`）の選択・doctor 挙動の証拠にはならない。

### Plugin Documentation

- **責務**: `docs/reference/18-plugin-mechanism.md`（設計原則、構造と manifest、合成モデル、選択と doctor、contribution seam、activation、guards、as-built 状態）と `docs/harness-engineering/10-authoring-a-plugin.md`（著作手順、anchor 表、engine upgrade lifecycle、配布、authoring ツール、テスト階層、rules of the road）。
- **健全性**: at-risk。as-built の ✅ / ⏳ 表記は概ねコードと一致するが、`18:370` の anchor 表は `after-questions` を状態なしで載せ（`18:525` と `10:223` では ⏳）、`18:1-25` の「31 stage definitions」（`aidlc-graph.ts` コメント）など件数の drift がある。
- **intent**: 高。計画の引用元。引用時は `code-quality-assessment.md` の drift 一覧を参照。

## Skimmed Components（束縛集合外、名前と役割のみ）

深読みしていないため `analyzed.components` には含めない。次ステージで深読みを広げる候補。

- `core/tools/aidlc-utility.ts` — `plugin sync`（`handlePluginSync`、`1290-1382`）、`select-plugins`（`knownPluginNames`、`532-545`：コンパイル済みノードの `plugin` と scope メタデータの `plugin` から既知名を集める）、doctor の "Composed plugin surface"。
- `core/tools/aidlc-lib.ts` — `pluginsEnabled`（`464`）、`stageEnabledBySelection`（`477`）、`hooksHealthDir`（`14436`）、`runWithOwnerStampedLock`（`17996`）、`acquireAuditLock`（`18073`）、`releaseAuditLock`（`18107`）、`auditLockOwnedByProcess`（`18122`）、`withAuditLock`（`18632`）。
- `core/tools/aidlc-stage-schema.ts` — compose が `validateStageFrontmatter` を probe する（`compose.ts:397-417`）。
- `core/hooks/aidlc-rebuild-stage-graph.ts` — PostToolUse(Bash) で `aidlc-runtime.ts compile` を起動（ヘッダのみ）。
- `core/aidlc-common/protocols/stage-protocol.md` — 対話モード選択（`Guide me` / `I'll edit the file` / `Chat`）の正準 spec（`372-387`、`463`）。ステージ本文には `Guide me` の記述なし。
- `harness/*/skills/aidlc/question-rendering.md` — 各ハーネスの描画 annex（Claude は `AskUserQuestion`、`harness/claude/skills/aidlc/question-rendering.md:48-58`）。
- `tests/harness/plugin-kit.ts`、`tests/integration/t188-plugin-compose.test.ts` — 合成の統合ガード（export 名とヘッダのみ）。
