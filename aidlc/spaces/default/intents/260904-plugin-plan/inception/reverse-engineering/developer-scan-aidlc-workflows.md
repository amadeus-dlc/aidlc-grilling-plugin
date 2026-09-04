# Developer Code Scan — aidlc-workflows

対象リポジトリ: `aidlc-workflows/`（git submodule、`v2.7.0-1-ga277af21` = `a277af218f0df7f325d3b8be7b6d90fce2c5bd40`、2026-09-02）。パスはすべて `aidlc-workflows/` 相対。スキャン方針は FOCUSED（人間の判断）: プラグイン機構に関わる下記の束縛集合だけを深読みし、それ以外はディレクトリ粒度で流し読みした。

## Developer Code Scan Results

### Scan Coverage
- **Analyzed deeply**:
  - `core/tools/aidlc-plugin-build.ts`
  - `core/tools/aidlc-plugin-create.ts`
  - `core/tools/aidlc-plugin-emit.ts`
  - `core/tools/aidlc-plugin-test.ts`
  - `core/tools/aidlc-plugin-validate.ts`
  - `core/tools/aidlc-includes.ts`
  - `core/tools/aidlc-graph.ts`
  - `core/tools/aidlc-runner-gen.ts`
  - `plugins/`
  - `docs/reference/18-plugin-mechanism.md`
  - `docs/harness-engineering/10-authoring-a-plugin.md`
  - `harness/`
  - `scripts/`
- **Skimmed only**:
  - `core/tools/`（上記 8 本以外。`aidlc-utility.ts` / `aidlc-lib.ts` / `aidlc-stage-schema.ts` / `aidlc-sensor-schema.ts` / `aidlc-tiers.ts` / `aidlc-runtime-paths.ts` などは grep と一覧のみ）
  - `core/aidlc-common/`（stages 33 本の一覧、`### Step` 見出しと対話モード選択肢の grep のみ）
  - `core/hooks/`、`core/agents/`、`core/knowledge/`、`core/memory/`、`core/scopes/`、`core/sensors/`、`core/skills/`、`core/templates/`（一覧のみ）
  - `docs/`（上記 2 章以外: `guide/`、`reference/` 他章、`rfcs/`、`roadmap.md`）
  - `tests/`（ディレクトリ一覧、`README.md` 冒頭、プラグイン関連テストのファイル名のみ）
  - `dist/`（ディレクトリ一覧と `dist/claude/.claude/tools/data/plugin-targets.json` の照合読みのみ。他のファイル本文は未読）
  - `.github/`（ワークフローのジョブ名のみ）
  - ルート設定（`package.json`、`tsconfig*.json`、`biome.json`、`knip.json`、`.gitleaks*`、`zensical.toml`、`pyproject.toml`、`uv.lock`、`AGENTS.md` 見出し）

### Packages Found
- `aidlc-workflows-dev` — private dev package（`package.json`、npm 公開なし）— TypeScript / bun — パッケージャ・型検査・lint・テストの実行環境。成果物は `dist/<harness>/` の生成ツリー（`package.json:12`）
- `core/` — ハーネス中立のソースツリー — TypeScript + Markdown — tools 50 本、hooks 18 本、`aidlc-common/stages/` 33 ステージ（initialization 3 / ideation 7 / inception 9 / construction 7 / operation 7）、agents、knowledge、memory、scopes 11、sensors 6、skills 4、templates
- `harness/{claude,codex,copilot,cursor,kiro,kiro-ide,opencode}` — 7 ハーネスの manifest（`manifest.ts`）とハーネス固有の authored surface（SKILL.md、question-rendering.md、hook adapter、settings 等）。`codex` / `copilot` / `opencode` は `emit.ts` を持つ
- `scripts/` — パッケージャ（`package.ts`）、バイナリビルド（`build-binaries.ts`）、compose hook テンプレート（`plugin-hooks-template/`）、補助（`agent-knowledge.ts`、`onboarding.ts`、`manifest-types.ts`、`ci-changelog-guard.ts`、`docs-rewrite-links.ts`）
- `plugins/test-pro/` — 一次プラグインのリファレンス fixture（stages 2、contributions 4、sensors 2、tools 3、scope 1、agent 1、knowledge 1、tests 1）
- `dist/{claude,codex,copilot,cursor,kiro,kiro-ide,opencode}` — 生成物（277〜333 ファイル/ハーネス）、`dist/plugins/test-pro/<7 harness>`（134 ファイル）
- `tests/` — bun:test スイート（smoke / unit / integration / e2e / harness / fixtures 等、約 690 ファイル）
- `docs/` — zensical でビルドされる文書ツリー

### Build System
- **Type**: bun（`package.json` scripts）。`bun run check` = `bun scripts/package.ts --check && typecheck && lint`（`package.json:7-9`）。配布は `bun scripts/package.ts`（全ハーネス再生成、`--check` で dist との byte 差分ガード、`scripts/package.ts:2-36`）、実行バイナリは `bun scripts/build-binaries.ts`（`dist/claude/.claude/tools/aidlc.ts` を `bun build --compile`、`build-binaries.ts:78,1731`）
- **Config Files**: `package.json`、`bun.lock`、`tsconfig.json`（core/harness/scripts/plugins/*/tools を include、adapter を exclude）、`tsconfig.tests.json`、`tsconfig.adapters.json`（`dist/*/.*/hooks/*-adapter.ts` を対象）、`biome.json`、`knip.json`、`.markdownlint-cli2.yaml`、`.gitleaks.toml`、`zensical.toml`、`pyproject.toml` / `uv.lock`（docs ツールチェーン）
- **Build Dependencies**:
  - `scripts/package.ts` → `core/tools/aidlc-plugin-emit.ts`（`buildPluginProjection`、`package.ts:69-73`）、`core/tools/aidlc-tiers.ts`、`scripts/agent-knowledge.ts`、`scripts/onboarding.ts`、`harness/*/manifest.ts`（`require` で動的読込、`package.ts:896-899`）
  - `package.ts` は組み立て済み dist ツリー内の `tools/aidlc-graph.ts compile`、`tools/aidlc-runner-gen.ts write|scopes`、`tools/aidlc-utility.ts stage-table|scope-table` を子プロセスで実行する（`runTool`、`package.ts:789-818`、呼び出し `739,757-758,850-855`）
  - `harness/codex/emit.ts` と `harness/copilot/emit.ts` は dist 内の `tools/aidlc-runner-gen.ts` を `require` してランナーを合成する（`codex/emit.ts:381-389`、`copilot/emit.ts:114-124`）
  - `core/tools/aidlc-plugin-build.ts` → `aidlc-plugin-emit.ts` + `aidlc-plugin-validate.ts`；`aidlc-plugin-test.ts` → build + emit + validate；`aidlc-plugin-create.ts` → validate（`validatePluginName`）；`aidlc-plugin-emit.ts` → validate（`scanPluginFiles` 等）+ `aidlc-lib.ts`（`runWithOwnerStampedLock`、`emit.ts:31-37`）
  - `scripts/plugin-hooks-template/compose.ts` は静的 import を持たず、インストール先の `tools/aidlc-lib.ts` / `tools/aidlc-stage-schema.ts` を実行時に動的 import する（`compose.ts:103-115`）。フレームワーク checkout に依存しない設計
  - `scripts/build-binaries.ts` → `dist/claude/.claude/tools/aidlc-version.ts`（`build-binaries.ts:30`）。実行前に `package.ts --check` を必須化（`1900-1909`）

### APIs Discovered
- CLI（オフラインのプラグイン作者向けツールチェーン。`bun <tools-dir>/…` で実行、どれも AIDLC プロジェクトや checkout を要求しない）:
  - `aidlc-plugin-create.ts <name> [targetDir] [--json]` — 6 ファイルの決定的スキャフォールド、空でないターゲットを拒否（`create.ts:423-448,508-585,620-648`）
  - `aidlc-plugin-validate.ts <plugin-root> [--json]` — 終了コード 0/1/2、JSON `{valid, errors, warnings}`、ルール id 32 種（`validate.ts:34-72,1109-1137`）
  - `aidlc-plugin-build.ts <plugin-root> <harness> [outDir] [--json]` — 既定出力 `<plugin-root>/dist/<harness>/`、出力境界と symlink を拒否（`build.ts:25-26,139-150,190-211`）
  - `aidlc-plugin-test.ts <plugin-root> --install <project-root> [--harness <name>] [--json]` — `--dist` は RFC #722 まで予約（`test.ts:44-45,787-841`）
  - `aidlc-graph.ts` — `artifacts | producers | consumers | topo | cycles [--scope] | scope | validate-scope | validate-grid | ars | compile [--check] | resolve | export [--check]`（`graph.ts:2633-2884`）
  - `aidlc-runner-gen.ts` — `write | check | list | scopes [--all] [--check] [--out]`（`runner-gen.ts:809-832`）
  - `scripts/package.ts [<harness>] [--check]`、`package.ts plugin build <plugin> <harness> <outDir>`（`1174-1221`）、`package.ts codex trust --project <abs> [--hooks-json <abs>]`（`965-1012`）
  - `scripts/build-binaries.ts [--all-targets | --target <bun-target>]`（`117-125`）、`scripts/ci-changelog-guard.ts <base-ref>`、`scripts/docs-rewrite-links.ts [docsDir]`
- Hook 契約:
  - `hooks/compose.ts`（テンプレート）: 環境変数 `CLAUDE_PLUGIN_ROOT | PLUGIN_ROOT | AIDLC_PLUGIN_ROOT`、`CLAUDE_PROJECT_DIR | AIDLC_PROJECT_DIR | PWD`、`AIDLC_HARNESS_DIR`（既定 `.claude`）、`AIDLC_HARNESS_NAME`（無ければ `tools/data/harness.json` の `name`、`.aidlc` は `.github/hooks/aidlc.json` の有無で copilot/opencode を判別）（`compose.ts:37-67`）。`export async function compose()`（`420`）
  - `hooks/aidlc-plugin-compose.ts <harnessDir> [harnessName]`: Cursor/Kiro IDE 用の Windows 安全なランチャ。SessionStart stdin の `workspace_roots` から AI-DLC インストールを一意に選び、`aidlc plugin sync` → 失敗時 `compose.ts` に fallback（`aidlc-plugin-compose.ts:11-92`）
  - ホスト側 hook 配線: Claude/Codex/opencode/copilot（`kind: store`）は `hooks.json` の `SessionStart` に `sh -c '… aidlc plugin sync || bun compose.ts'`（`emit.ts:324-351,397-418`）、Cursor は flat camelCase `hooks.sessionStart[].command`（`383-395`）、Kiro IDE は `.kiro/hooks/aidlc-<plugin>-compose.json` v2 登録（`360-382`）、Kiro CLI は配線なし（`359`）
  - ハーネス adapter のターゲット: codex 14（`harness/codex/hooks/aidlc-codex-adapter.ts:42-48`）、copilot 8（`copilot/hooks/aidlc-copilot-adapter.ts:48-51`）、cursor 9（`cursor/hooks/aidlc-cursor-adapter.ts:34-38`）、kiro CLI 13（`kiro/hooks/aidlc-kiro-adapter.ts:31-36`）、kiro-ide 11（`kiro-ide/hooks/aidlc-kiro-adapter.ts:69-75`）、opencode は plugin API（`opencode/plugin/aidlc-opencode-adapter.ts:11-22`）
- データ契約（ファイル形式）:
  - `.aidlc-plugin/plugin.json` — `name`（kebab-case、`core`/`aidlc`/`aidlc-*` 予約、ディレクトリ名と一致）、`version`（SemVer）、`description`、`author`、`dependencies`、`aidlc.contributes`（キーは `stages|overlays|agents|scopes|memory|sensors|knowledge|tools`、値は正準パス固定。`overlays: "contributions/"`。`memory` は拒否）（`validate.ts:111-146,203-263,265-300,481-631`）
  - `tools/data/plugin-targets.json` — 7 ハーネスの `{harnessName, manifestDir, harnessLeaf, kind, installRoots}`（`emit.ts:39-49,137-176`；生成は `package.ts:1039-1075`）
  - `tools/data/plugin-authoring-context.json` — core の agent 名と stage slug の一覧。validate の `contribution-target` と agent 参照検証の根拠（`package.ts:561-573`、`validate.ts:401-436`）
  - `tools/data/plugin-contrib-<key>.json` — compose が実際にマージした構造要素と fragment の `{anchor, order, hash}` の sidecar（`compose.ts:1945-2034,2314-2325`）
  - `tools/data/plugin-files-<key>.json` — knowledge の所有記録（`compose.ts:1789-1926`）
  - `.aidlc-plugin-projection.json` — 投影出力の所有マーカー（schema 1、producer `aidlc-plugin-build`、plugin、harness）（`emit.ts:68-70,511-563`）
  - `<hooksHealthDir>/plugin-compose-<key>.drops` — 1 行 = `ISO\t[degraded|advisory] reason`、毎回上書き、0 件なら削除（`compose.ts:191-227`）。別途 `plugin-compose-installed-tool-payloads-<harness>.drops`（`238-260`）
  - `aidlc/.plugin-compose-retry-<key>` — compile 失敗時の再試行マーカー（`compose.ts:2376-2399`）
  - `tools/data/harness.json` の `plugins` キー — 選択集合。キー不在なら全プラグイン有効（`compose.ts:274-291`）。packager は `name` / `harnessDir` / `rulesSubdir` / `runnerFrontmatterAdditions` だけを書き、`plugins` は書かない（`package.ts:479-498`）
  - `tools/<plugin>-doctor.ts` — stdout に `{checks:[{pass,label,fix,severity}]}`（`docs/reference/18-plugin-mechanism.md:235-257`、実装例 `plugins/test-pro/tools/test-pro-doctor.ts:16-37`）
- プログラム API（主要 export）: validate（`validatePluginRoot`、`validatePluginName`、`scanPluginFiles`、`walkPluginFiles`、`assertSupportedPluginContributionPaths`、`formatPluginValidation`、`pluginValidationJson`）、emit（`buildPluginProjection`、`readPluginTargets`、`assertPluginBuildOutput`、`pluginReviewerAgents`、`PLUGIN_PROJECTION_MARKER`、`pluginBuildLockPath`）、test（`testPluginComposition`、`runPluginCompose`、`readPluginDropEntries`、`readPluginDropText`、`pluginTestJson`）、create（`createPluginScaffold`、`scaffoldFiles`、`pluginCreateJson`）、graph（`loadGraph`、`producersOf`、`consumersOf`、`topoSort`、`findCycles`、`subgraphForScope`、`validateScope`、`validateGrid`、`compileStageGraph`、`transposeScopeGrid`、`mergeComposedScopes`、`selectionDroppedOrderingEdges`、`computeArs` 他）、runner-gen（`runnableStages`、`renderStageRunner`、`renderInitRunner`、`renderComposeRunner`、`discoverScopes`、`defaultScopeBatch`、`renderRunner`）、includes（`repointHarnessIncludes`）、`scripts/manifest-types.ts`（`HarnessManifest` 型、`plugin?: {manifestDir, kind, installRoots}` を含む `160-170`）、`scripts/onboarding.ts`（`renderOnboarding`、`declaredSlots`）、`scripts/agent-knowledge.ts`（`reviewerAgentSet` は `plugins/*/stages` も走査 `28-58`、`absorbReviewerKnowledge`、`injectDelegatedKnowledgePreflight`、`agentNameFromPath`）

### Frameworks & Libraries
- bun — 実行環境（`bun-types ^1.3.13`）— すべての tools / hooks / tests の実行。`Bun.spawnSync` / `Bun.which` / `Bun.stdin` を直接使用
- TypeScript — `^6.0.3` — `tsc --noEmit` 3 プロジェクト構成
- @biomejs/biome — `2.4.16` — lint（formatter は無効）
- smol-toml — `1.7.0` — Codex の `config.toml` / trust-seed 出力（`harness/codex/emit.ts:21`）
- @anthropic-ai/claude-agent-sdk — `0.3.158` — ライブテストドライバ
- @xterm/headless `^5.5.0` + node-pty `1.1.0` — TUI ライブテスト
- knip（`knip.json`、devDependencies 未記載）、markdownlint-cli2、gitleaks、zensical（docs）
- ランタイム側は `node:*` 組込みと Bun API のみに依存。プラグイン用ツールとテンプレートは意図的に依存ゼロ（`validate.ts:2-6`、`plugins/test-pro/tools/*.ts` のヘッダ注記）

### Test Coverage
- **Test Directories**: `tests/smoke/`、`tests/unit/`（259）、`tests/integration/`（114）、`tests/e2e/`（78）、`tests/harness/`（ドライバと `plugin-kit.ts`）、`tests/hooks/`、`tests/fixtures/`（175）、`tests/evidence/`、`tests/lib/`；`plugins/test-pro/tests/plugin.test.ts`
- **Test Frameworks**: `bun:test`。`bun tests/run-tests.ts` が `t*.test.ts` を発見して実行（`tests/README.md` 冒頭）。ライブ用ドライバ `sdk-drive.ts` / `tui-drive.ts` / `kiro-acp-drive.ts` / `kiro-ide-driver.ts` / `exec-drive.ts`。プラグイン用ヘルパ `tests/harness/plugin-kit.ts`（`validatePluginContent` / `composePluginFixture` / `invokeHarness` / `liveGateFor`、`docs/harness-engineering/10-authoring-a-plugin.md:547-611`）
- プラグイン機構のテスト（ファイル名のみ確認）: unit `t222-plugin-runner-naming`、`t262-plugin-sensor-name-guard`、`t313-plugin-doctor-checks`、`t314-plugin-validate`、`t315-plugin-build`、`t316-plugin-test`、`t317-plugin-create`；integration `t188-plugin-compose`、`t224-plugin-selection`、`t300-plugin-kit`、`t314-plugin-reinstall-doctor`、`t327-plugin-author-routes`
- バイナリのスモークゲートにもプラグイン系がある: `pluginSelectGate`（`build-binaries.ts:611-641`）、`delegatePluginSyncGate`（`952-974`）、`realPluginSyncGate`（test-pro の claude 投影を実 compose し `test-pro-integration` が graph に載ることを検証、`976-1030`）
- **Coverage Config**: absent（行カバレッジ設定は見当たらない。`tests/.coverage-registry.json` はテスト→対象ユニットの対応表であり行カバレッジではない）

### Code Quality Indicators
- **Linting**: biome（`biome.json`。`bun run lint` = `biome check --error-on-warnings core harness scripts plugins tests`。`core/tools/**`・`harness/**`・`scripts/**` は `noNonNullAssertion` / `useTemplate` を off。`aidlc-knowledge.ts` には `node:fs` の読み取り専用 import を強制する `noRestrictedImports`）、knip（`knip.json`）、markdownlint、gitleaks（baseline 付き）
- **CI/CD**: `.github/workflows/ci.yml` — `check`（`package.ts --check` + typecheck + lint）、`test`（smoke + unit、`--parallel 8`）、`test-deep`（integration + e2e、`--no-llm`）、`changelog-guard`。ほかに `codebuild.yml`、`docs.yml`、`markdownlint.yml`、`pull-request-lint.yml`、`release-pr.yml`、`release.yml`、`security-scanners.yml`
- **Documentation**: `README.md`（32KB）、`AGENTS.md`、`CONTRIBUTING.md`、`docs/{guide,harness-engineering,reference,rfcs}`、`CHANGELOG.md`（620KB）。各ツールはファイル冒頭に設計意図の長文コメントを持ち、ラウンド番号付きのレビュー是正履歴（例 `compose.ts:1480,1673,2071`）がコード内に残る。プラグイン文書 2 章は as-built 状態（実装済み / 保留）を明示しており、コードと概ね一致（差異は下記）

### Technical Debt Signals
- 深読み集合に `TODO` / `FIXME` / `HACK`、`@ts-ignore` / `biome-ignore` は存在しない（grep で 0 件。`create.ts` のスキャフォールド文字列内 `TODO:` は生成物のプレースホルダ）
- 「設計済み・未実装」が明示された保留面: `after-questions` アンカー（`compose.ts:1693-1712` の `locateAnchor` に分岐がなく `unknown anchor` として drop；`docs/reference/18-plugin-mechanism.md:368` の表には状態なしで載り、同 `525` と `docs/harness-engineering/10-authoring-a-plugin.md:223` で ⏳ と明記）、`adds.requires_stage`（`compose.ts:2153-2158` で advisory drop）、`contributes.memory`（`validate.ts:224-232` で拒否）、`when:` 述語（`18-plugin-mechanism.md:459`、評価者なし）、`dependencies`（`10-authoring-a-plugin.md:622-625`、誰も読まない）、`required_sections` はマージされるが機械強制されない（`18-plugin-mechanism.md:378,525`）、`aidlc plugin create|test` の上位ルート（RFC #723）、`--dist`（`test.ts:795-799`）
- 巨大ファイル: `scripts/plugin-hooks-template/compose.ts` 2451 行（単一ファイル化は設計判断、`2-9`）、`core/tools/aidlc-graph.ts` 2962 行、`harness/cursor/hooks/aidlc-cursor-adapter.ts` 3079 行（shell 解析・git 安全性判定が `535-2580`）、`harness/kiro-ide/hooks/aidlc-kiro-adapter.ts` 2029 行（legacy Plan Approval 仲介が `175-504,1238-1603`）
- 重複ロジック: compose の `hashProse` / `locateAnchor` / `spliceFragment` / `mergeListField` / `mergeConsumes` / `mergeRequiredSections`（`compose.ts:1575-1782`）が `harness/cursor/install.ts:304-698` に再実装されており、再インストール時の再構成のために両者を同期させる必要がある。`plugin-contrib` sidecar のスキーマ解釈も compose（`1945-2034`）と `install.ts:134-235` の 2 箇所。`adds.*` の YAML 解析は validate（`nestedListField`、4 スペース固定、`validate.ts:455-479`）と compose（`listOf`、寛容で drop-log 付き、`compose.ts:2106-2118`）で別実装
- 文書とコードの小さなずれ: `compose.ts:1680` のコメントは build-and-test の範囲見出しを `### Step 4-8:` と書くが、出荷ステージは `### Step 3-7:`（`core/aidlc-common/stages/construction/build-and-test.md`、grep）。`harness/codex/manifest.ts:34` の `{ src: "rules", dst: "aidlc-rules" }` は `core/rules/` が存在しないため `package.ts:634` の `existsSync` で無視される死んだ行
- フェイルオープン設計: インストール先の lib / schema を読めないとき compose は検査を通す（`compose.ts:397-417,1411-1413`）。文書化された妥協だが、壊れたインストールで drop 以外の証拠が残らない
- `harness/kiro/manifest.ts:51-67` は 15 本の agent JSON を手書き列挙しており、`core/agents/` から導出していない

## Handoff Summary
- **Intent-relevant finding**: contributions のみのプラグイン（`grilling`）をこのエンジンがどう扱うかを、コードから確認した。
  1. 貢献ファイルの契約: `contributions/<phase>/<slug>.md`。frontmatter は `target`（core ステージ slug）、`plugin`（manifest `name` と一致）、`adds`（`produces` / `sensors` / `consumes` / `scopes` / `required_sections` のみ実装、`compose.ts:2153`）、`fragments`（`- anchor: … / order: N`）。本文は `## fragment: <anchor>` ブロックで、frontmatter の同一 anchor エントリと FIFO で対応づける（`2232-2284`。code fence 内の `## fragment:` は無視 `2243-2269`）。BOM / CRLF / 先頭空行は正規化（`2072-2073`）、prose の `{{HARNESS_DIR}}` は置換される（`2273`）。`bundle:` キーは拒否（`2084-2087`）、`plugin` に `:` を含むと拒否（`2091`）
  2. アンカーの実装状況（`compose.ts:1674-1713`）: `after-step:N`（`### Step N` または範囲 `### Step a-b` に N が含まれる見出しを探し、次の `##`/`###` 見出し直前に挿入）、`before-step:N`（見出し直前）、`end-of-steps`（`## Steps` 節の末尾 = 次の `## ` 直前）、`in:<Section>`（`## <Section>` 節末尾）。**`after-questions` は分岐がなく `unknown anchor` として drop される**（`1711`）。見出しが見つからない場合も drop（`1687,1697,1706`）
  3. スプライスの同一性: `<!-- plugin:<p>:<anchor>:<order>:<fnv1a-hex> -->` … `<!-- /plugin:… -->` の sentinel で囲む（`1743-1744`）。同じ hash なら skip、hash が変われば置換（アップグレード）（`1746-1760`）。同一 anchor の他プラグインブロックとは `(order, plugin)` で決定的に並ぶ（`1762-1776`）。同一 `(target, plugin, anchor, order)` の重複は drop（`2292-2296`）。適用済み fragment の `{anchor, order, hash}` は `tools/data/plugin-contrib-<key>.json` に記録され（`2012-2034,2298-2304`）、doctor の「Composed plugin surface」検査と `select-plugins` の無効化時 strip の根拠になる（`18-plugin-mechanism.md:279-288`）
  4. **validate の検査は貢献ファイルには薄い**: `validateContributions`（`validate.ts:751-795`）は `target` が `plugin-authoring-context.json` の core slug 集合に含まれるか（`766`）、`plugin` が manifest 名と一致するか（`775`）、`adds.produces` が `<plugin>-` 接頭辞か（`784-793`）だけを見る。anchor の妥当性、`fragments` と `## fragment:` 本文の対応、本文の有無は検査せず、compose 実行時の drop としてのみ表面化する。したがって `grilling` 側のテストは compose 層（`aidlc-plugin-test.ts` または `plugins/test-pro/tests/plugin.test.ts:45-91` のように実 `hooks/compose.ts` を走らせる形）が必須
  5. 対話モード質問の所在: 「Guide me / I'll edit the file / Chat」の正準 spec は `core/aidlc-common/protocols/stage-protocol.md`（grep、`372-387` 付近。ステージファイル側に `Guide me` の記述は 0 件）にあり、各ハーネスの `harness/*/skills/aidlc/question-rendering.md` がそれを描画する（Claude は `AskUserQuestion`、`harness/claude/skills/aidlc/question-rendering.md:33,48-58`；Kiro 系 annex は 3 択 + Other の固定リストを「Canonical interaction-mode rendering」として持つ）。貢献ファイルの `target` は core ステージ slug しか受け付けず（`validate.ts:766`、`compose.ts:1552-1558` は `aidlc-common/stages/<phase>/<slug>.md` しか探さない）、protocol や annex は seam の対象外。**第 4 モードはステージ本文への prose 追記としてしか届かない**（例: 各ステージの質問生成ステップの `after-step:N`、または `in:<Section>`）。質問ファイルを持つ core ステージは 28 本で全て `plugin-authoring-context.json` に含まれる slug（`package.ts:566-569`）
  6. 選択（selection）との関係: 貢献のマージは `pluginEnabledBySelection()` のときだけ（`compose.ts:2046-2054`）。`harness.json` に `plugins` キーが無ければ全有効（`274-291`、packager は書かない `package.ts:479-498`）。一方 `select-plugins` の既知名は「コンパイル済みノードと scope ファイル」から導出され（`18-plugin-mechanism.md:207-209`、`core/tools/aidlc-utility.ts:532 knownPluginNames`、skim）、doctor のプラグイン検出も stage / scope の所有を要求する（`18-plugin-mechanism.md:231-233`）。stage も scope も持たない `grilling` は、選択キーが一度でも書かれた環境では名前で有効化できず、`grilling-doctor.ts` も検出されない可能性が高い（要検証、下記）
  7. 再コンパイル契機: `changed`（新規コピーまたはステージ本文の変化）か、compile 失敗時の再試行マーカー `aidlc/.plugin-compose-retry-<key>`（`2376-2399`）。stage を持たないプラグインは graph 欠落検知（`2348-2359`）が効かないため、マーカーが自己修復の唯一の経路。compile 成功後は SKILL.md の stage/scope 表を再生成し（`2406-2407`）、runner を再生成する（`2412-2433`）。compose 全体はインストール済み engine の workspace lock 下で走り、engine が `AIDLC_WORKSPACE_LOCK_OWNER_PID` を解する版であることを要求する（`433-452,117-126`；2.7.0 の `aidlc-graph.ts:2817-2831` は対応済み）
  8. 投影（build）: `contributions/` は `CONTENT_DIRS` の一員としてそのままコピーされる（`emit.ts:74-82,421-458`）。`hooks/compose.ts` はバンドル版が注入され、vendored 版があれば byte 一致を要求（`290-322`、`validate.ts:957-1000`）。`aidlc-plugin-compose.ts` は cursor / kiro-ide のみ（`308-315`）。ホスト manifest は `aidlc-<name>`、`marketplace.json` 同梱、所有マーカー付き（`613-647,599-611`）。7 ターゲットは `plugin-targets.json` 由来（`dist/claude/.claude/tools/data/plugin-targets.json`、照合）。manifest の `aidlc.contributes.overlays` は `"contributions/"` 固定（`validate.ts:127-135,233-241`）
  9. テスト（`aidlc-plugin-test.ts`）: `installRoots` を一時 candidate にコピー（`187-203`）→ 投影 build → compose 1 回目（drop 0 件を要求 `604-625`）→ `aidlc-graph.ts compile`（`432-472`）→ compose 2 回目で byte 不変を要求（`665-696`）→ 実インストールが変化していないことを確認（`707-728`）。stage / scope が空のプラグインでは graph 存在検査は自明に通り、意味のあるゲートは「drop なし」と「冪等」の 2 つ
  10. 文書の約束（`docs/reference/18-plugin-mechanism.md`）: 追加のみ・上書き禁止（`22,360`）、engine 再インストールでマージが消えるため `plugin sync` を毎回走らせる（`161-172`）、選択で無効化するとマージも strip される（`279-288`）、初回 SessionStart でホスト hook が compose する（`146-150`）。`10-authoring-a-plugin.md:239-246` は sentinel 風の行を prose に書かないよう警告している
- **Risks / follow-up**:
  - `after-questions` が未実装のため、計画は 28 ステージそれぞれの質問ステップ番号に合わせた `after-step:N`（または `in:` / `end-of-steps`）を選ぶ必要がある。番号はステージごとに異なり、`build-and-test` は範囲見出し `### Step 3-7` を持つ。ステージ別の対応表は `core/aidlc-common/stages/`（今回は skim のみ）の深読みが必要
  - protocol / annex は seam の対象外。第 4 モードを `AskUserQuestion` の正準 spec や Kiro annex の固定リストに反映する手段はプラグインには無い（フレームワーク側の変更か、prose レベルで「Other を選んで grill と伝える」等の設計に落とす必要がある）
  - contributions のみのプラグインに対する `select-plugins`（`aidlc-utility.ts:532 knownPluginNames`）と doctor の挙動は束縛集合外のため未検証。選択キーが存在する環境で貢献がマージされない事態を、実サンドボックスで確認すること
  - validate は anchor / fragment 対応を検査しない。`grilling` の CI は compose 層のテスト（`composePluginFixture` 相当、または `aidlc-plugin-test.ts --install`）を必ず含めること
  - compose のマージロジックは `harness/cursor/install.ts` に複製されている。Cursor 再インストール後の再構成は sentinel と sidecar の整合に依存するため、fragment の記述形式（1 ブロック 1 anchor、hash 整合）を崩さないこと
  - 文書 drift（`compose.ts:1680` の範囲見出し例、`18-plugin-mechanism.md:368` の `after-questions` 表記）は architect が引用時に注意
  - 束縛集合外で必要になった深読み対象: `core/aidlc-common/protocols/stage-protocol.md`（対話モード質問の正準 spec）、`core/aidlc-common/stages/*/*.md`（28 本の Step 番号）、`core/tools/aidlc-utility.ts`（`select-plugins` / `plugin sync` / doctor の「Composed plugin surface」）、`core/tools/aidlc-lib.ts`（`pluginsEnabled` / `stageEnabledBySelection` / `hooksHealthDir` / `acquireAuditLock`）、`core/tools/aidlc-stage-schema.ts`、`core/hooks/aidlc-rebuild-stage-graph.ts`、`tests/harness/plugin-kit.ts`、`tests/integration/t188-plugin-compose.test.ts`
