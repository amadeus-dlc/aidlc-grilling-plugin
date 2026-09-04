# Reverse Engineering Timestamp — aidlc-workflows

## Run Record

| 項目 | 値 |
|---|---|
| 実施日時（UTC） | 2026-09-04T05:59:47Z |
| 対象リポジトリ | `aidlc-workflows`（ワークスペース直下の git submodule） |
| コミット | `a277af218f0df7f325d3b8be7b6d90fce2c5bd40`（`git describe --tags --long` = `v2.7.0-1-ga277af21`） |
| フレームワーク版 | `AIDLC_VERSION = "2.7.1"`（`dist/claude/.claude/tools/aidlc-version.ts`）、`CHANGELOG.md` 先頭 `2.7.1`（2026-09-01） |
| intent | `260904-plugin-plan`（scope `plugin-dev`、depth Standard） |
| ストア状態 | NO_STORE（初回スキャン）。9 成果物すべてを本 run で新規作成 |
| スキャン方針 | FOCUSED（人間の判断）。プラグイン機構に関わる 13 パスのみ深読み、他はディレクトリ粒度の流し読み |
| パイプライン | link 1 = developer scan（`inception/reverse-engineering/developer-scan-aidlc-workflows.md`）、link 2 = architect synthesis（本 9 成果物） |

## Scan Breadth

- **深読み**: プラグイン著作ツール 5 本、`aidlc-includes.ts`、`aidlc-graph.ts`、`aidlc-runner-gen.ts`、`plugins/`（test-pro 17 ファイル）、プラグイン文書 2 章、`harness/`（7 manifest、3 emit、cursor install、6 adapter、authored surface）、`scripts/`（packager、binary builder、hook テンプレート 2 本、補助 5 本）。
- **流し読み**: `core/tools/` の残り 43 本、`core/aidlc-common/`（stages 33 本の一覧と `### Step` 見出しの grep、`protocols/` の対話モード grep）、`core/hooks/` `core/agents/` `core/knowledge/` `core/memory/` `core/scopes/` `core/sensors/` `core/skills/` `core/templates/`（一覧）、`docs/` の残り、`tests/`（一覧・README 冒頭・プラグイン系ファイル名）、`dist/`（一覧と `tools/data/*.json` の照合）、`.github/`（ジョブ名）、ルート設定。
- **architect による追加検証**: ハンドオフの主要な file:line 主張を実ファイルで再確認した。不一致（validate ルール id 数、`create.ts` の行番号、`core/tools/` 件数）は `code-quality-assessment.md` の Documentation Drift に記録した。

## Scope of Analysis

```yaml
scope_version: 1
kind: partial
intent: plugin-plan
fingerprint: f3cadd62e316cd4f2aa96fc095ab209f2c1af695
analyzed:
  paths:
    - core/tools/aidlc-plugin-build.ts
    - core/tools/aidlc-plugin-create.ts
    - core/tools/aidlc-plugin-emit.ts
    - core/tools/aidlc-plugin-test.ts
    - core/tools/aidlc-plugin-validate.ts
    - core/tools/aidlc-includes.ts
    - core/tools/aidlc-graph.ts
    - core/tools/aidlc-runner-gen.ts
    - plugins/
    - docs/reference/18-plugin-mechanism.md
    - docs/harness-engineering/10-authoring-a-plugin.md
    - harness/
    - scripts/
  components:
    - Plugin Validator
    - Plugin Projection Emitter
    - Plugin Build CLI
    - Plugin Compose Test CLI
    - Plugin Scaffold CLI
    - Compose Hook Template
    - Plugin Compose Launcher
    - Stage Graph Compiler
    - Runner Generator
    - Harness Include Repointer
    - Packager
    - Binary Builder
    - Harness Manifests
    - Harness Emitters
    - Harness Hook Adapters
    - Cursor Installer
    - Packager Support Scripts
    - test-pro Reference Plugin
    - Plugin Documentation
shallow:
  paths:
    - core/tools/
    - core/aidlc-common/
    - core/aidlc-common/protocols/stage-protocol.md
    - core/aidlc-common/stages/
    - core/tools/aidlc-utility.ts
    - core/tools/aidlc-lib.ts
    - core/tools/aidlc-stage-schema.ts
    - core/tools/aidlc-sensor-schema.ts
    - core/tools/aidlc-tiers.ts
    - core/tools/aidlc-runtime-paths.ts
    - core/hooks/
    - core/hooks/aidlc-rebuild-stage-graph.ts
    - core/agents/
    - core/knowledge/
    - core/memory/
    - core/scopes/
    - core/sensors/
    - core/skills/
    - core/templates/
    - docs/
    - tests/
    - tests/harness/plugin-kit.ts
    - tests/integration/t188-plugin-compose.test.ts
    - dist/
    - .github/
    - package.json
    - tsconfig.json
    - tsconfig.tests.json
    - tsconfig.adapters.json
    - biome.json
    - knip.json
    - .gitleaks.toml
    - .markdownlint-cli2.yaml
    - zensical.toml
    - pyproject.toml
    - uv.lock
    - AGENTS.md
    - CHANGELOG.md
    - README.md
```
