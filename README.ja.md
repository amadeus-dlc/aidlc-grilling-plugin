# aidlc-grilling-plugin

[English](README.md) | 日本語

[AI-DLC v2](https://github.com/awslabs/aidlc-workflows) に **Grill me** を足す追加合成（additive）プラグインです。各ステージの確認質問に 4 つ目の回答モードを追加します。まとめて答える（Guide me）、ファイルに書く（I'll edit the file）、自由に話す（Chat）に加えて、オーケストレーターが互いに独立な質問をラウンドでまとめて出し、毎問に推奨回答を添え、小さな決定は「決めた前提」として記録しながら自分で決め、双方の理解が一致するまで分岐を掘り下げます。core は一切変更しません。プラグインを無効化すれば素のワークフローに戻ります。手順は Matt Pocock の [`grilling` スキル](https://github.com/mattpocock/skills)を、AI-DLC の質問ファイル・監査記録・最後の確認の仕組みに載せ直したものです。

これは開発ワークスペースです。プラグイン本体は [`grilling/`](grilling/) にあります。モードの動きの詳細はその [README](grilling/README.ja.md) を参照してください。

## ハイライト

- **1 問ずつではなくラウンドで** — ステージの質問を決定の木として捉え、前提がすべて決まった決定（フロンティア）を 1 ラウンドでまとめて聞きます。まだ答えの出ていない質問に依存する質問は次のラウンドへ。答えを受けるたびに木を更新し、フロンティアを計算し直します。
- **毎問に推奨回答** — 理由 1 行つき。Claude Code では推奨を先頭に置いて `(Recommended)` を付け、番号付きプローズのハーネスでは質問の下の `➡️` 行で示します。
- **Depth は質問数ではなく「どの大きさの決定まで聞くか」** — 決定を影響の広がりと戻しやすさで XL / L / M / S / SS に分けます。Minimal は XL・L、Standard は M まで、Comprehensive は S まで人に聞き、SS は常にエージェントが決めます。
- **黙って決めない** — 閾値未満の決定は推奨回答で決めて質問ファイルに「決めた前提」として書きます。最後の consolidated summary が回答と決めた前提の全件を並べて一括で確認し、異議のあった前提は次のラウンドの質問に格上げされます。
- **事実は聞かずに調べる** — ファイルの中身・設定・前のステージの成果物は（サブエージェントを呼べるハーネスではサブエージェントが）読みます。調査中は、その結果に依存する決定だけを待たせ、残りのフロンティアは先に聞きます。
- **1 問ずつにもできる** — スペースの `project.md` の `## Corrections` に 1 行書くか、面接中に頼めば、ラウンドと帳簿はそのままに画面だけが 1 問ずつになります。
- **contributions のみ** — 28 のコアステージの質問ステップの隣に同じ断片を差し込むだけで、ステージ・エージェント・スコープ・センサー・ツールは持ちません。合成は追加のみで冪等です。

## クイックスタート

### 前提

- [bun](https://bun.sh/) — このリポジトリは `mise.toml` と CI で 1.3.13 に固定しています
- [AI-DLC v2](https://github.com/awslabs/aidlc-workflows) がインストール済みの対象プロジェクト

### AI-DLC プロジェクトへのインストール

安定版のタグを指定してインストールします。ブートストラップスクリプトとインストール対象のソースは、同じ不変のタグから取得されます。

```sh
VERSION=v0.2.0
curl -fsSL "https://raw.githubusercontent.com/amadeus-dlc/aidlc-grilling-plugin/${VERSION}/grilling/scripts/install.ts" |
  bun - --project <your-aidlc-project> --tag "${VERSION}"   # --harness codex, kiro, …（既定: claude）
```

インストーラはタグのソースをダウンロードし、`grilling/dist/<harness>/` にハーネス投影をビルドして、28 の contribution をプロジェクトのハーネスツリー（`.claude/`、`.codex/`、…）へ compose します。ストアを持つハーネス（Claude Code、Codex、Copilot、opencode）は `dist/` から直接 compose するため、投影をプロジェクトへコピーしません。ストアを持たないハーネス（Kiro、Kiro IDE、Cursor）は、各ホストの流儀に従い、先に投影をプロジェクトルートへ配置します。compose は `aidlc` CLI が PATH にあれば `aidlc plugin sync` で、無ければ投影自身の `hooks/compose.ts` で行います。`--dry-run` を付ければ、プロジェクトに触れずに compose を検証できます。対象プロジェクトの外は変更しません。プラグインを無効化すれば、素のワークフローに再 compose されます。

| オプション | 動作 |
|---|---|
| `--project <path>` | インストール先の AI-DLC プロジェクト。必須。 |
| `--harness <name>` | `claude`（既定）、`codex`、`copilot`、`opencode`、`kiro`、`kiro-ide`、`cursor` のいずれか。 |
| 指定なし | 最新の安定版 SemVer タグを解決してインストールします。 |
| `--tag v0.2.0` | 不変のリリースを 1 つ指定します。本番利用ではこの方法を推奨します。 |
| `--from <repo-root>` | ローカルのチェックアウトからビルドします。指定するのは `grilling/` を含むリポジトリのルートで、プラグインディレクトリそのものではありません。プラグインの開発時に使います。 |
| `--ref <branch>` | 移動するブランチ ref をダウンロードします。再現可能な導入ではなく、開発版を追従するときだけ使ってください。 |
| `--update` | 記録済みの取得元を再利用します。latest は最新タグを再解決し、local と ref は同じ取得元を取り直します。固定タグは不変なので `Changed 0` で終了します。取得元オプションとは併用できません。 |
| `--dry-run` | ビルドしたうえで、install の一時コピーに対して compose をリハーサルします。プロジェクトには書き込みません。 |
| `--skip-build` | `grilling/dist/<harness>/` にある既存の投影を再ビルドせずに使います（開発時のみ）。 |

インストールに成功すると、バージョン、取得元、日時、ペイロードのダイジェストが、対象プロジェクトの `<harness>/tools/data/grilling-install.json` に記録されます。`<harness>` は `.claude` や `.codex` など、選択したハーネスツリーです。ダイジェストは投影のペイロードファイルと contribution を含むので、変わっていない取得元で 2 回目を実行すると `Changed 0` で終わり、断片が変わった取得元なら合成し直します。プラグインの配布に npm パッケージや GitHub Release のアセットは使いません。タグまたはブランチのソースアーカイブを GitHub から直接取得します。

> インストーラはフォルダドロップ方式で、インストール時の信頼ゲートがありません。コードを実行してよいと判断したビルドにだけ向けてください。ストア経由の信頼プロンプトが必要なら、後述のホストプラグインフローを使ってください。

### 運用中プロジェクトへの後入れ

最初からこのプラグインを入れておく必要はありません。compose は追加合成なので、AI-DLC ワークフローが進行中のプロジェクトへ導入しても他には何も影響しません。次に確認質問を出すステージ（単一ステージ実行 `/aidlc --stage <slug> --single` を含む）から、回答モードの選択に **Grill me** が 4 択目として現れ、以後の質問ステージでも同じです。

AI-DLC エンジンを再インストール・更新したあとは、`/aidlc plugin sync` を再実行してください。更新は compose 済みのステージ本文を素のものに上書きするため、差し込んだ断片が消えます。インストーラの `--update` はこれを代行しません。来歴のダイジェストは投影のペイロードファイルと contribution を含みますが、エンジンの更新はそのどちらも変えないため、取得元が同じなら `--update` は正しく `Changed 0` で終わります。ダイジェストが変わって合成し直すのは、取得元の断片が変わったときだけです。

### 代替：ホストプラグインストア経由のインストール

まず `grilling/` から投影をビルドします：`bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . claude`（または `codex`）。

Claude Code では、対象プロジェクト内で：

```
/plugin marketplace add <workspace>/grilling/dist/claude
/plugin install aidlc-grilling@aidlc-plugins
```

Codex CLI では、対象プロジェクト内で：

```sh
codex plugin marketplace add <workspace>/grilling/dist/codex
codex plugin add aidlc-grilling@aidlc-plugins   # 初回のみフックの信頼承認
```

次のセッション開始時に、プラグインの SessionStart フックが `.claude/` へ compose します（Codex は `.codex/`、フックは最初の対話で遅延発火）。

## 開発

開発する場合は、リポジトリを clone して dev 依存を導入します：

```sh
git clone --recurse-submodules https://github.com/amadeus-dlc/aidlc-grilling-plugin.git
cd aidlc-grilling-plugin/grilling
bun install        # dev 依存のみ——どのプロジェクトにも何もインストールしません
```

変更の検証は CI と同じ手順で行います：

```sh
bunx tsc --noEmit
bun scripts/sync-contributions.ts --check                   # 28 の contribution が tests/fragment-template.md と一致する
bun test                                                    # content・projection・compose・installer・release
bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts .
bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . claude   # → dist/claude/ 。CI は 7 ハーネスすべてをビルド
bun ../aidlc-workflows/core/tools/aidlc-plugin-test.ts . --install ../grilling-sandbox --harness claude
                                # compose のドライラン——対象を変更せずにマージを検証
bun run test:live               # opt-in: Agent SDK 経由で本物の Claude Code セッションを走らせる
```

リリースは `bun scripts/release.ts <version>` で行います。事前検査と CI のタグ検査はプラグイン README を参照してください。

## リポジトリ構成

| パス | 役割 |
|---|---|
| [`grilling/`](grilling/) | プラグインの authored source：manifest、contribution、断片テンプレート、インストーラとリリースのスクリプト、テスト、決定記録 |
| [`aidlc-workflows/`](https://github.com/awslabs/aidlc-workflows) | フレームワーク checkout（submodule、タグに固定）——validate/build/compose ツールチェーンと、テストが compose 先に使うハーネスごとの `dist/` の供給元。ここでは編集しない |
| `grilling-sandbox/` | compose テストとライブ確認の対象に使う使い捨て AI-DLC インストール（`aidlc-plugin-test.ts --install`）——gitignored |
| [`docs/`](docs/) | 計画書（完了記録つき）とライブ確認の記録 |
| `aidlc/`、`.claude/`、`.codex/` | このリポジトリ自身が AI-DLC でプラグインを開発するための、ワークフローの記録とメモリ、ハーネスのシェル |

## ドキュメント

- プラグインの設計——モードの動き、インストール、アンカー、制約：[grilling/README.ja.md](grilling/README.ja.md)
- 設計判断と選択キー環境の確認：[grilling/docs/decisions.ja.md](grilling/docs/decisions.ja.md)
- 計画書と完了記録：[docs/plugin-plan.md](docs/plugin-plan.md)
- ライブ確認の記録：[docs/live-check-2026-09-03.md](docs/live-check-2026-09-03.md)。以後の実施分は `docs/live-check-<日付>.md` として追加
- テストスイート：[grilling/tests/README.ja.md](grilling/tests/README.ja.md)

## ヘルプ

- Issues: <https://github.com/amadeus-dlc/aidlc-grilling-plugin/issues>

## ライセンス

MIT。[LICENSE](LICENSE) を参照してください。
