# grilling — 設計判断記録

[English](decisions.md) | 日本語

プラグインの形を決めた判断の記録。最初のリリース（0.1.0、2026-09-03）から計画の完了（0.2.0、2026-09-04）まで。各項目は背景・決定・帰結の 3 つで書く。計画書と完了記録は [`docs/plugin-plan.md`](../../docs/plugin-plan.md)、0.2.0 を作った AI-DLC ワークフローの要求・設計・質問の記録はこのリポジトリの `aidlc/spaces/default/intents/260904-plugin-plan/` 配下にある。

## 1. contributions のみ——ステージ・エージェント・スコープ・センサー・ツール・knowledge を持たない

- **背景** — 回答モードの選択は `core/aidlc-common/protocols/stage-protocol.md` §3 Step 2 で定義されているが、プラグインはプロトコルを差し込み対象にできない。contribution の target はコアステージのスラッグに限られる。ステージがモード選択の質問を組み立てるとき、オーケストレーターはプロトコルとステージ本文の両方を読むので、質問ステップの隣に差し込んだ断片は正しいタイミングで読まれる。フレームワークはプラグインにステージ・エージェント・スコープ・センサー・ツール・knowledge ファイルを持たせることもできる。
- **決定** — プラグインは `contributions/` だけを持つ（manifest は `contributes.overlays`）。`<slug>-questions.md` を持つコアステージ 1 つにつき 1 本、計 28 本で、いずれも同じ断片——4 つ目の選択肢と Step 3d の手順——を差し込む。core は変更せず、`/grilling` スキルにも依存しない。エミッタは `skills/` を投影しないし、他の人の環境にそのスキルは無いからである。モードに必要なことはすべて断片の中に書く。0.2.0 で増えたラウンドの規則・決定の大きさの段階・Depth の対応表も、manifest に宣言が要る `knowledge/` ファイルではなく断片に置いた。
- **帰結** — プラグインを無効化すれば素の 3 択のワークフローに戻る。更新時に置き直すものはマージそのもの以外に無く、インストーラの upgrade refresh と tombstone の一覧は何もしない。断片は長く（0.2.0 で 139 行。テストが 150 行を上限に検査する）、同じ本文が 28 ステージすべてに入る。ステージプロトコル本文は 3 択のままなので、断片は Grill me を「それに加えて」出すと書いている。Claude Code の `AskUserQuestion` は選択肢 4 つまでなので Grill me で枠が埋まり、同じ方法で 5 つ目のモードは足せない。

## 2. プラグイン名は `grill-me` ではなく `grilling`

- **背景** — 計画書はプラグイン名を `grill-me`、配置をフレームワーク checkout 内の `plugins/grill-me/` としていた。実際には、インライン化する元の `grilling` スキルの名で、独立したリポジトリに作った。フレームワークの規則では manifest の name は小文字ケバブで `aidlc-` 接頭辞を付けず、ホスト側のパッケージ ID は `aidlc-<name>` になる。
- **決定** — 名前は `grilling`、配置はリポジトリ直下の `grilling/`（`aidlc-workflows` submodule の隣。deep-spec-analysis と同じ構成）。ホスト側パッケージは marketplace `aidlc-plugins` の `aidlc-grilling`、断片の見出しは "Grill me (grilling)"、provenance ファイルは `grilling-install.json`、選択肢のラベルは `Grill me` のまま。実装を計画に合わせて改名するのではなく、計画書を実装に合わせて更新した。
- **帰結** — 選択コマンドは `/aidlc plugin select aidlc,grilling`、compose の sentinel は `<!-- plugin:grilling:… -->` になる。インストーラの `--from` はリポジトリのルートを受け取り、その下の `grilling/.aidlc-plugin/plugin.json` を探すので、ローカルの checkout と GitHub のソースアーカイブが同じ形になる。

## 3. アンカーはステージごとの `after-step:N` / `before-step:N`。`after-questions` は使わない

- **背景** — compose が実装しているアンカーは `after-step:<n>`、`before-step:<n>`、`end-of-steps`。`after-questions` はフレームワークの文書に載っているが、compose フックの `locateAnchor` に分岐が無く、断片は "unknown anchor" として drop 記録に落ちて差し込まれない。オフラインのバリデータはアンカーが対象ステージのステップに解決するかを検査しないので、誤ったアンカーは validate を通り、compose の時点で初めて落ちる。
- **決定** — 各 contribution は、質問を生成するステップの直後か、回答を集めるステップの直前に差し込む。表の正本は `scripts/sync-contributions.ts` の `TARGETS` で、すべて `order: 100`。質問ファイルを Step 3（Plan Approval）で作る code-generation は `after-step:3` とし、計画書の暫定値 `end-of-steps` はステージ本文を読んだ時点で差し替えた。テストは、各アンカーがコアステージ原文の実在する `### Step N` 見出しに解決すること、Claude と Kiro の install へ compose すると各アンカーにちょうど 1 ブロックが入り drop が 0 で 2 回目がバイト同一であることを検査する。
- **帰結** — オーケストレーターはプロトコルの 3 択のすぐ隣で 4 択目を読む。エンジンの版が上がってステージのステップ番号が変わると断片がずれたり落ちたりするが、submodule を上げたときにアンカー解決と compose のテストが検出する。

## 4. 断片テンプレートは `tests/fragment-template.md` に置き、28 本の contribution は生成する

- **背景** — ほぼ同一の 28 ファイルは drift する。`tests/` は install へ投影も compose もされないので、配布せずに原本を置ける。フレームワークの雛形生成（`aidlc-plugin-create.ts`）はダミーのステージを作るので、contributions のみのプラグインには向かない。
- **決定** — 手で編集する本文は `tests/fragment-template.md` だけ。`scripts/sync-contributions.ts` がテンプレートとアンカー表から 28 本を描画し（frontmatter の `target` / `plugin` / `anchor` / `order`、`## fragment:` 見出し、テンプレート本文）、`--check` は差分があれば非ゼロで終了してファイル名を出す。`--check` は CI とテストスイートの両方で走る。`plugin.test.ts` は各 contribution がそのターゲット向けに描画したテンプレートと一致すること、テンプレートの固定トークンが揃っていることを検査する。
- **帰結** — contribution を直接編集しても次の sync で戻され、drift テストが落ちる。テンプレートそのものは配布されず、描画した写しだけが配布される。

## 5. 検証は当面 Claude Code に限定する

- **背景** — 計画書の検証手順は 7 ハーネスでの `aidlc-plugin-test.ts --install` と、Claude Code＋番号付きプローズ系ハーネス 1 つ（Kiro CLI か Codex）でのライブ確認を求めていた。意図の成功指標 2 も同じ。要求整理で、オーナーはどちらも「Claude だけでいい。一旦。あとから残りは考える」と決めた（0.2.0 ワークフローの Q1・Q2）。
- **決定** — 自動の合成検証は 7 ハーネスの build、Claude と Kiro の install への compose、Claude での同梱ゲート `aidlc-plugin-test.ts --install` まで。ライブ確認は Claude Code のみで、Claude Agent SDK 経由の `bun run test:live` と、2026-09-03 の headless 実行（print モードには `AskUserQuestion` が無いため番号付きプローズで描画され、その経路の確認を兼ねた）。残り 6 ハーネスの `--install` ゲートと、番号付きプローズ系ハーネスでの実機ライブ確認は、計画書の完了記録に今後の課題として残す。意図の成功指標 2 は要求で上書きした。
- **帰結** — 断片の番号付きプローズの規則（❓ / ➡️ / `---` の書式、Other が 5 行目）は print モードの記録でしか確認しておらず、番号付きプローズのホストそのものでは未確認。

## 6. deep-spec-analysis との同等を上限とし、それ以上は作らない

- **背景** — 姉妹プラグイン deep-spec-analysis が「仕上がったプラグインリポジトリ」の基準になる。二言語のルート README、LICENSE、インストーラ、リリーススクリプト、CI のタグ検査、決定記録、`mise.toml`、`renovate.json`。同時に、参照先にはステージ・センサー・ツール・doctor・層化した `src/` があるが、grilling には使い道が無い。
- **決定** — 参照先に対応物があるものだけを写し、それ以上は作らない。`install.ts` と `release.ts` は参照先のスクリプトの写しで、定数 3 つ（プラグイン名・リポジトリ・provenance ファイル名）と完了案内だけを差し替えた。テストも参照先のテストを写した。README の構成は参照先の 7 見出しに従う。CHANGELOG・npm パッケージ・GitHub Release のアセット・CI バッジは参照先に無いので作らない。doctor とカバレッジ走査は報告するものが無いので作らない。
- **帰結** — 2 つのリポジトリが同じインストーラを持つので、修正は手で移す。共通ライブラリへの切り出しは後日。参照先の deep-spec 固有の完了案内は「次の質問ステージで `Grill me` が 4 択目に現れる」「エンジン更新後は `/aidlc plugin sync` を再実行する」の 2 行に置き換えた。

## 7. 取り込み元スキルの現行版（ラウンド方式）を採用し、Depth は質問数ではなく決定の大きさに対応づける

- **背景** — 0.1.0 は `grilling` スキルの古い版——1 問ずつ聞く——を写していた。現行版（mattpocock/skills の `main`、2026-09-04 取得、`skills/productivity/grilling/SKILL.md` と `docs/productivity/grilling.md`）は、相談を決定の木として捉え、前提がすべて決まった決定（フロンティア）を 1 ラウンドでまとめて聞き、依存する質問は次のラウンドに回す。質問は `❓ **Qn** - **題**: 本文` と `➡️` の推奨回答で描画し、事実はサブエージェントに調べさせて残りのフロンティアを待たせず、フロンティアが空になって理解が一致したときだけ終える。質問数の上限は意図的に設けず、`CLAUDE.md` の 1 行で 1 問ずつに戻せる。一方、AI-DLC には Depth（Minimal / Standard / Comprehensive）があり、ステージはそれをおおよその質問数として読んでいた。
- **決定** — 5 要素をすべて採用し、AI-DLC の質問ファイル・§3 の decision / answer の記録ペア・consolidated summary に載せる。Depth は質問数ではなく決定の大きさに対応づける。決定は 2 つの問いかけ——影響の広がり（あとで変えると他に何が変わるか）と戻しやすさ（戻すのにどれだけかかるか）——で XL / L / M / S / SS に分け、各段階に判定の問いかけ 1 行と例・反例を 1 つずつ付ける。Minimal は XL・L、Standard は M まで、Comprehensive は S まで人に聞き、SS は常にエージェントが決める。2 段階にまたがるときは大きい方。閾値未満の決定は推奨回答で決め、そのラウンドの質問の直後に `### Decided assumptions (round n)`（会話言語で描画）の見出しを置いて `- [段階] 決定 — 理由` と書く。consolidated summary は決めた前提の全件を並べて一括で確認し、異議のあった前提は次のラウンドの質問に格上げする。Claude Code の画面は 4 問までなので、5 問以上のラウンドは 4 問ずつ画面を分ける（同じラウンドの質問は独立なので分割しても意味は変わらない）。推奨選択肢は画面でだけ先頭に置いて `(Recommended)` を付ける。番号付きプローズのハーネスでは 1 ラウンドを 1 メッセージに取り込み元の書式で出し、選択肢の並びは変えない。調査待ちの質問は `**Pending:**` 付きで先に追記し、調査で決まった質問は `[Answer]: Resolved by lookup (round n)` と書く。1 問ずつへの切り替えは、スペースの `project.md` の `## Corrections` を趣旨で（言語を問わず）判断し、面接中の依頼も受ける。選択肢の description は `Interview me in rounds of independent questions, each with a recommended answer; drill into every branch until we share the same understanding` にした。
- **帰結** — 取り込み元の「上限なし」は「数に上限はなく、決定の大きさが面接を絞る」として残る。ラウンドと決めた前提の見出しは会話言語で描画し、固定トークンは `**Mode:** grill`、`(Recommended)`、`**Pending:**`、段階タグ、`X. Other (please specify)` だけ。ライブテストは Grill me を選んだ後の最初の画面に 2〜4 問が並び先頭が `(Recommended)` であることを検査し、同じ画面の質問が本当に独立だったかは人が記録を読んで判断する。フロンティアは計算ではなく判断なので、依存する 2 問が同じラウンドに入ることはあり得る。そのときは影響を受けた枝を次のラウンドで聞き直す。

## 選択キー環境での確認（NG1）

フレームワークの既存構造の把握で挙がった懸念。`tools/data/harness.json` に `plugins` 選択キー（`aidlc-utility.ts select-plugins <names>` が書く）を持つ install はプラグインを名前で有効化するが、ステージもスコープも持たないプラグインを名前で指定できるのか、その contribution はマージされるのか。確認は `tests/select-plugins.test.ts` で、`GRILLING_SELECT_KEY_CHECK=1` の opt-in——記録のみで、受け入れ基準にはしない。Claude の投影を build し、checkout の `dist/claude` install を 2 つコピーしてキーを書き込み、投影に同梱された本物の `hooks/compose.ts` をそれぞれに対して走らせる。

2026-09-04 に aidlc-workflows `v2.7.0-1-ga277af21` で実測:

| install | `plugins` キー | compose の終了コード | 断片の入ったステージ | drop | compose 後のキー |
|---|---|---|---|---|---|
| selected | `["aidlc", "grilling"]` | 0 | 28 / 28 | 0 | `["aidlc", "grilling"]`（保持） |
| excluded | `["aidlc"]` | 0 | 0 / 28 | `.drops` ファイル 1 件、`[advisory]` 1 行: plugin "grilling" は compose されたが `tools/data/harness.json` で有効になっていない。`bun .claude/tools/aidlc-utility.ts select-plugins aidlc,grilling` を実行せよ | `["aidlc"]`（保持） |

したがって contributions のみのプラグインは名前で選択でき、contribution はマージされ、除外した install は理由と足し方を示す。肯定的な結果なので README の制約には何も足していない。`/aidlc --doctor` の「Composed plugin surface」行は opt-in テストでは走らせておらず、手で確認する項目として残る。投影の build 後の実行時間は 1 秒未満（`5 pass, 1 skip`。skip はゲートが無効なときに空のスイートにしないための placeholder テスト）。
