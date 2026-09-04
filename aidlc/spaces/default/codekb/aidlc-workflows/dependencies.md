# Dependencies — aidlc-workflows

> 外部依存は `package.json` と設定ファイル、内部依存は深読み範囲の import / `require` / 子プロセス起動 / 動的 import を実測したもの。バージョンは `technology-stack.md` に一度だけ記す。

## External Dependencies

| 種別 | 依存先 | 使う側 | 備考 |
|---|---|---|---|
| ランタイム | bun（Bun API + `node:*`） | すべて | ランタイム npm 依存はゼロ |
| devDependency | `typescript`、`@biomejs/biome`、`bun-types` | 型検査・lint | CI `check` ジョブ |
| devDependency | `smol-toml` | `harness/codex/emit.ts:21` | Codex 設定生成 |
| devDependency | `@anthropic-ai/claude-agent-sdk`、`@xterm/headless`、`node-pty` | `tests/harness/*`（一覧のみ） | ライブテストのみ。CI では `--no-llm` で除外 |
| 外部 CLI（任意） | `aidlc` バイナリ、`bun`（`$HOME/.bun/bin/bun` フォールバック） | ホスト SessionStart 配線（`aidlc-plugin-emit.ts:337-351`）、launcher（`aidlc-plugin-compose.ts:76-91`） | どちらも無ければ compose はスキップ（store 系は「skipping」を stderr に出して exit 0） |
| 外部 CLI（テスト） | `claude`、`codex`、`kiro`、`copilot`、`tmux` | ライブテスト層 | `tests/README.md` |
| 外部サービス | AWS Bedrock（Claude モデル） | ライブテスト、利用時の `settings.json` 既定 | フレームワーク本体は不要 |

## Internal Cross-package Dependencies（深読み範囲）

### 静的 import（`aidlc-workflows/` 相対）

| 依存元 | 依存先 | 根拠 |
|---|---|---|
| `core/tools/aidlc-plugin-build.ts` | `./aidlc-plugin-emit.ts`（`buildPluginProjection`、`readPluginTargets`）、`./aidlc-plugin-validate.ts` | `build.ts:13-23` |
| `core/tools/aidlc-plugin-emit.ts` | `./aidlc-plugin-validate.ts`（`assertPluginContentHasNoSymlinks`、`assertSupportedPluginContributionPaths`、`scanPluginFiles`、`walkPluginFiles`）、`./aidlc-lib.ts`（`runWithOwnerStampedLock`） | `emit.ts:31-37` |
| `core/tools/aidlc-plugin-test.ts` | `./aidlc-plugin-build.ts` / `./aidlc-plugin-emit.ts` / `./aidlc-plugin-validate.ts`（`validatePluginRoot`、`walkPluginFiles` 他） | `test.ts:40-43` |
| `core/tools/aidlc-plugin-create.ts` | `./aidlc-plugin-validate.ts`（`validatePluginName`、finding 型） | `create.ts:15-18` |
| `core/tools/aidlc-plugin-validate.ts` | `node:fs` / `node:path` のみ | `validate.ts:8-33` |
| `scripts/package.ts` | `../core/tools/aidlc-plugin-emit.ts`（`buildPluginProjection`、型）、`../core/tools/aidlc-tiers.ts`、`./agent-knowledge.ts`、`./onboarding.ts` | `package.ts:66-73` |
| `scripts/build-binaries.ts` | `../dist/claude/.claude/tools/aidlc-version.ts`（`AIDLC_VERSION`） | `build-binaries.ts:30` |
| `harness/*/manifest.ts` | `../../scripts/manifest-types.ts`、（codex / copilot / opencode は）`./emit.ts`、`./onboarding.fills.ts` | 各 manifest |
| `plugins/test-pro/tests/plugin.test.ts` | `../../../tests/harness/plugin-kit.ts` | `plugin.test.ts:19-22` |
| `scripts/plugin-hooks-template/compose.ts`、`aidlc-plugin-compose.ts` | **静的 import なし**（`node:*` のみ） | `compose.ts:2-9`、`aidlc-plugin-compose.ts:6-9` |

### 動的 `require` / `import`

| 依存元 | 依存先 | 根拠 |
|---|---|---|
| `scripts/package.ts` | `harness/<name>/manifest.ts`（`require`、既定エクスポート） | `package.ts:896-899` |
| `harness/codex/emit.ts`、`harness/copilot/emit.ts` | 組み立て済み dist 内 `<harnessDir>/tools/aidlc-runner-gen.ts`（`require`） | `codex/emit.ts:381-389`、`copilot/emit.ts:114-124` |
| `compose.ts` | インストール先 `<harness>/tools/aidlc-lib.ts`、`aidlc-stage-schema.ts`（`import()`、失敗時 `null` = fail-open） | `compose.ts:103-115` |
| `core/tools/aidlc-utility.ts plugin sync`（流し読み） | プラグインルートの `hooks/compose.ts`（`compose()` export を要求） | `utility.ts:1356` |

### 子プロセス起動

| 起動元 | 起動対象 | 環境 | 根拠 |
|---|---|---|---|
| `scripts/package.ts` | dist 内 `tools/aidlc-graph.ts compile`、`tools/aidlc-runner-gen.ts write|scopes`、`tools/aidlc-utility.ts stage-table|scope-table` | `AIDLC_SRC`、`AIDLC_HARNESS_DIR`、`AIDLC_HARNESS_NAME`、`AIDLC_RULES_DIR` | `package.ts:789-818` |
| `scripts/build-binaries.ts` | `scripts/package.ts --check`、`bun build --compile`、生成バイナリの各ゲート | — | `build-binaries.ts:1731,1895-1909` |
| `compose.ts` | インストール先 `aidlc-graph.ts compile`、`aidlc-runner-gen.ts write` / `scopes` | `installedToolEnv()`（`AIDLC_WORKSPACE_LOCK_OWNER_PID` を含む） | `compose.ts:2379-2433` |
| `core/tools/aidlc-plugin-test.ts` | 候補内 `hooks/compose.ts`、候補内 `aidlc-graph.ts compile` | `AIDLC_PROJECT_DIR`、`AIDLC_HARNESS_DIR`、`AIDLC_HARNESS_NAME`、`AIDLC_STAGE_GRAPH`、`AIDLC_SCOPE_GRID`、`AIDLC_STAGES_DIR`、`AIDLC_SENSORS_DIR`、`AIDLC_SCOPES_DIR`、`AIDLC_AGENTS_DIR`、`AIDLC_RULES_DIR` | `test.ts:432-472` |
| `aidlc-plugin-compose.ts` | `aidlc plugin sync` → `bun compose.ts` | `AIDLC_HARNESS_DIR`、`AIDLC_PLUGIN_ROOT`、`AIDLC_PROJECT_DIR`、`CLAUDE_*`、`CURSOR_PROJECT_DIR`、`PLUGIN_ROOT` | `aidlc-plugin-compose.ts:62-91` |
| ホスト SessionStart | `aidlc plugin sync` または `bun <root>/hooks/compose.ts` | `AIDLC_HARNESS_DIR`、`AIDLC_HARNESS_NAME` | `emit.ts:324-351` |
| `plugins/test-pro/tests/plugin.test.ts` | `dist/plugins/test-pro/claude/hooks/compose.ts`、`.claude/tools/aidlc-utility.ts doctor` | `CLAUDE_PLUGIN_ROOT`、`CLAUDE_PROJECT_DIR`、`AIDLC_HARNESS_DIR` | `plugin.test.ts:52-63,73-86` |

### データファイル経由の依存

| 生産者 | ファイル | 消費者 |
|---|---|---|
| `package.ts` | `tools/data/plugin-targets.json` | `aidlc-plugin-build.ts`（`bundledPluginTargetsPath`）、`aidlc-plugin-test.ts` |
| `package.ts` | `tools/data/plugin-authoring-context.json` | `aidlc-plugin-validate.ts` |
| `package.ts` | `tools/data/plugin-hooks-template/*` | `aidlc-plugin-emit.ts`（注入）、`aidlc-plugin-validate.ts`（バイト比較） |
| `package.ts` | `tools/data/harness.json`（`name` 等）；`select-plugins` が `plugins` キーを追記 | `compose.ts`（`HARNESS_NAME`、選択）、`aidlc-lib.ts` |
| `compose.ts` | `tools/data/plugin-contrib-<key>.json`、`plugin-files-<key>.json` | doctor、`select-plugins`（strip）、`harness/cursor/install.ts`（`126-300`） |
| `compose.ts` | `<hooksHealthDir>/plugin-compose-<key>.drops` | doctor（`*.drops` を glob）、`aidlc-plugin-test.ts`（`readPluginDropEntries`） |
| `aidlc-graph.ts compile` | `tools/data/stage-graph.json`、`scope-grid.json` | `aidlc-runner-gen.ts`、`aidlc-utility.ts`、`compose.ts`（graph 欠落検知）、ランタイム |

## Dependency Graph（深読み範囲）

```mermaid
flowchart TB
  subgraph tools["core/tools (shipped)"]
    validate["aidlc-plugin-validate.ts"]
    emit["aidlc-plugin-emit.ts"]
    build["aidlc-plugin-build.ts"]
    ptest["aidlc-plugin-test.ts"]
    create["aidlc-plugin-create.ts"]
    lib["aidlc-lib.ts (skimmed)"]
    schema["aidlc-stage-schema.ts (skimmed)"]
    graph["aidlc-graph.ts"]
    runner["aidlc-runner-gen.ts"]
    tiers["aidlc-tiers.ts (skimmed)"]
  end
  subgraph scripts["scripts (dev only)"]
    pkg["package.ts"]
    bins["build-binaries.ts"]
    ak["agent-knowledge.ts"]
    ob["onboarding.ts"]
    mt["manifest-types.ts"]
    tmpl["plugin-hooks-template/compose.ts"]
    launcher["plugin-hooks-template/aidlc-plugin-compose.ts"]
  end
  subgraph harness["harness"]
    man["NAME/manifest.ts x7"]
    hemit["codex, copilot, opencode emit.ts"]
    cinst["cursor/install.ts"]
  end
  build --> validate
  build --> emit
  emit --> validate
  emit --> lib
  ptest --> build
  ptest --> emit
  ptest --> validate
  create --> validate
  pkg --> emit
  pkg --> tiers
  pkg --> ak
  pkg --> ob
  pkg -. require .-> man
  man --> mt
  man --> hemit
  hemit -. require in dist .-> runner
  bins --> pkg
  tmpl -. dynamic import in install .-> lib
  tmpl -. dynamic import in install .-> schema
  tmpl -. spawn in install .-> graph
  tmpl -. spawn in install .-> runner
  launcher -. spawn .-> tmpl
  ptest -. spawn .-> tmpl
  ptest -. spawn .-> graph
  pkg -. spawn in dist .-> graph
  pkg -. spawn in dist .-> runner
  cinst -. reads sidecar written by .-> tmpl
```
<!-- Text fallback: build -> validate + emit; emit -> validate + aidlc-lib; test -> build + emit + validate and spawns compose.ts + aidlc-graph.ts; create -> validate; package.ts -> aidlc-plugin-emit + aidlc-tiers + agent-knowledge + onboarding, requires harness manifests (which import manifest-types and their emit.ts), and spawns aidlc-graph.ts / aidlc-runner-gen.ts inside dist; codex/copilot emit.ts require aidlc-runner-gen.ts from dist; build-binaries.ts -> package.ts --check; compose.ts template has no static imports and dynamically imports the installed aidlc-lib.ts / aidlc-stage-schema.ts and spawns the installed aidlc-graph.ts / aidlc-runner-gen.ts; the launcher spawns compose.ts; cursor/install.ts reads the sidecar compose writes. -->

## Coupling Hotspots

- **`aidlc-plugin-validate.ts` の fan-in**: create / build / emit / test の 4 ツールが依存する共通基盤。契約変更は 4 ツールとテスト（t314〜t317）に波及する。
- **インストール先 `aidlc-lib.ts` への compose の依存**: 静的ではなく動的で、しかも「関数の存在」を実行時に検査する（`compose.ts:433-440`）。lib の API 名（`acquireAuditLock` / `releaseAuditLock`）の改名は旧プラグイン射影の compose を無効化する。
- **compose と `harness/cursor/install.ts` の暗黙結合**: 同一アルゴリズムの二重実装（`code-quality-assessment.md`）。
- **`aidlc-graph.ts` の fan-in**: packager、compose、test、runner-gen、doctor、ランタイムが `compile` / `loadGraph` に依存する。2962 行の単一ファイル。
- **`plugin-targets.json` の schema**: `readPluginTargets` が `kind` の 4 値を固定で検証する（`emit.ts:157-161`）。新 `kind` の追加は emit と compose 配線（`writeHookWiring`）の両方の変更を要する。

## Cross-references

- 各コンポーネントの責務: `component-inventory.md`
- バージョン: `technology-stack.md`
