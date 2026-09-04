# API Documentation — aidlc-workflows（プラグイン機構）

> 外部契約（プラグイン作者が触る面）と内部契約（packager・compose・エンジン間の面）を、深読み範囲の根拠付きで記す。行番号は `aidlc-workflows/` 相対。

## Plugin Manifest Contract — `.aidlc-plugin/plugin.json`

検証は `core/tools/aidlc-plugin-validate.ts`、文書は `docs/reference/18-plugin-mechanism.md:44-141`。

| フィールド | 制約 | 根拠 |
|---|---|---|
| `name` | 小文字 kebab-case（`/^[a-z][a-z0-9-]*$/`）、ディレクトリ名と一致、`core` / `aidlc` / `aidlc-*` は予約 | `validate.ts:116`、`create.ts:229`（`validatePluginName`）、`package.ts:1195-1198` |
| `version` | SemVer（`SEMVER_RE`、pre-release / build metadata 可） | `validate.ts:114-115` |
| `description`, `author` | 文字列 / オブジェクト。射影時にホスト manifest と `marketplace.json` へ転記 | `emit.ts:613-647` |
| `dependencies` | 配列。**現状どのツールも読まない**（設計済み・未実装） | `docs/harness-engineering/10-authoring-a-plugin.md:622-625` |
| `aidlc.contributes` | キーは `stages|overlays|agents|scopes|memory|sensors|knowledge|tools` のみ。値は正準パス固定（`stages/`、`contributions/`（`overlays`）、`agents/`、`scopes/`、`sensors/`、`knowledge/`、`tools/`）。`memory` は拒否 | `validate.ts:117-135,203-243` |

トップレベルは寛容（未知キー保持）、`aidlc` ブロックは厳格（未知キー拒否）（`18-plugin-mechanism.md:138-141`）。`build` / `test` / 直接 emit も `assertSupportedPluginContributionPaths()` で同じ検査を再実行する（`validate.ts:245-263`）。

参考実装: `plugins/test-pro/.aidlc-plugin/plugin.json`（7 キーを宣言）、本 intent の `grilling/.aidlc-plugin/plugin.json`（`overlays` のみ）。

## Plugin Tree Layout

`18-plugin-mechanism.md:48-62` の設計面と、`CONTENT_DIRS`（`emit.ts:74-82`: `stages`、`sensors`、`tools`、`contributions`、`scopes`、`agents`、`knowledge`）が射影する実装面は一致する。`memory/` は設計のみ（⏳）。`hooks/compose.ts` は作者が置かない（BUILD が注入。置く場合は同梱テンプレートとバイト一致必須、`validate.ts:957-1000`）。`tests/` は作者側の内容検証で、射影対象外。

## Contribution Contract — `contributions/<phase>/<slug>.md`

パース実装は `scripts/plugin-hooks-template/compose.ts:2066-2304`、検証は `validate.ts:751-795`。

### Frontmatter

```yaml
---
target: build-and-test          # コアステージ slug（plugin-authoring-context.json の stages 集合）
plugin: test-pro                # manifest name と一致必須
adds:                           # 実装済みキーのみ: produces / sensors / consumes / scopes / required_sections
  produces:
    - test-pro-branch-coverage-instructions   # <plugin>- 接頭辞必須（validate: artifact-namespace）
  consumes:
    - artifact: test-pro-testability-requirements
      required: false           # conditional_on も保持される
  sensors:
    - coverage-threshold
  required_sections:
    - "Branch Coverage"         # 引用符付き文字列
fragments:
  - anchor: after-step:8
    order: 100
  - anchor: in:Sensors
    order: 150
---
```

- `bundle:` キーは廃止済みで拒否（`compose.ts:2084-2087`）。`plugin` に `:` を含むと拒否（`compose.ts:2091`）。
- `adds.<key>` の要素は 4 スペース `    - kebab-name` 固定。validate の `nestedListField` は厳格（`validate.ts:455-479`）、compose の `listOf` は寛容だが解析数が宣言数を下回ると drop を記録（`compose.ts:2106-2118`）。
- `adds` の未実装キー（例 `requires_stage`）は advisory drop（`compose.ts:2153-2158`）。
- `adds.scopes` は「インストール済み scope ファイルが存在し、その `plugin:` が自プラグイン」であることを要求（`18-plugin-mechanism.md:358`）。

### Body — `## fragment: <anchor>` ブロック

- 本文は `## fragment: <anchor>` 見出しで区切られ、frontmatter の同一 anchor エントリと **per-anchor FIFO** で対応する（`compose.ts:2232-2270`）。code fence 内の `## fragment:` は区切りとして扱われない（CommonMark の fence 規則、`compose.ts:2247-2262`）。
- prose 中の `{{HARNESS_DIR}}` はハーネスの leaf（`.claude` 等）に置換される（`compose.ts:2273`）。
- 対応する本文が無い frontmatter エントリ、対応する frontmatter が無い本文ブロックは、いずれも drop（`compose.ts:2274,2281-2284`）。
- 同一 `(target, plugin, anchor, order)` は複数ファイルにまたがっても drop（`compose.ts:2292-2296`）。
- prose に `<!-- /plugin:… -->` 風の行を書いてはならない（`10-authoring-a-plugin.md:239-242`）。

### Anchors（`locateAnchor`、`compose.ts:1674-1712`）

| anchor | 挿入位置 | 実装状態 |
|---|---|---|
| `after-step:<n>` | `### Step <n>`（または範囲見出し `### Step a-b` で a ≤ n ≤ b）の本文末尾 = 次の `##` / `###` 見出し直前 | 実装済み |
| `before-step:<n>` | 該当 Step 見出し直前 | 実装済み |
| `end-of-steps` | `## Steps` 節の末尾 = 次の `## ` 直前 | 実装済み |
| `in:<Section>`（`[\w -]+`） | `## <Section>` 節の末尾 | 実装済み |
| `after-questions` | — | **未実装**（分岐なし、`unknown anchor` として drop、`compose.ts:1711`。文書 `18-plugin-mechanism.md:370` の表には状態なしで記載、`10-authoring-a-plugin.md:223` と `18:525` は ⏳ と明記） |

見出しが見つからない場合も drop（`compose.ts:1687,1697,1706`）。同一 `(anchor, order)` の複数 fragment は許される（test-pro は `after-step:8` ×3）。

### Sentinel（スプライス後のステージソース）

```text
<!-- plugin:<plugin>:<anchor>:<order>:<fnv1a-8hex> -->
<prose>
<!-- /plugin:<plugin>:<anchor>:<order>:<fnv1a-8hex> -->
```

同一ハッシュならスキップ、ハッシュが変われば置換（アップグレード）、新規なら同 anchor の他ブロックと `(order, plugin.localeCompare)` で並べて挿入、ブロックが無ければ `locateAnchor`（`compose.ts:1716-1782`）。

## Authoring CLI Tools（オフライン、`bun <tools-dir>/…`）

| ツール | 用法 | 終了コード | 根拠 |
|---|---|---|---|
| `aidlc-plugin-create.ts` | `<name> [targetDir] [--json]`。6 ファイル（`.aidlc-plugin/plugin.json`、`stages/construction/<name>-example-stage.md`、`scopes/<name>-example.md`、`agents/<name>-example-agent.md`、`tests/README.md`、`README.md`）を決定的に生成。非空ターゲット拒否、staging → rename で原子的配置 | 0 / 1（`create-target` / `create-write`）/ 2 | `create.ts:20-21,198-222,260-282,283-330,395` |
| `aidlc-plugin-validate.ts` | `<plugin-root> [--json]`。JSON `{valid, errors, warnings}`、所見は `{file, rule, message, fix}` | 0 valid / 1 findings / 2 usage | `validate.ts:1109-1141` |
| `aidlc-plugin-build.ts` | `<plugin-root> <harness> [outDir] [--json]`。既定出力 `<plugin-root>/dist/<harness>/`。出力境界（既定はプラグインルート）外の symlink・他所有出力を拒否。in-process で validate を先に実行 | 0 / 1（validate エラーまたは `build-output`）/ 2（用法・未知ハーネス） | `build.ts:25-26,139-152,186-222` |
| `aidlc-plugin-test.ts` | `<plugin-root> --install <project-root> [--harness <name>] [--json]`。`--dist` は RFC #722 まで予約（指定すると用法エラー） | 0 / 1 / 2 | `test.ts:44-45,787-841,843-887` |

`aidlc-plugin-test.ts` の手順（`test.ts:187-203,432-472,604-625,665-696,707-728`）: `installRoots` を一時候補へ `dereference: true` でコピー → 射影 build → compose 1 回目（drop 0 件、`test-compose` / `test-compose-drop`）→ `aidlc-graph.ts compile`（`test-graph`）→ プラグインの stage / scope がグラフに存在（stage / scope が空なら自明に通る）→ compose 2 回目で byte 不変（`test-idempotency`）→ 実インストールのハッシュ不変（`test-live-mutation`）。

validate のルール id は `PluginValidationRule` 共用体で **38 種**（`validate.ts:34-72`）: `plugin-root`、`manifest-missing`、`manifest-json`、`manifest-shape`、`manifest-name`、`content-symlink`、`stage-frontmatter`、`stage-schema`、`stage-filename`、`stage-owner`、`scope-frontmatter`、`scope-filename`、`scope-name`、`scope-owner`、`scope-depth`、`scope-keywords`、`agent-frontmatter`、`agent-filename`、`agent-name`、`agent-owner`、`duplicate-artifact-producer`、`artifact-namespace`、`contribution-target`、`stage-body`、`tools-payload`、`compose-template-missing`、`compose-hook-stale`、`compose-hook-absent`、`build-output`、`build-emission`、`test-install`、`test-compose`、`test-compose-drop`、`test-graph`、`test-idempotency`、`test-live-mutation`、`create-target`、`create-write`。contributions に効くのは `contribution-target`、`stage-owner`（`plugin` 不一致）、`artifact-namespace` の 3 つだけ（`validate.ts:751-795`）。

## Engine CLI Tools（インストール済み `<harness>/tools/`）

| ツール | サブコマンド | 根拠 |
|---|---|---|
| `aidlc-graph.ts` | `artifacts`、`producers <artifact>`、`consumers <artifact>`、`topo`、`cycles [--scope]`、`scope`、`ars`、`compile [--check]`、`resolve <scope>`、`export [--check]`（`COMMANDS` テーブル）。`compile` は `AIDLC_WORKSPACE_LOCK_OWNER_PID` があれば親プロセスのロック所有を検証してから書き、無ければ自前で `withAuditLock` | `graph.ts:2633-2884,2810-2831,2931-2962` |
| `aidlc-runner-gen.ts` | `write`、`check`、`list`、`scopes [--all] [--check] [--out]` | `runner-gen.ts:809-832` |
| `aidlc-includes.ts` | `repointHarnessIncludes(projectDir, space)` を export。ハーネスの native include（Claude `@` stub、Kiro resources glob、Codex `AIDLC_RULES_DIR`、opencode `instructions`、Cursor `.mdc`）の space ポインタだけを外科的に書き換える | `includes.ts:1-40,176` |
| `aidlc-utility.ts`（流し読み） | `plugin sync`（`handlePluginSync`、`utility.ts:1290-1382`）、`select-plugins`（`knownPluginNames`、`532-545`）、`doctor` | 束縛集合外 |

## Dev-only Scripts

| スクリプト | 用法 | 根拠 |
|---|---|---|
| `scripts/package.ts` | `[<harness>] [--check]`；`plugin build <plugin> <harness> <outDir>`；`codex trust --project <abs> [--hooks-json <abs>]` | `package.ts:2-8,965-970,1174-1221` |
| `scripts/build-binaries.ts` | `[--all-targets | --target <bun-target>]`。実行前に `package.ts --check` 必須。プラグイン関連ゲート: `pluginSelectGate`（`plugin select aidlc`）、`delegatePluginSyncGate`（`plugin sync` が "no installed plugins; nothing to sync"）、`realPluginSyncGate`（test-pro の claude 射影を実 compose し `test-pro-integration` がグラフに載る） | `build-binaries.ts:117-125,611-642,952-1031,1895-1909` |
| `scripts/ci-changelog-guard.ts <base-ref>`、`scripts/docs-rewrite-links.ts [docsDir]` | CI 補助 | 一覧 |

## Hook Entry Points and Environment

### `hooks/compose.ts`（射影されたプラグイン内、テンプレートは `scripts/plugin-hooks-template/compose.ts`）

- 入力（環境変数、`compose.ts:37-67`）: `PLUGIN_ROOT ← CLAUDE_PLUGIN_ROOT | PLUGIN_ROOT | AIDLC_PLUGIN_ROOT | (自ファイルの 2 階層上)`；`PROJECT_DIR ← CLAUDE_PROJECT_DIR | AIDLC_PROJECT_DIR | PWD | cwd`；`HARNESS_LEAF ← AIDLC_HARNESS_DIR`（既定 `.claude`）；`HARNESS_NAME ← AIDLC_HARNESS_NAME`、無ければ `tools/data/harness.json` の `name`、`.aidlc` は `.github/hooks/aidlc.json` の有無で `copilot` / `opencode`。
- エクスポート: `export async function compose(): Promise<void>`（`compose.ts:420`）。`aidlc plugin sync` はこれを import して呼ぶ（`utility.ts:1356` は `compose()` の export を要求、流し読み）。
- 前提: `HARNESS_DIR/tools/aidlc-graph.ts` の存在、インストール済み `aidlc-lib.ts` の `acquireAuditLock` / `releaseAuditLock`、graph が `AIDLC_WORKSPACE_LOCK_OWNER_PID` を解すること（`compose.ts:420-452`）。
- 出力（副作用）: コピーされた primitives、マージ済みステージソース、`tools/data/plugin-contrib-<key>.json`、`tools/data/plugin-files-<key>.json`、`<hooksHealthDir>/plugin-compose-<key>.drops`、`<hooksHealthDir>/plugin-compose-installed-tool-payloads-<harness>.drops`、`aidlc/.plugin-compose-retry-<key>`、再コンパイルされた `stage-graph.json` / `scope-grid.json`、SKILL.md 生成表、`skills/` ランナー。

### `hooks/aidlc-plugin-compose.ts <harnessDir> [harnessName]`（cursor / kiro-ide のみ同梱）

Windows 安全なランチャ。`AIDLC_PROJECT_DIR | CURSOR_PROJECT_DIR | CLAUDE_PROJECT_DIR` か SessionStart stdin の `workspace_roots` から AI-DLC インストールを一意に選び（複数なら exit 1）、`aidlc plugin sync` → 失敗時に `bun compose.ts` へフォールバック（`aidlc-plugin-compose.ts:11-92`）。

### ホスト側配線（`emit.ts:324-418`、`writeHookWiring`）

| `kind` | ハーネス | 配線 |
|---|---|---|
| `store` | claude、codex、copilot、opencode | `hooks/hooks.json` の `hooks.SessionStart[].hooks[]` に `sh -c '… aidlc plugin sync && exit 0; … "$BUN" "<root>/hooks/compose.ts"'`（root は claude が `${CLAUDE_PLUGIN_ROOT}`、他は `${PLUGIN_ROOT}`） |
| `cursor` | cursor | `hooks/hooks.json` の flat camelCase `hooks.sessionStart[].command = bun ./hooks/aidlc-plugin-compose.ts .cursor` |
| `kiro-ide` | kiro-ide | `.kiro/hooks/aidlc-<plugin>-compose.json`（v1 schema、trigger `SessionStart`） |
| `kiro` | kiro（CLI） | 配線なし（手動 `aidlc plugin sync` または `bun <root>/hooks/compose.ts`） |

### ハーネス adapter のターゲット（`harness/*/hooks/*-adapter.ts`）

codex 14（`session-start | audit-and-sensors | sync-workflow-state | rebuild-stage-graph | validate-state | log-subagent | continue-workflow | record-human-turn | state-transition-guard | reviewer-scope | review-freeze | deliver-stage-rules | plan-approval-guard | bind-bash-session`、`aidlc-codex-adapter.ts:42-48`）、copilot 8（`aidlc-copilot-adapter.ts:48-51`）、cursor 9（`aidlc-cursor-adapter.ts:34-38`）、kiro CLI 13（`aidlc-kiro-adapter.ts:31-36`）、kiro-ide 11（`kiro-ide/hooks/aidlc-kiro-adapter.ts:69-75`）、opencode は plugin API のイベント表（`aidlc-opencode-adapter.ts:11-22`）。プラグイン合成はこれらとは別経路（上記ホスト配線）。

## Data Files（`tools/data/`）

| ファイル | 書き手 → 読み手 | 形 | 根拠 |
|---|---|---|---|
| `plugin-targets.json` | `package.ts` → `aidlc-plugin-build.ts` / `test.ts` | `{ <harness>: {harnessName, manifestDir, harnessLeaf, kind: store|kiro|kiro-ide|cursor, installRoots[]} }`（7 件） | `package.ts:1036-1075`、`emit.ts:137-176`、`dist/claude/.claude/tools/data/plugin-targets.json` |
| `plugin-authoring-context.json` | `package.ts` → validate | `{agents: string[14], stages: string[33]}` | `package.ts:558-575`、`validate.ts:401-436` |
| `harness.json` | `package.ts`（`name`、`harnessDir`、`rulesSubdir`、任意 `runnerFrontmatterAdditions` / `documentExtractors`）；`plugins` キーは `select-plugins` だけが書く | compose の選択判定 | `package.ts:479-498`、`compose.ts:274-291` |
| `plugin-contrib-<key>.json` | compose → doctor / `select-plugins` / cursor install | `{ <target>: {produces?, sensors?, consumes?, scopes?, required_sections?, required_sections_created?, fragments?: [{anchor, order, hash}]} }` | `compose.ts:1945-1960,2012-2034` |
| `plugin-files-<key>.json` | compose | knowledge 所有記録 | `compose.ts:1789-1926` |
| `plugin-hooks-template/{compose.ts,aidlc-plugin-compose.ts}` | `package.ts` → emit / validate | バイト一致の参照テンプレート | `validate.ts:957-1000`、`emit.ts:290-322` |
| `stage-graph.json`、`scope-grid.json` | `aidlc-graph.ts compile` → ランタイム | コンパイル済みグラフ（無効ノードは `"enabled": false`） | `graph.ts:2799-2831`、`18-plugin-mechanism.md:258-260` |

射影出力側: `.aidlc-plugin-projection.json`（`{schema: 1, producer: "aidlc-plugin-build", plugin, harness}`）、`<manifestDir>/plugin.json`（`{name: "aidlc-<plugin>", version, description, author}`）、`<manifestDir>/marketplace.json`（`{name: "aidlc-plugins", owner, description, plugins: [{name, source: ".", version, description}]}`）（`emit.ts:599-647`）。

## Plugin Doctor Contract — `tools/<plugin>-doctor.ts`

stdout に `{ "checks": [ { "pass": boolean, "label": string, "fix": string, "severity": "error" | "advisory" } ] }`。`severity` 既定 `error`。10 秒タイムアウト（`AIDLC_PLUGIN_DOCTOR_TIMEOUT_MS`）、50 行 / 256 KiB / 300 文字の上限（`18-plugin-mechanism.md:235-257`）。参考実装 `plugins/test-pro/tools/test-pro-doctor.ts:1-37`（`AIDLC_PROJECT_DIR` / `AIDLC_HARNESS_DIR` を読み、ファイル存在を検査）。**doctor がプラグインを検出するにはステージかスコープの所有が必要**（`18-plugin-mechanism.md:231-233`）。

## Programmatic Exports（主要）

- validate: `validatePluginRoot`、`validatePluginName`、`scanPluginFiles`、`walkPluginFiles`、`assertPluginContentHasNoSymlinks`、`assertSupportedPluginContributionPaths`、`formatPluginValidation`、`pluginValidationJson`
- emit: `buildPluginProjection`、`readPluginTargets`、`assertPluginBuildOutput`、`pluginReviewerAgents`、`PLUGIN_PROJECTION_MARKER`、`pluginBuildLockPath`、型 `PluginTarget` / `PluginTargetTable` / `PluginTargetKind`
- build: `bundledPluginTargetsPath`、`bundledPluginHookTemplatesDir`、`main`
- test: `testPluginComposition`、`runPluginCompose`、`readPluginDropEntries`、`readPluginDropText`、`pluginTestJson`、`main`
- create: `createPluginScaffold`、`scaffoldFiles`、`pluginCreateJson`、`main`
- graph: `loadGraph`、`loadScopeGrid`、`loadRules`、`resolveRulesForStage`、`loadSensors`、`resolveSensorsForStage`、`producersOf`、`consumersOf`、`topoSort`、`findCycles`、`subgraphForScope`、`resolvePlanForScope`、`validateScope`、`validateGrid`、`compileStageGraph`、`transposeScopeGrid`、`mergeComposedScopes`、`selectionDroppedOrderingEdges`、`stageGraphDrift`、`computeArs`、`main`（`graph.ts:337-2931` の export 一覧）
- runner-gen: `runnableStages`、`renderStageRunner`、`renderInitRunner`、`renderComposeRunner`、`discoverScopes`、`defaultScopeBatch`、`renderRunner`、`main`（`runner-gen.ts:109-809`）
- includes: `repointHarnessIncludes`
- scripts: `HarnessManifest` 型と `plugin?: {manifestDir, kind, installRoots?}`（`manifest-types.ts:67,150-171`）；`reviewerAgentSet`（`plugins/*/stages` も走査）、`absorbReviewerKnowledge`、`injectDelegatedKnowledgePreflight`、`agentNameFromPath`（`agent-knowledge.ts:33-126`）；`renderOnboarding`、`declaredSlots`（`onboarding.ts:31-46`）
- tests helper（流し読み）: `tests/harness/plugin-kit.ts` の `walkMarkdownFiles`、`buildPluginProjection`、`copyHarnessInstall`、`readPluginDropLogs`、`composePluginFixture`、`pluginAgentRoster`、`validatePluginContent`、`liveGateFor`、`invokeHarness`

## Cross-references

- 相互作用の流れ: `architecture.md` の `### Interaction Diagrams`
- 各コンポーネントの責務: `component-inventory.md`
- 未実装面と負債: `code-quality-assessment.md`
