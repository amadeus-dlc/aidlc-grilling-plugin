# grilling — AIDLC プラグイン

[English](README.md) | 日本語

[AI-DLC v2](https://github.com/awslabs/aidlc-workflows) に **Grill me** を足すプラグインです。各ステージの確認質問に 4 つ目の回答モードを追加します。まとめて答える（Guide me）、ファイルに書く（I'll edit the file）、自由に話す（Chat）に加えて、オーケストレーターが**互いに独立な質問をラウンドでまとめて**出し、毎問に推奨回答とその理由を添え、小さな決定は「決めた前提」として記録しながら自分で決め、回答から派生する分岐をすべて掘り下げて、双方の理解が一致するまで続けます。contributions のみのプラグインで、新しいステージ・エージェント・スコープ・センサー・ツールは持ちません。core は一切変更しないので、無効化すれば素のワークフローに戻ります。

手順は Matt Pocock の [`grilling`](https://github.com/mattpocock/skills) スキルの現行版（ラウンド方式）をステージ本文にインライン化したものです。そのスキルが入っていない環境でも全ハーネスで動き、AI-DLC の質問ファイル・監査記録・Depth 設定に載せてあります。

## 追加するもの

| 部品 | ファイル | 役割 |
|---|---|---|
| contribution 28 本 | `contributions/<phase>/<slug>.md` | `<slug>-questions.md` を持つコアステージ 1 つにつき 1 本。同じ prose フラグメントを質問ステップの隣に差し込む。下のテンプレートから生成し、手では編集しない |
| フラグメントの原本 | `tests/fragment-template.md` | フラグメント本文の唯一の原本。4 つ目の選択肢（label・description）と **Step 3d** の面接手順——ラウンド、決定の大きさの段階と Depth の対応表、決めた前提、帳簿、描画、事実の調査、終了、1 問ずつへの切り替え |
| 生成器 | `scripts/sync-contributions.ts` | テンプレートとアンカー表から 28 本を生成する。`--check` は差分があれば非ゼロで終了し、ファイル名を出す |
| インストーラ | `scripts/install.ts` | AI-DLC プロジェクトへの 1 コマンド導入。タグ・ブランチ・ローカル checkout からソースを取得し、ハーネス投影をビルドして compose し、来歴を記録する。[インストール](#インストール)を参照 |
| リリースツール | `scripts/release.ts` | `release.ts <version>` は事前検査のあと manifest を更新し、コミット・タグ・atomic push まで行う。`--check-tag <tag>` はタグ push 時の CI ガード。[リリース](#リリース)を参照 |
| テスト | `tests/plugin.test.ts`、`tests/installer.test.ts`、`tests/release.test.ts`、`tests/live-claude.test.ts`（opt-in）、`tests/select-plugins.test.ts`（opt-in） | 内容、投影、compose、同梱ゲート、インストーラの end-to-end、リリースの事前検査と変更順序、Claude Code のライブ実行、選択キー環境の確認。[tests/README.ja.md](tests/README.ja.md) を参照 |
| 決定記録 | `docs/decisions.ja.md` | プラグインがこの形になった理由と、選択キー環境の実測結果 |

## モードの動き

ステージが回答モードの選択（stage-protocol §3 Step 2）を出すとき、フラグメントはプロトコルの 3 択の後ろに 4 つ目を足します。

- **Grill me** — Interview me in rounds of independent questions, each with a recommended answer; drill into every branch until we share the same understanding

表示は各ハーネスの question-rendering annex の担当で、フラグメントは選択肢を足すだけです。結果として Claude Code では 4 つのラベルが `AskUserQuestion` にちょうど収まり、組み込みの Other が逃げ道になります。番号付きプローズのハーネス（Kiro CLI、Kiro IDE、Cursor、opencode、Copilot、Codex のフォールバック）では annex の番号付け invariant により、Grill me の次の `5` 行目に Other が来ます。

選ばれると **Step 3d** が走ります。Guide me を「決定の木の上の面接」として走らせるもので、プロトコルが Guide me に定めること——annex どおりの構造化質問の描画、画面ごとの §3 の decision / answer の記録ペア、正本としての質問ファイル——はそのまま適用されます。違うのは次の点です。

1. **決定の木とフロンティア。** ステージが下書きした質問を決定の木に写し、各決定に前提と大きさ（下記）を付けます。答えから見えてきた決定は面接の途中で木に足します。フロンティアは「前提がすべて決まった決定」の集合で、各**ラウンド**はフロンティア全体を聞きます。同じラウンドの質問は互いに独立でなければならず、まだ答えの出ていない質問に依存する質問は次以降のラウンドに回します。答えを受けるたびに木を更新し、フロンティアを計算し直します。質問数に上限はなく、決定の大きさが面接を絞ります。
2. **決定の大きさと Depth。** 各決定を 2 つの問いかけ——*影響の広がり*（あとで変えると他に何が変わるか）と*戻しやすさ*（戻すのにどれだけかかるか）——で 5 段階に分けます。各段階はフラグメントの中で判定の問いかけ・例・反例つきで定義されています。**XL** は解の形を変える、**L** は構成要素の責務や構成要素間の契約を変える、**M** は 1 つの構成要素の中で利用者に見える挙動、**S** は既定値や名前のような局所の選択、**SS** は利用者に見えない選択。2 段階にまたがるときは大きい方。`aidlc-state.md` の `**Depth**` が人に聞く最小の段階を決めます。

   | Depth | 人に聞く | エージェントが決めて「決めた前提」に書く |
   |---|---|---|
   | Minimal | XL、L | M、S、SS |
   | Standard | XL、L、M | S、SS |
   | Comprehensive | XL、L、M、S | SS |

3. **決めた前提。** 閾値未満の決定は、エージェントが推奨したであろう答えで決め、黙らずに書きます。質問ファイルのそのラウンドの質問の直後に、会話言語の見出し（英語なら `### Decided assumptions (round <n>)`）を置き、1 件 1 行で `- [<段階>] <決定> — <理由>` と書きます。
4. **帳簿。** ラウンドは画面に出す前に質問ファイルへ追記します。ラウンドの見出し、各質問（ファイル全体で通しの番号、題、文脈 1 行、選択肢——最後は `X. Other (please specify)`——推奨とその理由、空の `[Answer]:`）。答えは受け取り次第、次の画面を出す前に書き戻します。`[Answer]:` に選択肢の文字（Other なら本文）を書き、直下の独立行に `**Mode:** grill` を置きます。画面ごとに §3 の decision / answer ペアを新しいタイムスタンプで記録します。
5. **描画。** Claude Code では推奨選択肢を先頭に置いて " (Recommended)" を付けます。並べ替えは画面だけで、ファイルの選択肢の並びと文字は変えません。1 画面は 4 問までなので、5 問以上のラウンドは 4 問ずつ画面を分け、画面ごとに書き戻して記録してから次を出します。同じラウンドの画面の間ではフロンティアを計算し直しません。質問を番号付きプローズで描画するハーネスでは、ラウンド全体を取り込み元の書式——`❓ **Q<n>** - **<題>**: <本文と選択肢>` / `➡️ <推奨回答と理由>`、質問の間は `---`——で 1 メッセージに出し、選択肢の並びは変えません。人は `1 A, 2 B` のように番号で答えます。
6. **事実は聞かずに調べる。** ファイルの中身、設定、前のステージの成果物、参照実装は、サブエージェントを呼べるハーネスではサブエージェントに、呼べなければオーケストレーター自身が調べます。調査中はその結果に依存する決定だけを待たせ、残りのフロンティアは先に聞きます。調査待ちの質問は空の `[Answer]:` と直下の `**Pending:** <調べていること>` を付けてすぐに追記し、結果で決まった場合は `[Answer]:` に `Resolved by lookup (round <n>)` と書いてそのラウンドの決めた前提に移します。
7. **終了は共有理解の確認から。** フロンティアが空になったら面接は終わり、ステージは Step 3a に合流します。consolidated summary が回答の全件と、その後に決めた前提の全件（ラウンド順）を並べ——これが一括確認です——review brief と Looks correct / Request changes の確認が続きます。確認前に成果物は生成しません。Request changes で決めた前提に異議が出れば次のラウンドの質問に格上げし、回答済みの質問への異議はその枝を開き直します。ラウンドを続け、フロンティアが再び空になったら summary を出し直します。人が「もう十分」と言ったときだけ早く終え、残りの決定を段階つきの決めた前提として記録します。
8. **1 問ずつ。** `aidlc/spaces/<active-space>/memory/project.md` の `## Corrections` に「Grill me は 1 問ずつ聞く」旨の行があれば（言語を問わず趣旨で判断）、または面接中に人がそう頼めば、各画面を 1 問にします。フロンティア・帳簿・決めた前提は変わりません。会話中の依頼はそのステージの残りに効き、永続化は §13 の学びの儀式に任せます。

途中のモード切替と、常に許可されるフォローアップは既存どおりです。

## インストール

推奨はインストーラです。タグ付きリリースを取得し、ハーネスの投影をビルドして compose し、来歴を記録します。

```sh
VERSION=v0.2.0
curl -fsSL "https://raw.githubusercontent.com/amadeus-dlc/aidlc-grilling-plugin/${VERSION}/grilling/scripts/install.ts" |
  bun - --project <your-aidlc-project> --tag "${VERSION}"   # --harness codex, kiro, …（既定: claude）
```

`--from <repo-root>` はローカルの checkout（`grilling/` を含むリポジトリのルート）からビルドし、`--ref <branch>` はブランチを追従し、指定なしは最新の安定タグを解決し、`--update` は記録済みの取得元を再利用し、`--dry-run` はプロジェクトに書かずに compose をリハーサルします。オプション表と来歴の記録（`<harness>/tools/data/grilling-install.json`）は[ルート README](../README.ja.md) にあります。ストアを持つハーネス（Claude Code、Codex、Copilot、opencode）はビルドした `dist/` から直接 compose し、ストアを持たないハーネス（Kiro、Kiro IDE、Cursor）は投影を先にプロジェクトへフォルダドロップします。この経路には信頼ゲートがありません。コードを実行してよいと判断したビルドにだけ向けてください。

ホストのプラグインストア経由で導入する場合は、このディレクトリで対象ハーネスの投影をビルドします（ツールチェーンは隣の `aidlc-workflows` checkout から借ります）。

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

contribution は**有効なプラグイン**にしかマージされません。`/aidlc plugin list` で確認し、選択が絞られている環境では `/aidlc plugin select aidlc,grilling` で足してください（`plugins` キーが無ければ全プラグイン有効。選択キーがある環境での実測は [docs/decisions.ja.md](docs/decisions.ja.md) にあります）。マージ状態は `/aidlc --doctor` の **Composed plugin surface** に出ます。

### アップグレード

エンジンの再インストールやアップグレードは、compose 済みのステージ本文を素のものに上書きするため、差し込んだフラグメントが消えます。その後に `/aidlc plugin sync` を実行してください（compose フックを持つハーネスなら新しいセッションを開くだけでも可）。インストーラの `--update` はこれを代行しません。来歴のダイジェストは投影のペイロードファイルと contribution を含みますが、エンジンの更新はそのどちらも変えないため、取得元が同じなら `Changed 0` で終わります。取得元の断片が変わればダイジェストも変わり、次のインストーラ実行で合成し直します。compose は冪等で、再実行してもフラグメントが二重になることはありません。

### ライブ確認

ワークフローを開始して `intent-capture` まで進めます。回答モードの質問に 4 択と Other が出ることを見ます。**Grill me** を選ぶと、最初の画面に互いに独立な質問が 2〜4 問並び、各質問の先頭が推奨選択肢で `(Recommended)` が付くこと、質問ファイルにラウンドの見出しと質問、そして Depth の閾値でエージェントに任された決定があれば決めた前提の節が追記されること、毎問の答えが `**Mode:** grill` 付きで書き戻され audit shard に画面ごとの記録が残ること、最後の consolidated summary が Looks correct / Request changes の前に回答と決めた前提を並べることを確認します。番号付きプローズのハーネスでは、Other が `5` 行目であることと、ラウンドが ❓ / ➡️ の 1 メッセージで届くことも確認します。

Claude Code ではこの確認を自動化しています。`bun run test:live` が Claude Agent SDK 経由で本物のセッションを走らせ、`AskUserQuestion` 呼び出しそのものを検証します（[tests/README.ja.md](tests/README.ja.md) 参照）。実施記録はリポジトリの `docs/` に `live-check-<日付>.md` として置きます。

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

28 本すべて `order: 100` です。`(plugin, anchor, order)` はターゲットごとに一意なので衝突しません。

## 開発

```bash
bun install                                   # dev 依存のみ（bun の型、tsc、Agent SDK）
bunx tsc --noEmit
bun scripts/sync-contributions.ts             # テンプレート編集後に 28 本を再生成
bun scripts/sync-contributions.ts --check     # drift ガード（CI とテストからも実行される）
bun test                                      # content + projection + compose + installer + release の各スイート
bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts .
bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . claude   # ハーネスごとに繰り返す。CI は 7 つすべてをビルド
bun ../aidlc-workflows/core/tools/aidlc-plugin-test.ts . --install ../grilling-sandbox --harness claude
bun scripts/install.ts --project ../grilling-sandbox --from ..     # この checkout からサンドボックスへインストーラを実行
bun run test:live                             # opt-in: Agent SDK 経由で本物の Claude セッションを走らせる（tests/README.ja.md 参照）
GRILLING_SELECT_KEY_CHECK=1 bun test tests/select-plugins.test.ts   # opt-in: plugins 選択キーを持つ install への compose
```

compose ゲートのコマンドとインストーラには compose 先となる使い捨ての AI-DLC install が必要です。checkout 同梱の配布物から作ります（gitignore 済み）。

```bash
mkdir -p ../grilling-sandbox && cp -R ../aidlc-workflows/dist/claude/. ../grilling-sandbox/
```

フラグメントを直すときは `tests/fragment-template.md` を編集して生成器を回してください。contribution を直接編集しても次の sync で戻され、drift テストが落ちます。

### リリース

```bash
bun scripts/release.ts 0.2.0                 # 事前検査 → manifest 更新 → コミット → タグ → atomic push
bun scripts/release.ts --check-tag v0.2.0    # CI がタグ push 時に実行するもの
```

`release.ts <version>` は安定 SemVer だけを受け付けます（`v` 接頭辞なし、プレリリースなし）。事前検査は `main` ブランチ、clean な作業ツリー、ローカルにも `origin` にも無い `v<version>` タグを要求し、すべて通るまで何も変更しません。通れば `.aidlc-plugin/plugin.json` に版を書き、`chore(release): publish v<version>` でコミットし、タグを打って `git push --atomic origin main v<version>` を実行します。途中で失敗したらそこで止まります。CI は `v*` タグの push ごとに `--check-tag` を実行し、タグと manifest の版が違えば失敗します。

## 構成

```
grilling/
├── .aidlc-plugin/plugin.json          # manifest: contributes.overlays のみ
├── contributions/<phase>/<slug>.md    # 生成された contribution 28 本
├── docs/decisions.md                  # 設計判断と選択キー環境の確認（+ decisions.ja.md）
├── scripts/
│   ├── sync-contributions.ts          # 生成器 + アンカー表 + --check
│   ├── install.ts                     # 1 コマンドのインストーラ
│   └── release.ts                     # 版の更新 + タグ + atomic push。CI 用の --check-tag
└── tests/
    ├── fragment-template.md           # 手で編集する唯一のフラグメント本文
    ├── plugin.test.ts                 # content・projection・compose・同梱ゲート
    ├── installer.test.ts              # 使い捨て Claude install に対する install.ts
    ├── release.test.ts                # git を注入した release.ts
    ├── live-claude.test.ts            # opt-in: Agent SDK 経由のライブ Claude 実行
    ├── select-plugins.test.ts         # opt-in: plugins 選択キー（NG1）
    └── harness/sdk-drive.ts           # aidlc-workflows からコピーした SDK ドライバ（改変点はファイル冒頭に列挙）
```

## 制約

- プロンプトレベルの追加です。ステージプロトコル本文は 3 択のままで、フラグメントは Grill me を「それに加えて」出すよう指示しています
- フラグメントが決めるのは選択肢と面接の手順だけです。質問の表示方法と記録方法は本体のプロトコルと各ハーネスの annex の管轄で、フラグメントはコマンドや行番号を書き直さず、それらを参照します
- Claude Code の `AskUserQuestion` は 1 問あたり選択肢 4 つ、1 画面あたり 4 問までです。Grill me でモードの枠が埋まり、5 問以上のラウンドは画面を分けます。同じ方法で 5 つ目のモードは足せません
- フロンティアは計算ではなく判断です。互いに依存すると後で分かる 2 問が同じラウンドに入ることはあり得ます。そのときは指摘してもらい、影響を受けた枝を次のラウンドで聞き直します
- 既定はラウンド方式です。1 問ずつは別のモードではなく切り替えです（スペースの `project.md` の `## Corrections` の 1 行、または面接中の依頼）
- Grill me は Chat の置き換えではありません。質問ファイル駆動で画面ごとの帳簿を取る点が Chat と違います
- `**Mode:** grill`、`**Pending:**`、段階タグは記録上の印で、それらを検証するコアツールはありません
- 検証はいまのところ Claude Code のみです。[docs/decisions.ja.md](docs/decisions.ja.md) の決定 5 を参照してください
