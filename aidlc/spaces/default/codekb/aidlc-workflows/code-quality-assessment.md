# Code Quality Assessment — aidlc-workflows

> 深読み 13 パスの範囲での評価。テストは件数とファイル名の確認に留まり、本文は `plugins/test-pro/tests/plugin.test.ts` と `tests/README.md` 冒頭のみ読んだ。

## Test Coverage

| 観点 | 実測 |
|---|---|
| テスト階層 | `tests/smoke` 14 / `unit` 259 / `integration` 114 / `e2e` 78 ファイル、`harness` 21（ドライバ + `plugin-kit.ts`）、`hooks` 1、`fixtures` 175、`evidence` 5、`lib` 2；`plugins/test-pro/tests/plugin.test.ts` |
| フレームワーク | `bun:test`。`bun tests/run-tests.ts` が `t*.test.ts` を発見して実行（登録不要）。`covers:` ヘッダを `gen-coverage-registry.ts` が `.coverage-registry.json` に集約 |
| プラグイン機構のテスト（ファイル名のみ） | unit: `t222-plugin-runner-naming`、`t262-plugin-sensor-name-guard`、`t313-plugin-doctor-checks`、`t314-plugin-validate`、`t315-plugin-build`、`t316-plugin-test`、`t317-plugin-create`；integration: `t188-plugin-compose`（packager + 実 compose の e2e ガード、ヘッダ確認）、`t224-plugin-selection`、`t300-plugin-kit`、`t314-plugin-reinstall-doctor`、`t327-plugin-author-routes` |
| バイナリのスモークゲート | `pluginSelectGate`、`delegatePluginSyncGate`、`realPluginSyncGate`（`build-binaries.ts:611-642,952-1031`） |
| 行カバレッジ設定 | **なし**（`bunfig.toml` 不在、coverage フラグの使用も CI に無い） |
| ライブ層 | Claude SDK / TUI / Kiro ACP・IDE / Codex exec / Copilot exec は環境変数ゲートで opt-in。CI は `--no-llm` で明示除外 |

評価: プラグイン機構は unit（ツール 4 本 + doctor + 命名）と integration（compose、selection、kit、reinstall doctor、author routes）の両層で守られている。ただし **contributions のみのプラグイン**（stage / scope なし）を対象にした selection / doctor のテストは、ファイル名からは確認できない（未検証）。

## Linting and Static Checks

- **biome 2.4.16**（`bun run lint` = `biome check --error-on-warnings core harness scripts plugins tests`）。formatter 無効。`tests/**` は `noNonNullAssertion` off、`core/tools/**` / `harness/**` / `scripts/**` は `noNonNullAssertion` と `useTemplate` off。`core/tools/aidlc-knowledge.ts` には `node:fs` の読み取り専用 import を強制する `noRestrictedImports`（書き込みは `aidlc-lib.ts` の atomic writer 経由）。
- **tsc --noEmit** を 3 プロジェクト（本体 / tests / adapters）で実行。adapter は dist 側で型検査する設計（`tsconfig.adapters.json`）。
- **knip**（`knip.json`、devDependencies 未記載）、**markdownlint**、**gitleaks**（baseline 付き）。
- 深読み集合に `TODO` / `FIXME` / `HACK`、`@ts-ignore` / `biome-ignore` は **0 件**（`create.ts` のスキャフォールド文字列内 `TODO:` は生成物のプレースホルダ、`create.ts:53-54`）。

## CI/CD

- `.github/workflows/ci.yml`（PR gate、bun 1.3.14 固定、actions は SHA 固定）: `check`（`bun run check` = `package.ts --check` + typecheck + lint）、`test`（smoke + unit、`--parallel 8`）、`test-deep`（integration + e2e、`--no-llm`、90 分上限）、`changelog-guard`（`## [x.y.z]` 見出しの削除を拒否）。
- 他: `codebuild.yml`、`docs.yml`、`markdownlint.yml`、`pull-request-lint.yml`、`release-pr.yml`、`release.yml`、`security-scanners.yml`（ジョブ名のみ）。
- リリース: `CHANGELOG.md` 先頭は `2.7.1`（2026-09-01）、`aidlc-version.ts` も `2.7.1`。本スキャン対象のコミットは `v2.7.0-1-ga277af21`（タグ `v2.7.0` の 1 つ先）。

評価: 生成物の drift、型、lint、決定的テスト、changelog がすべて PR gate で拒否される。強い。

## Documentation Quality

- `README.md`（32 KB）、`AGENTS.md`、`CLAUDE.md`、`CONTRIBUTING.md`、`CHANGELOG.md`（620 KB）、`docs/{guide 17 章, harness-engineering 11 章, reference 19 章, rfcs}`。
- 各ツールは冒頭に設計意図の長文コメントを持ち、レビュー是正履歴を「round-N」「review #N」で本文中に残す（例 `compose.ts:1670-1673,2232-2238,2247-2255,2306`）。設計判断の追跡性は高い。
- プラグイン文書 2 章は as-built 状態（✅ / ⏳）を明示し、コードと概ね一致する。差異は下記 Documentation Drift。

## Technical Debt Signals

### 設計済み・未実装（文書が明示）

| 面 | 状態 | 根拠 |
|---|---|---|
| `after-questions` anchor | `locateAnchor` に分岐なし → `unknown anchor` として drop | `compose.ts:1711`；`18-plugin-mechanism.md:370` は状態なし、`18:525` と `10-authoring-a-plugin.md:223` は ⏳ |
| `adds.requires_stage` | advisory drop、マージされない | `compose.ts:2153-2158` |
| `contributes.memory` | validate が拒否 | `validate.ts:224-232` |
| `when:` 述語 | parse のみ、評価者なし | `18-plugin-mechanism.md:459` |
| `dependencies` | 誰も読まない | `10-authoring-a-plugin.md:622-625` |
| `required_sections` | マージ・検証されるが機械強制されない | `18-plugin-mechanism.md:378,525` |
| `aidlc plugin create|test` 上位ルート | RFC #723 §2e に保留 | `18:525` |
| `aidlc-plugin-test --dist` | RFC #722 milestone 2 まで予約 | `test.ts:795-799` |
| `aidlc.contributes` の可変ルーティング | 正準パス固定 | `validate.ts:233-241` |

### 本 intent に直接効くリスク

1. **`after-questions` 未実装**: 質問生成ステップ直後を狙う contribution は、28 ステージごとに異なる `after-step:N`（`build-and-test` は範囲見出し `### Step 3-7:` を持つ、`core/aidlc-common/stages/construction/build-and-test.md:81`）か `in:<Section>` / `end-of-steps` を選ぶ必要がある。ステージ別の対応表は束縛集合外（`core/aidlc-common/stages/`）の深読みが必要。
2. **validate が anchor / fragment 対応を検査しない**（`validate.ts:751-795`）: 誤った anchor や本文欠落は compose の drop でしか分からない。`grilling` の CI は compose 層のテスト（`aidlc-plugin-test.ts --install`、または `plugins/test-pro/tests/plugin.test.ts:45-63` のように実 `hooks/compose.ts` を走らせる形）を必ず含めること。
3. **compose ロジックの複製**（`harness/cursor/install.ts:300-784` ↔ `compose.ts:1575-1782`、sidecar 解釈も `install.ts:126-300` ↔ `compose.ts:1945-2034`）: Cursor 再インストール後の再構成は両者の同期に依存する。fragment の記述形式（1 ブロック 1 anchor、hash 整合）を崩さないこと。
4. **stage / scope を持たないプラグインと `select-plugins` / doctor**: `knownPluginNames()` はコンパイル済みノードと scope メタデータから名前を集め（`aidlc-utility.ts:532-545`、流し読み）、doctor の検出も stage / scope 所有を要求する（`18-plugin-mechanism.md:231-233`）。`harness.json` に `plugins` キーが書かれた環境で `grilling` を名前で有効化できるか、`grilling-doctor.ts` が検出されるかは **未検証**。実サンドボックスでの確認が必要。
5. **protocol / annex は seam の対象外**: 対話モード選択の正準 spec は `stage-protocol.md:372-387`、描画は `harness/*/skills/aidlc/question-rendering.md`。contribution の `target` はコアステージ slug のみ（`validate.ts:766`、`compose.ts:1556-1562` は `aidlc-common/stages/<phase>/<slug>.md` しか探さない）。第 4 モードはステージ本文への prose 追記としてしか届かない。
6. **stage 無しプラグインの再コンパイル自己修復**: graph 欠落検知（`compose.ts:2348-2359`）が効かないため、`aidlc/.plugin-compose-retry-<key>` マーカー（`2376-2399`）が唯一の経路。

### 構造的負債

- **巨大ファイル**: `compose.ts` 2451 行（単一ファイル化は設計判断、`2-9`）、`aidlc-graph.ts` 2962 行、`harness/cursor/hooks/aidlc-cursor-adapter.ts` 3079 行（shell 解析・git 安全性判定 `535-2580`）、`harness/kiro-ide/hooks/aidlc-kiro-adapter.ts` 2029 行（legacy Plan Approval 仲介 `175-504,1238-1603`）、`scripts/build-binaries.ts` 1934 行、`scripts/package.ts` 1252 行、`harness/cursor/install.ts` 1191 行。
- **重複ロジック**: 上記 3 に加え、`adds.*` の YAML 解析が validate（`nestedListField`、4 スペース固定、`validate.ts:455-479`）と compose（`listOf`、寛容 + drop、`compose.ts:2106-2118`）で別実装。
- **フェイルオープン**: インストール先 lib / schema を読めないとき compose は検査を通す（`compose.ts:397-417,1405-1413`）。文書化された妥協だが drop 以外の証拠が残らない。
- **手書き列挙**: `harness/kiro/manifest.ts:51-67` は 15 本の agent JSON を列挙し、`core/agents/` から導出していない。
- **死んだ行**: `harness/codex/manifest.ts:34` の `{ src: "rules", dst: "aidlc-rules" }` は `core/rules/` が存在しないため `package.ts:634` で無視される。
- **カバレッジ床なし**: 行／分岐カバレッジの設定・CI ゲートが無い。

### Documentation Drift（引用時の注意）

| 箇所 | 記述 | 実態 |
|---|---|---|
| `compose.ts:1680` コメント | build-and-test の範囲見出しを `### Step 4-8:` と例示 | 出荷ステージは `### Step 3-7:`（`build-and-test.md:81`） |
| `18-plugin-mechanism.md:370` | anchor 表に `after-questions` を状態なしで掲載 | 未実装（同文書 `525`、`10:223` は ⏳） |
| `aidlc-graph.ts:8` コメント | 「31 stage definitions」 | `core/aidlc-common/stages/` は 33 本 |
| `harness/claude/manifest.ts:78-80` コメント | 「Codex is the only harness that ships an emit.ts today」 | copilot / opencode も `emit.ts` を持つ |
| ハンドオフ（developer scan） | validate のルール id「32 種」 | `PluginValidationRule` は **38 種**（`validate.ts:34-72`） |
| ハンドオフ（developer scan） | `create.ts:423-448,508-585,620-648` | ファイルは 427 行。正しくは用法 `20-21`、`scaffoldFiles` `198`、非空拒否 `260-282`、`createPluginScaffold` `283-330`、`main` `395` |
| ハンドオフ（developer scan） | `core/tools/` 50 本 | `.ts` は 51 本（`aidlc.ts` を含む）+ `data/` |

## Security Observations

- symlink は validate / emit / test / cursor install のいずれでも拒否される（`validate.ts:135-146`、`emit.ts:460-509`、`install.ts:39-66`）。
- 出力先は所有マーカーで保護され、他プラグイン／他ハーネスの出力を消さない（`emit.ts:511-563`）。
- プラグイン doctor は「インストール済み = 信頼境界」だが、spawn 失敗・タイムアウト・不正 JSON・上限超過を bounded finding に閉じ込める（`18-plugin-mechanism.md:250-257`）。
- ホスト配線は `sh -c` の一行文字列で `command -v` に依存する（`emit.ts:337-351`）。PATH に無い環境では警告して exit 0（沈黙に近いが drop ではない）。
- gitleaks + baseline で秘密情報を走査。深読み範囲にハードコードされた資格情報はない。

## Overall Rating

| 領域 | 評価 |
|---|---|
| ビルド／配布の再現性 | 高（dist コミット + `--check`、決定的スキャフォールド、所有マーカー） |
| テスト | 高（4 層 + バイナリゲート）。ただしカバレッジ床なし、contributions のみのケースは未確認 |
| 保守性 | 中（巨大ファイルと重複ロジック。設計意図のコメントは豊富） |
| 文書 | 高（as-built 明示）。小さな drift あり |
| 本 intent への適合 | 中。contributions のみのプラグインは機構の想定内（retry marker、prose-only sidecar）だが、選択・doctor・anchor の 3 点に未検証／未実装がある |

## Follow-up for the Next Stage

深読みを広げるべき対象（本 run では `shallow.paths` に記録）:

1. `core/aidlc-common/protocols/stage-protocol.md`（対話モード質問の正準 spec、`372-387`、`463`）
2. `core/aidlc-common/stages/*/*.md`（28 本の質問ステップの `### Step N` 番号）
3. `core/tools/aidlc-utility.ts`（`select-plugins` / `plugin sync` / doctor "Composed plugin surface"）
4. `core/tools/aidlc-lib.ts`（`pluginsEnabled` / `stageEnabledBySelection` / `hooksHealthDir` / `acquireAuditLock`）
5. `core/tools/aidlc-stage-schema.ts`
6. `core/hooks/aidlc-rebuild-stage-graph.ts`
7. `tests/harness/plugin-kit.ts`、`tests/integration/t188-plugin-compose.test.ts`、`tests/integration/t224-plugin-selection.test.ts`
8. 実サンドボックスでの確認: `harness.json` に `plugins` キーがある状態での `grilling` の有効化と doctor 検出
