# Business Overview — aidlc-workflows

> 対象リポジトリ: `aidlc-workflows`（git submodule、`v2.7.0-1-ga277af21` = `a277af218f0df7f325d3b8be7b6d90fce2c5bd40`）。本書は 2026-09-04 の FOCUSED スキャン（プラグイン機構に束縛した初回スキャン、`kind: partial`）を architect が合成したもの。深読み範囲と流し読み範囲は `reverse-engineering-timestamp.md` の `## Scope of Analysis` を正とする。プラグイン機構以外の記述は流し読み（`docs/`、`README.md`、`core/` の一覧）に基づく概観であり、深読みの主張ではない。

## Business Domain

AI-DLC（AI-Driven Development Life Cycle）は、AI コーディングエージェント（Claude Code、Codex CLI、GitHub Copilot、Cursor、Kiro CLI、Kiro IDE、opencode）の上で動く、承認ゲート付きのソフトウェア開発ライフサイクル・フレームワークである。提供元は awslabs（`package.json:15-18`、ライセンス MIT-0）。人間が「何を作るか」を述べると、フレームワークがスコープを判定し、フェーズ（initialization / ideation / inception / construction / operation）とステージを順に走らせ、各ステージの成果物を人間の承認に通す。決定・状態・監査ログはすべてワークスペース配下の Markdown / JSON として残る。

リポジトリは「一つのハーネス中立コア、N 個のハーネス配布」という構造を採る（`scripts/package.ts:2-36`）。開発者はこの dev リポジトリ（`aidlc-workflows-dev`、npm 非公開）を編集し、`dist/<harness>/` に生成された配布ツリーをユーザーが自分のプロジェクトへコピーして使う（`package.json:12`）。

## Purpose

- **AI エージェントに規律を与える**: ステージ定義（`core/aidlc-common/stages/`、33 本 = initialization 3 / ideation 7 / inception 9 / construction 7 / operation 7）と stage-protocol（`core/aidlc-common/protocols/stage-protocol.md`、流し読み）に従わせ、質問→承認→成果物の順序を機械（tools / hooks / sensors）で強制する。
- **ハーネス非依存で同じ方法論を配る**: `core/` の Markdown と TypeScript を 7 ハーネスに射影する packager（`scripts/package.ts`）と、ハーネスごとの manifest（`harness/*/manifest.ts`）で差分だけを記述する。
- **拡張を安全にする**: 本 intent に直接関係する **プラグイン機構**。第三者がコアを編集せずにステージ・エージェント・スコープ・センサー・知識を追加し、既存ステージへ「追加のみ」の貢献（contribution）を差し込める（`docs/reference/18-plugin-mechanism.md:18-26`）。

## Key Functionality

| 機能領域 | 実体（深読み／流し読み） | 概要 |
|---|---|---|
| ワークフローエンジン | `core/tools/` 51 本（`aidlc-orchestrate.ts`、`aidlc-state.ts`、`aidlc-lib.ts` 等は流し読み） | ステージ遷移、状態ファイル、監査ログ、ジャンプ、swarm |
| ステージグラフ | `core/tools/aidlc-graph.ts`（深読み） | YAML frontmatter から `stage-graph.json` / `scope-grid.json` をコンパイルし、doctor と実行時解決に 8 関数 API を提供（`aidlc-graph.ts:1-25`） |
| ランナー生成 | `core/tools/aidlc-runner-gen.ts`（深読み） | コンパイル済みグラフとスコープファイルから `/aidlc-<stage>` / スコープランナーの `SKILL.md` を生成（`aidlc-runner-gen.ts:1-28`） |
| 配布パッケージング | `scripts/package.ts`、`harness/*/manifest.ts`、`harness/{codex,copilot,opencode}/emit.ts`（深読み） | `core/` + `harness/<name>/` → `dist/<name>/`、`--check` でバイト差分ガード |
| バイナリ | `scripts/build-binaries.ts`（深読み） | `dist/claude/.claude/tools/aidlc.ts` を `bun build --compile`（`build-binaries.ts:1731`）し、30 種超のスモークゲートで検証 |
| プラグイン機構 | `core/tools/aidlc-plugin-{create,validate,build,emit,test}.ts`、`scripts/plugin-hooks-template/`、`plugins/test-pro/`（深読み） | 下記 |
| フック | `core/hooks/` 18 本、`harness/*/hooks/*-adapter.ts`（adapter は深読み、core hooks は一覧のみ） | SessionStart / PreToolUse / PostToolUse / Stop をハーネス固有イベントへ橋渡し |
| センサー | `core/sensors/` 6 本、`core/tools/aidlc-sensor*.ts`（一覧のみ） | 成果物の決定的検査 |
| ドキュメント | `docs/{guide,harness-engineering,reference,rfcs}`（プラグイン 2 章のみ深読み） | zensical でビルド |

## Plugin Mechanism — 本 intent に関わる要点

本 intent（`260904-plugin-plan`、scope `plugin-dev`）は、ワークスペース直下 `grilling/` にある contributions のみのプラグイン（manifest `name: "grilling"`、`aidlc.contributes` は `overlays: "contributions/"` のみ、contribution 28 本）の計画 `docs/plugin-plan.md` を仕上げることである。エンジン側で計画に効く事実は次のとおり（根拠は `architecture.md` / `api-documentation.md` / `code-quality-assessment.md` に集約）。

1. **プラグインは「ホストプラグイン」として配布され、インストール時に合成される**。packager もしくは `aidlc-plugin-build.ts` が `dist/plugins/<name>/<harness>/` を射影し、ホストの SessionStart フックが `hooks/compose.ts` を走らせてコアのステージ本文に貢献をマージし、グラフを再コンパイルする（`docs/reference/18-plugin-mechanism.md:144-172`）。
2. **貢献は追加のみ**。構造的フィールド（`produces` / `sensors` / `consumes` / `scopes` / `required_sections`）は集合和、prose fragment は anchor 位置に sentinel 付きでスプライスされる（`scripts/plugin-hooks-template/compose.ts:2153`、`1743-1744`）。
3. **contributions のみのプラグインは validate では薄くしか検査されず**（`core/tools/aidlc-plugin-validate.ts:751-795`）、anchor の妥当性や fragment の対応は compose 実行時の drop としてしか表面化しない。したがって CI には compose 層のテスト（`aidlc-plugin-test.ts --install` または実 `hooks/compose.ts` の実行）が必須である。
4. **選択（selection）と doctor の検出はステージ／スコープ所有を前提とする**（`docs/reference/18-plugin-mechanism.md:229-233`、`core/tools/aidlc-utility.ts:532-545` は流し読み）。ステージもスコープも持たないプラグインは、選択キーが書かれた環境で名前指定できない可能性がある（未検証、`code-quality-assessment.md` 参照）。

## Stakeholders and Users

- **フレームワーク利用者**: `dist/<harness>/` をコピーして `/aidlc` を走らせる開発チーム。
- **プラグイン作者**: `aidlc-plugin-create.ts` → `validate` → `build` → `test` のオフライン工程で自分のリポジトリからプラグインを配布する（`docs/harness-engineering/10-authoring-a-plugin.md:426-545`）。本 intent の `grilling` はこの立場。
- **ハーネス移植者**: `harness/<name>/manifest.ts`（と必要なら `emit.ts`）を足すことで新ハーネスに配布する（`scripts/manifest-types.ts:150-171` の `plugin?` 既定により、新ハーネスも自動的にプラグイン射影を得る）。
- **フレームワーク保守者**: `core/`、`scripts/`、`tests/`（約 690 ファイル）、CI（`.github/workflows/ci.yml`）を維持する。

## Cross-references

- システム構成と相互作用図: `architecture.md`
- ディレクトリと分類: `code-structure.md`
- 契約（manifest、contribution、CLI、hook）: `api-documentation.md`
- コンポーネント一覧: `component-inventory.md`
- 技術スタック／依存: `technology-stack.md`、`dependencies.md`
- 品質と技術的負債: `code-quality-assessment.md`
- スキャン範囲: `reverse-engineering-timestamp.md`
