# grilling — AIDLC プラグイン

[English](README.md) | 日本語

[AI-DLC v2](https://github.com/awslabs/aidlc-workflows) に **Grill me** を足すプラグインです。各ステージの確認質問に4つ目の回答モードを追加します。まとめて答える（Guide me）、ファイルに書く（I'll edit the file）、自由に話す（Chat）に加えて、オーケストレーターが**1問ずつ**、推奨回答とその理由を添えて質問し、回答から派生する分岐をすべて掘り下げて、双方の理解が一致するまで続けます。contributions のみのプラグインで、新しいステージ・エージェント・スコープ・センサー・ツールは持ちません。core は一切変更しないので、無効化すれば素のワークフローに戻ります。

手順は `/grilling` スキルのものをステージ本文にインライン化しています。そのスキルが入っていない環境でも、全ハーネスで動きます。

## 追加するもの

| 部品 | ファイル | 役割 |
|---|---|---|
| contribution 28 本 | `contributions/<phase>/<slug>.md` | `<slug>-questions.md` を持つコアステージ1つにつき1本。同じ prose フラグメントを質問ステップの隣に差し込む。下のテンプレートから生成し、手では編集しない |
| フラグメントの原本 | `tests/fragment-template.md` | フラグメント本文の唯一の原本。4つ目の選択肢（label・description・描画規則）と **Step 3d** の手順 |
| 生成器 | `scripts/sync-contributions.ts` | テンプレートとアンカー表から28本を生成する。`--check` は差分があれば非ゼロで終了し、ファイル名を出す |
| テスト | `tests/plugin.test.ts` | バリデータ、ターゲット集合、テンプレート一致、アンカー解決、7ハーネスの投影、Claude と Kiro の install への compose（位置・drop ゼロ・冪等性）、同梱の compose ゲート |

## モードの動き

ステージが回答モードの選択（stage-protocol §3 Step 2）を出すとき、フラグメントはプロトコルの3択の後ろに4つ目を足します。

- **Grill me** — Interview me one question at a time with a recommended answer; drill into every branch until we share the same understanding

表示は各ハーネスの question-rendering annex の担当で、フラグメントは選択肢を足すだけです。結果として Claude Code では4つのラベルが `AskUserQuestion` にちょうど収まり、組み込みの Other が逃げ道になります。番号付きプローズのハーネス（Kiro CLI、Kiro IDE、Cursor、opencode、Copilot、Codex のフォールバック）では annex の番号付け invariant により、Grill me の次の `5` 行目に Other が来ます。

選ばれると **Step 3d** が走ります。Guide me のバッチサイズ1版に、毎問の推奨回答と依存順の深掘りを足したもので、帳簿は Guide me と同一です。

1. 質問を依存関係順に並べ、1ターン1問で出す。推奨選択肢を先頭に置き "(Recommended)" を付ける
2. 事実（既存コード、過去ステージの成果物、設定）は自分で調べ、決定だけを人間に委ねる
3. 毎問、ステージプロトコル自身の記録ペアと Question interaction log に従って記録し、回答を `[Answer]:` に書き戻して直下の行に `**Mode:** grill` を置く
4. 派生した質問は、ターンを終える前に空の `[Answer]:` 付きで質問ファイルへ追記する（forwarding-loop の Stop フックが「人待ち」と判定できるように）
5. 全問埋まったら Step 3a に合流する。consolidated summary → `aidlc-review-brief.ts summary` → Looks correct / Request changes

途中のモード切替、Depth 別の質問数、常に許可されるフォローアップは既存どおりです。

## インストール

このディレクトリで、対象ハーネスの投影をビルドします（ツールチェーンは隣の `aidlc-workflows` checkout から借ります）。

```bash
bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts .
bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . claude     # → dist/claude/ 。ハーネスごとに繰り返す
```

| ハーネス | インストール |
|---|---|
| Claude Code | `/plugin marketplace add <repo>/grilling/dist/claude` → `/plugin install aidlc-grilling@aidlc-plugins`。次のセッション開始時に SessionStart フックが compose する |
| Codex CLI | `codex plugin marketplace add <repo>/grilling/dist/codex` → `codex plugin add aidlc-grilling@aidlc-plugins`（初回のみフックの信頼承認。フックは最初の対話で compose する） |
| Kiro CLI | `dist/kiro/.` をプロジェクトへフォルダドロップし、`AIDLC_PLUGIN_ROOT=<…>/dist/kiro AIDLC_PROJECT_DIR=<project> AIDLC_HARNESS_DIR=.kiro aidlc plugin sync`（`aidlc` が PATH に無ければ `bun <…>/dist/kiro/hooks/compose.ts`） |
| Kiro IDE / Cursor / opencode / Copilot | フォルダドロップ（ストアがあるホストはストア経由）→ SessionStart フックが compose する。無ければ `/aidlc plugin sync` |

contribution は**有効なプラグイン**にしかマージされません。`/aidlc plugin list` で確認し、選択が絞られている環境では `/aidlc plugin select aidlc,grilling` で足してください（`plugins` キーが無ければ全プラグイン有効）。マージ状態は `/aidlc --doctor` の **Composed plugin surface** に出ます。

### アップグレード

エンジンの再インストールやアップグレードは、compose 済みのステージ本文を素のものに上書きするため、差し込んだフラグメントが消えます。その後に `/aidlc plugin sync` を実行してください（compose フックを持つハーネスなら新しいセッションを開くだけでも可）。compose は冪等で、再実行してもフラグメントが二重になることはありません。

### ライブ確認

ワークフローを開始して `intent-capture` まで進めます。回答モードの質問に4択と Other が出ること、**Grill me** を選ぶと推奨回答付きで1問ずつ出ること、毎問の後に質問ファイルと audit shard が更新されること、最後に consolidated summary の確認が出ることを見ます。番号付きプローズのハーネスでは Other が `5` 行目であることも確認します。

Claude Code ではこの確認を自動化しています。`bun run test:live` が Claude Agent SDK 経由で本物のセッションを走らせ、`AskUserQuestion` 呼び出しそのものを検証します（`tests/README.md` 参照）。実施記録はリポジトリの `docs/` にあります。

## アンカー

各 contribution は、質問を生成するステップの直後、または回答を集めるステップの直前にフラグメントを差し込みます。`after-questions` は compose が未実装なので使いません。表の正本は `scripts/sync-contributions.ts` の `TARGETS` 定数で、テストが各アンカーの `### Step N` 見出しが core に実在することを検証します。

| フェーズ | ステージ | アンカー |
|---|---|---|
| ideation | approval-handoff, feasibility, intent-capture, market-research, rough-mockups, scope-definition, team-formation | `after-step:2` |
| inception | delivery-planning, refined-mockups | `after-step:2` |
| inception | contract-design, domain-design, units-generation | `before-step:3` |
| inception | practices-discovery | `after-step:4` |
| inception | requirements-analysis | `after-step:6` |
| inception | user-stories | `before-step:5` |
| construction | ci-pipeline | `after-step:2` |
| construction | code-generation | `after-step:3`（質問ファイルは Step 3 の Plan Approval で作られる） |
| construction | functional-design, infrastructure-design, nfr-design | `before-step:3` |
| construction | nfr-requirements | `before-step:4` |
| operation | deployment-execution, deployment-pipeline, environment-provisioning, feedback-optimization, incident-response, observability-setup, performance-validation | `after-step:2` |

28本すべて `order: 100` です。`(plugin, anchor, order)` はターゲットごとに一意なので衝突しません。

## 開発

```bash
bun install                                   # dev 依存のみ（bun の型、tsc）
bun test                                      # content + projection + compose の各スイート
bunx tsc --noEmit
bun scripts/sync-contributions.ts             # テンプレート編集後に28本を再生成
bun scripts/sync-contributions.ts --check     # drift ガード（テストからも実行される）
bun ../aidlc-workflows/core/tools/aidlc-plugin-test.ts . --install ../grilling-sandbox --harness claude
bun run test:live                             # opt-in: Agent SDK 経由で本物の Claude セッションを走らせる（tests/README.md 参照）
```

compose ゲートのコマンドには compose 先となる使い捨ての AI-DLC install が必要です。checkout 同梱の配布物から作ります（gitignore 済み）。

```bash
mkdir -p ../grilling-sandbox && cp -R ../aidlc-workflows/dist/claude/. ../grilling-sandbox/
```

フラグメントを直すときは `tests/fragment-template.md` を編集して生成器を回してください。contribution を直接編集しても次の sync で戻され、drift テストが落ちます。

## 構成

```
grilling/
├── .aidlc-plugin/plugin.json          # manifest: contributes.overlays のみ
├── contributions/<phase>/<slug>.md    # 生成された contribution 28 本
├── scripts/sync-contributions.ts      # 生成器 + アンカー表 + --check
└── tests/
    ├── fragment-template.md           # 手で編集する唯一のフラグメント本文
    ├── plugin.test.ts                 # content・projection・compose・同梱ゲート
    ├── live-claude.test.ts            # opt-in: Agent SDK 経由のライブ Claude 実行
    └── harness/sdk-drive.ts           # aidlc-workflows からコピーした SDK ドライバ（改変 3 点）
```

## 制約

- プロンプトレベルの追加です。ステージプロトコル本文は3択のままで、フラグメントは Grill me を「それに加えて」出すよう指示しています
- フラグメントが決めるのは選択肢とインタビューの手順だけです。質問の表示方法と記録方法は本体のプロトコルと各ハーネスの annex の管轄で、フラグメントはコマンドや行番号を書き直さず、それらを参照します
- Claude Code の `AskUserQuestion` は選択肢4つまでなので、Grill me で枠が埋まります。同じ方法で5つ目のモードは足せません
- Grill me は Chat の置き換えではありません。質問ファイル駆動で毎問の帳簿を取る点が Chat と違います
- `**Mode:** grill` は記録上の印で、`Mode` の値を検証するコアツールはありません
