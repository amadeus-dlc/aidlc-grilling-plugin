# Code Structure — aidlc-workflows

> 深読みは 13 パス（`reverse-engineering-timestamp.md`）。それ以外のディレクトリは一覧・grep のみで、ファイル数は `find` の実測値。

## Top-level Layout

| パス | 種別 | 内容 | 読み深さ |
|---|---|---|---|
| `core/` | ソース（ハーネス中立） | `tools/`（`.ts` 51 本 + `data/`）、`hooks/`（18 本）、`aidlc-common/`（`conductor.md`、`stage-definition.md`、`protocols/` 8 本、`stages/` 33 本）、`agents/`（14 本）、`knowledge/`、`memory/`、`scopes/`（11 本）、`sensors/`（6 本）、`skills/`（4 本）、`templates/` | プラグイン 5 ツール + `aidlc-includes.ts` + `aidlc-graph.ts` + `aidlc-runner-gen.ts` のみ深読み |
| `harness/` | ソース（ハーネス固有） | 7 ディレクトリ（`claude`、`codex`、`copilot`、`cursor`、`kiro`、`kiro-ide`、`opencode`）。各 `manifest.ts` 必須、`emit.ts` は codex / copilot / opencode のみ、`install.ts` は cursor のみ | 深読み |
| `scripts/` | ビルド／補助 | `package.ts`（1252 行）、`build-binaries.ts`（1934 行）、`plugin-hooks-template/{compose.ts (2451 行), aidlc-plugin-compose.ts (92 行)}`、`agent-knowledge.ts`、`onboarding.ts`、`manifest-types.ts`、`ci-changelog-guard.ts`、`docs-rewrite-links.ts` | 深読み |
| `plugins/` | 一次プラグインの authored tree | `test-pro/` のみ（17 ファイル: manifest 1、stages 2、contributions 4、sensors 2、tools 3、scope 1、agent 1、knowledge 1、tests 1、README 1） | 深読み |
| `dist/` | 生成物（コミット済み） | `claude` 277 / `codex` 333 / `copilot` 289 / `cursor` 285 / `kiro` 293 / `kiro-ide` 299 / `opencode` 290 ファイル、`plugins/test-pro/<7 harness>` 134 ファイル | 一覧と `tools/data/*.json` の照合のみ |
| `tests/` | テスト | `smoke` 14 / `unit` 259 / `integration` 114 / `e2e` 78 / `harness` 21 / `hooks` 1 / `fixtures` 175 / `evidence` 5 / `lib` 2、`run-tests.ts`、`gen-coverage-registry.ts`、`.coverage-registry.json` | 一覧、`README.md` 冒頭、プラグイン系ファイル名のみ |
| `docs/` | 文書 | `guide/`（17 章 + `agents/` `harnesses/` 他）、`harness-engineering/`（00〜10）、`reference/`（00〜18 + `agents/` `04-stages/` `examples/` `research/`）、`rfcs/`、`roadmap.md`、`README.md` | `reference/18-plugin-mechanism.md` と `harness-engineering/10-authoring-a-plugin.md` のみ深読み |
| `.github/workflows/` | CI | `ci.yml`、`codebuild.yml`、`docs.yml`、`markdownlint.yml`、`pull-request-lint.yml`、`release-pr.yml`、`release.yml`、`security-scanners.yml` | ジョブ名のみ |
| ルート設定 | 設定 | `package.json`、`bun.lock`、`tsconfig.json` / `tsconfig.tests.json` / `tsconfig.adapters.json`、`biome.json`、`knip.json`、`.markdownlint-cli2.yaml`、`.gitleaks.toml` + `.gitleaks-baseline.json`、`zensical.toml`、`pyproject.toml` / `uv.lock`、`AGENTS.md`、`CLAUDE.md`、`CHANGELOG.md`（2.7.1 が先頭） | 一覧と主要内容 |

## Package and Module Organization

このリポジトリに npm パッケージ境界はなく（`package.json` は `aidlc-workflows-dev` 単一、`private: true`）、モジュール境界は **ディレクトリ + tsconfig の include** で表現される。

- `tsconfig.json` は `core/**`、`harness/**`、`scripts/**`、`plugins/*/tools/**` を含み、`harness/*/hooks/*-adapter.ts` を除外する。adapter は生成された dist ツリー内の兄弟ツールを import するため、`tsconfig.adapters.json` が `dist/*/.*/hooks/*-adapter.ts` を対象に別途型検査する。テストは `tsconfig.tests.json`（`tests/**`、`plugins/*/tests/**`）。
- **実行時ツール群（`core/tools/`）** は相対 `./aidlc-*.ts` import で互いを参照し、`node:*` と Bun API のみに依存する。プラグイン 5 ツールは `aidlc-plugin-validate.ts` を共通基盤に、`emit` が `validate` + `aidlc-lib.ts`（`runWithOwnerStampedLock`）を、`build` が `emit` + `validate` を、`test` が `build` + `emit` + `validate` を、`create` が `validate`（`validatePluginName`）を import する（`aidlc-plugin-build.ts:13-23`、`aidlc-plugin-emit.ts:31-37`、`aidlc-plugin-test.ts:40-43`、`aidlc-plugin-create.ts:15-18`）。
- **packager（`scripts/`）** は dev checkout 専用。`package.ts` は `../core/tools/aidlc-plugin-emit.ts` と `aidlc-tiers.ts`、`./agent-knowledge.ts`、`./onboarding.ts` を静的 import し、`harness/<name>/manifest.ts` を `require` で動的に読む（`package.ts:66-73,896-899`）。
- **compose hook template（`scripts/plugin-hooks-template/`）** は静的 import を持たず、インストール先 `<harness>/tools/aidlc-lib.ts` と `aidlc-stage-schema.ts` を実行時に動的 import する（`compose.ts:103-115`）。packager がこれを `tools/data/plugin-hooks-template/` として dist に同梱し、`aidlc-plugin-emit.ts` が `hooks/compose.ts` に注入する（`aidlc-plugin-emit.ts:290-322`、`aidlc-plugin-validate.ts:957-1000`）。
- **harness emit（`harness/{codex,copilot,opencode}/emit.ts`）** は組み立て済み dist ツリー内の `tools/aidlc-runner-gen.ts` を `require` してランナーを合成する（`harness/codex/emit.ts:375-389`、`harness/copilot/emit.ts:112-124`）。

## File Classification

| 分類 | 例 | 規約 |
|---|---|---|
| 実行時ツール（CLI + ライブラリ両用） | `core/tools/aidlc-plugin-*.ts`、`aidlc-graph.ts`、`aidlc-runner-gen.ts` | 先頭に設計意図の長文コメント、`export function main(argv): number` または `void`、末尾 `if (import.meta.main)` ガード（例 `aidlc-plugin-validate.ts:1109-1141`、`aidlc-graph.ts:2931-2962`、`aidlc-runner-gen.ts:809-841`） |
| 実行時フック | `core/hooks/aidlc-*.ts`（18 本、一覧のみ）、`harness/*/hooks/*-adapter.ts` | ハーネスのイベント JSON を stdin で受け、`<target>` 引数でコアフックにディスパッチ（codex 14 / copilot 8 / cursor 9 / kiro 13 / kiro-ide 11 ターゲット、opencode は plugin API 経由） |
| 宣言ファイル | `harness/*/manifest.ts` | `HarnessManifest` 型（`scripts/manifest-types.ts:67`）に従う既定エクスポート。`coreDirs` / `harnessFiles` / `rulesRename` / `skipRunnerGen` / `emit` / `plugin` |
| ハーネス authored surface | `harness/*/skills/aidlc/{SKILL.md,question-rendering.md}`、`settings.json`、`agents/*.json`、`dot-gitignore`、`rules-*.mdc` | 逐語コピー（`.md` は `{{HARNESS_DIR}}` 置換あり） |
| 生成テンプレート | `scripts/plugin-hooks-template/*.ts`、`core/templates/` | packager が dist へ同梱 |
| プラグイン authored tree | `plugins/test-pro/` | `docs/reference/18-plugin-mechanism.md:48-62` の形（`api-documentation.md` 参照） |
| 生成物 | `dist/**` | 手編集禁止、`package.ts --check` が差分を拒否 |
| テスト | `tests/**/t*.test.ts`、`plugins/*/tests/*.test.ts` | `bun:test`、先頭コメントに `covers:` ヘッダ、`.coverage-registry.json` に集約 |
| 文書 | `docs/**`、`README.md`、`CHANGELOG.md` | zensical、markdownlint |

## Code Patterns

深読み範囲で一貫して観測されたパターン。

1. **オフライン前提・依存ゼロ**: プラグイン 5 ツールと compose テンプレートは「AIDLC プロジェクトも checkout もネットワークも不要」を明示する（`aidlc-plugin-validate.ts:2-6`、`aidlc-plugin-emit.ts:1-6`）。同梱データ（`tools/data/*.json`）を `import.meta.dir` 相対で解決し、無ければソースツリーにフォールバックする（`aidlc-plugin-validate.ts:401-436`）。
2. **`--json` と終了コードの規約**: 0 = 成功、1 = 検査所見、2 = 用法誤り。JSON は `{valid, errors, warnings}` を基本形とし、テストは `pluginTestJson` で拡張する（`aidlc-plugin-validate.ts:1113-1137`、`aidlc-plugin-test.ts:843-887`）。
3. **No silent failures（drop-log）**: compose は失敗を throw せず `recordDrop(reason, severity)` で記録し、`flushDrops()` が上書き／削除する（`compose.ts:191-227`）。「round-N」と番号付けされたレビュー是正コメントが、どの沈黙失敗をいつ潰したかをコード内に残す（例 `compose.ts:1670-1673,2232-2238,2247-2255`）。
4. **compare-before-write と rollback/commit**: ステージソースは変化があるときだけ書き（`compose.ts:2306-2309`）、compile 失敗時は `rollbackComposeWrites()`、成功時は `commitComposeWrites()`（`compose.ts:2386-2402`）。
5. **sentinel + sidecar による所有と冪等性**: スプライス済みブロックを `<!-- plugin:… -->` で囲み、適用結果を `tools/data/plugin-contrib-<key>.json` に記録する（`compose.ts:1743-1744,2012-2034`）。
6. **所有マーカーによる破壊的操作の拒否**: builder は非空出力に `.aidlc-plugin-projection.json`（schema 1、producer `aidlc-plugin-build`、plugin、harness）を要求する（`aidlc-plugin-emit.ts:511-563`）。create は staging → `renameSync` で原子的に配置し、検証後にターゲットが変わっていれば拒否する（`aidlc-plugin-create.ts:315-330`）。
7. **symlink 拒否**: validate / emit / test / cursor install がそれぞれ `lstatSync` で symlink を検出して拒否する（`aidlc-plugin-validate.ts:135-146` の `PLUGIN_SYMLINK_SCAN_DIRS`、`aidlc-plugin-emit.ts:460-509`、`harness/cursor/install.ts:39-66`）。
8. **manifest が唯一の情報源**: `plugin-targets.json`、`harness.json`、`plugin-authoring-context.json` は packager の writer だけが決める（`package.ts:479-498,558-575,1036-1075`）。手で足したキーは `--check` で消える。
9. **生成表の in-place 更新**: SKILL.md 内の stage-table / scope-table 領域を BEGIN/END マーカーで置換する（`compose.ts:2406-2407`、`package.ts:19-21`）。`aidlc-includes.ts` も同じく「ポインタ断片だけを外科的に書き換える」方式（`aidlc-includes.ts:17-22`）。
10. **`main(argv)` の分離**: CLI 引数解析（`parseArgs`）と処理本体（`validatePluginRoot` / `buildPluginProjection` / `testPluginComposition` / `createPluginScaffold`）を分け、テストから関数として呼べるようにしている。

## Naming Conventions

- ツール／フックは `aidlc-<name>.ts`（センサースクリプトは `aidlc-sensor-<id>.ts`）。プラグインの doctor は `tools/<plugin>-doctor.ts`。
- プラグイン配下: スコープ `scopes/<plugin>-<name>.md`（frontmatter `name` = stem）、エージェント `agents/<plugin>-<role>-agent.md`、成果物名は `<plugin>-` 接頭辞必須、ホスト manifest 名は `aidlc-<plugin>`（`aidlc-plugin-emit.ts:613-620`）。予約名は `core` / `aidlc` / `aidlc-*`（`aidlc-plugin-validate.ts:111-116`、`package.ts:1195-1198`）。
- テストは `t<番号>-<slug>.test.ts`、番号は一意（`tests/README.md`）。
- 環境変数は `AIDLC_*`（`AIDLC_HARNESS_DIR`、`AIDLC_HARNESS_NAME`、`AIDLC_PLUGIN_ROOT`、`AIDLC_PROJECT_DIR`、`AIDLC_WORKSPACE_LOCK_OWNER_PID` 等）。ホスト由来は `CLAUDE_PLUGIN_ROOT` / `CLAUDE_PROJECT_DIR` / `CURSOR_PROJECT_DIR` / `PLUGIN_ROOT`。

## Cross-references

- コンポーネント単位の責務: `component-inventory.md`
- 契約の詳細: `api-documentation.md`
- 依存の方向: `dependencies.md`
