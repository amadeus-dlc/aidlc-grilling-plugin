# Technology Stack — aidlc-workflows

> 根拠は `package.json`、`tsconfig*.json`、`biome.json`、`knip.json`、`.github/workflows/ci.yml`、ルート設定ファイルの一覧。バージョンは `package.json` の宣言値（`bun.lock` の解決値は未確認）。

## Languages

| 言語 | 用途 | 根拠 |
|---|---|---|
| TypeScript（ESNext、`moduleResolution: bundler`、`strict`、`noEmit`、`allowImportingTsExtensions`） | すべての tools / hooks / scripts / adapters / tests。`.ts` を bun が直接実行 | `tsconfig.json` |
| Markdown（YAML frontmatter 付き） | ステージ、スコープ、センサー、エージェント、知識、スキル、contribution、文書 | `core/aidlc-common/stages/`、`plugins/test-pro/` |
| JSON | manifest（`plugin.json`、`harness.json`、`plugin-targets.json`、`stage-graph.json`）、ホスト hook 配線 | `tools/data/` |
| TOML | Codex の `config.toml` / `trust-seed.toml`（`smol-toml` で生成）、`zensical.toml`、`.gitleaks.toml`、`pyproject.toml` | `harness/codex/emit.ts:21` |
| Shell（`sh -c` 一行） | store 系ハーネスの SessionStart 配線のみ | `aidlc-plugin-emit.ts:337-351` |
| Python（uv） | 文書ビルド（zensical）のツールチェーンのみ | `pyproject.toml`、`uv.lock` |

## Runtime

| 項目 | 値 | 根拠 |
|---|---|---|
| bun | CI は `1.3.14` を固定（`oven-sh/setup-bun@…v2.2.0`）、型は `bun-types ^1.3.13` | `.github/workflows/ci.yml:44-46`、`package.json` |
| Bun API の直接利用 | `Bun.spawnSync` / `Bun.which` / `Bun.stdin`（例 `aidlc-plugin-compose.ts:14,78`）、`import.meta.main` / `import.meta.dir` | 深読みツール |
| Node 組込み | `node:fs`、`node:path`、`node:child_process`、`node:crypto`、`node:os`、`node:url` | 各ツールの import |
| 実行形態 | `bun <harness>/tools/<tool>.ts`、または `bun build --compile` した `aidlc` バイナリ（`build-binaries.ts:1731`） | — |

## Dev Dependencies（`package.json`）

| パッケージ | バージョン | 用途 |
|---|---|---|
| `typescript` | `^6.0.3` | `tsc --noEmit` を 3 プロジェクト（`tsconfig.json` / `tsconfig.tests.json` / `tsconfig.adapters.json`）で実行 |
| `@biomejs/biome` | `2.4.16` | lint（`biome check --error-on-warnings core harness scripts plugins tests`）。formatter は無効、`organizeImports` off |
| `bun-types` | `^1.3.13` | 型定義 |
| `smol-toml` | `1.7.0` | Codex `config.toml` / trust-seed 出力 |
| `@anthropic-ai/claude-agent-sdk` | `0.3.158` | ライブテストドライバ（`tests/harness/sdk-drive.ts`、一覧のみ） |
| `@xterm/headless` | `^5.5.0` | TUI ライブテスト |
| `node-pty` | `1.1.0` | TUI ライブテスト（Windows 側 backend） |

ランタイム依存（`dependencies`）は **ゼロ**。プラグイン用 5 ツールと compose テンプレートは意図的に依存ゼロで、`plugins/test-pro/tools/*.ts` も同様（`aidlc-plugin-validate.ts:2-6`、ハンドオフ）。

## Tooling not in package.json

| ツール | 設定 | 用途 |
|---|---|---|
| knip（schema `knip@6`） | `knip.json`（entry: `core/tools/*.ts`、`core/hooks/*.ts`、`harness/*/manifest.ts`、`harness/*/emit.ts`、`scripts/package.ts`、`scripts/docs-rewrite-links.ts`；`ignoreUnresolved: ["./aidlc-lib.ts"]`） | 未使用エクスポート検出（devDependencies 未記載、`bunx` 想定と推測） |
| markdownlint-cli2 | `.markdownlint-cli2.yaml`、`.github/workflows/markdownlint.yml` | Markdown lint |
| gitleaks | `.gitleaks.toml`、`.gitleaks-baseline.json`、`security-scanners.yml` | シークレット走査 |
| zensical | `zensical.toml`、`pyproject.toml`、`docs.yml` | `docs/` サイト生成 |
| GitHub Actions | `actions/checkout@…v6.0.2`、`oven-sh/setup-bun@…v2.2.0`（コミット SHA 固定） | CI |
| AWS CodeBuild | `codebuild.yml` | ジョブ名のみ確認 |

## Test Stack

- `bun:test`。`bun tests/run-tests.ts --smoke --unit --parallel 8`、`--integration --e2e --no-llm --parallel 8`（`ci.yml:69,97`）。
- ライブ層のドライバ: `sdk-drive.ts`、`tui-drive.ts`、`kiro-acp-drive.ts`、`kiro-ide-driver.ts`、`exec-drive.ts`（一覧のみ）。ゲート環境変数 `AIDLC_CLAUDE_SDK_LIVE`、`AIDLC_KIRO_ACP_LIVE`、`AIDLC_CODEX_EXEC_LIVE`、`AIDLC_COPILOT_EXEC_LIVE` 他（`10-authoring-a-plugin.md:558-561`）。
- プラグイン用ヘルパ `tests/harness/plugin-kit.ts`（`composePluginFixture`、`validatePluginContent`、`invokeHarness`、`liveGateFor`）。
- 行カバレッジの設定は **なし**（`tests/.coverage-registry.json` はテスト→対象ユニットの対応表）。

## Target Harnesses（配布先）

| ハーネス | `harnessDir` | plugin `kind` | manifestDir | 備考 |
|---|---|---|---|---|
| claude | `.claude` | store | `.claude-plugin` | `AskUserQuestion` で質問描画 |
| codex | `.codex` | store | `.codex-plugin` | skills は `.agents/skills/`、`emit.ts` あり |
| copilot | `.aidlc` | store | `.plugin` | `.github/hooks/aidlc.json`、`emit.ts` あり |
| cursor | `.cursor` | cursor | `.cursor-plugin` | `install.ts`、flat camelCase hooks |
| kiro | `.kiro` | kiro | `.kiro-plugin` | 配線なし（手動 compose） |
| kiro-ide | `.kiro` | kiro-ide | `.kiro-plugin` | v1 hook JSON 登録 |
| opencode | `.aidlc` | store | `.opencode-plugin` | plugin API adapter、`emit.ts` あり |

根拠: `dist/claude/.claude/tools/data/plugin-targets.json`、`harness/*/manifest.ts`。

## Cross-references

- 依存の方向とクロスパッケージ関係: `dependencies.md`
- CI とツールの運用状況: `code-quality-assessment.md`
