# ライブ確認の記録（2026-09-04）— Grill me の新方式（ラウンド方式）

旧方式（1 問ずつ）の記録は [live-check-2026-09-03.md](live-check-2026-09-03.md)。この記録は、取り込み元スキル `grilling` の現行版に合わせた新方式（前提の揃った質問をまとめて出す・推奨回答・決めた前提・Depth と決定の大きさの対応）を、Claude Code を実際に動かして確かめたもの。

## 環境

| 項目 | 値 |
|---|---|
| ハーネス | Claude Code（Claude Agent SDK 0.3.158 経由。`grilling/tests/harness/sdk-drive.ts`） |
| モデル | sonnet（`GRILLING_LIVE_MODEL` 既定） |
| エンジン | aidlc-workflows v2.7.0-1-ga277af21 の `dist/claude` |
| 断片 | `grilling/tests/fragment-template.md`（新方式、139 行）を compose した使い捨て install |
| プロンプト | `/aidlc --scope feature Build a small command-line tool that prints a personalised greeting for a given name`（Depth は feature スコープの Standard） |
| 回答の台本 | 画面 1 は `Grill me`、以後は先頭の選択肢。画面 3 の後で停止 |
| コマンド | `cd grilling && AIDLC_KEEP_TEMP=1 bun run test:live` |

サンドボックス検証（同日）: リポジトリの隣に `grilling-sandbox` を `aidlc-workflows/dist/claude` から作り直し、`bun grilling/scripts/install.ts --project ../grilling-sandbox --from . --harness claude` で導入（1 回目 `Changed 1`、2 回目 `Changed 0`、provenance 5 項目）、`aidlc-plugin-test.ts --install` は `Plugin test: CLEAN / Drops: 0 / Idempotent second compose: true`、28 ステージに sentinel、サンドボックスの `/aidlc --doctor` は「Composed plugin surface: all enabled plugin stages and recorded contributions are present」で 50 項目合格。

## 実走 1 回目（11:22〜11:28 UTC、371 秒）

### 画面

| 画面 | 内容 | 判定 |
|---|---|---|
| 1 | モード選択 4 択（Guide me / I'll edit the file / Chat / Grill me）。Grill me の description は固定文と逐語一致 | pass |
| 2 | ラウンド 1 の前半: Q1 目的、Q2 利用者、Q3 「personalised greeting」の意味、Q4 名前の渡し方（4 問）。各問の推奨選択肢が先頭 | 質問数 4（2〜4 の範囲内）。**先頭選択肢の label に `(Recommended)` が無く、description の末尾に付いていた**（4 問とも）→ fail |
| 3 | ラウンド 1 の後半: Q5 技術制約、Q6 スコープの妥当性（2 問）。各問の推奨選択肢が先頭 | 質問数 2（4 以下）。Q5 は description に `(Recommended)`、Q6 は label に `(Recommended)` → fail |

テストの結果: 3 pass / 2 fail / 1 skip（`grilling/tests/live-claude.test.ts`。fail は画面 2 と画面 3 の「先頭 label に (Recommended)」の検査）。

### 帳簿（使い捨て install の質問ファイルと監査記録）

- 質問ファイル `ideation/intent-capture/intent-capture-questions.md` に `## Round 1` の見出しがあり、Q1〜Q6 が 1 ラウンドとして追記されていた（フロンティア 6 問を 4 + 2 の 2 画面に分割。断片の規則どおり）
- 各質問に文脈 1 行、選択肢（最後は `X. Other (please specify)`）、`**Recommended:** A — <理由>` の行
- 画面 2 の答えは画面 3 を出す前に `[Answer]:` に書き戻され、直下に `**Mode:** grill` が付いていた（Q1〜Q4）。Q5・Q6 は停止時点で未回答（テストが画面 3 の後で止めるため）
- 決めた前提の節は無し（この面接では閾値未満の決定が無かった。Standard の閾値 M 以上の 6 問だけを聞いた）
- 監査記録: `DECISION_RECORDED` 3 件（モード選択、画面 2、画面 3）、`QUESTION_ANSWERED` 2 件（モード選択、画面 2）。画面ごとの記録の対が取れている

### 同じ画面の質問どうしの独立性（人が読んだ判断）

- 画面 2 の Q1（目的）と Q2（利用者）は内容が相関する（学習用なら利用者は自分）が、片方の答えでもう片方の問い自体が変わるわけではない。Q3（挨拶の中身）と Q4（名前の渡し方）は互いに独立。同じ画面に置いたことは妥当
- 画面 3 の Q5（技術制約）と Q6（スコープ）も互いに独立。Q5 は Q1・Q2 の答え（自分用の学習）に応じて推奨が変わりうるが、Q1・Q2 は前の画面で答えた後なので、フロンティアの再計算はしていない（同じラウンドの残りをそのまま出す規則どおり）
- 取り込み元が認める「フロンティアは判断であって計算ではない」限界の範囲。人が指摘すべき依存はなかった

### 所見

- ラウンド方式（前提の揃った 6 問を 1 ラウンドにまとめ、Claude Code の上限に合わせて 4 + 2 に分割し、画面ごとに書き戻して記録する）は断片の規則どおりに動いた
- 唯一の欠陥は `(Recommended)` の置き場所。断片は「label の末尾に付ける」と書いているが、モデル（sonnet）は 6 問中 5 問で description の末尾に付けた。人には「推奨が先頭で、印が付いている」ことは見えているので実害は小さいが、設計ルール BR2.2 と自動テストは label を要求している

## 実走 2 回目（13:06〜13:12 UTC、340 秒。断片の描画規則を直した後）

1 回目の結果を受けて、人が「Retry with fix」を選び、断片の Rendering 段落を「`(Recommended)` は選択肢の **label**（利用者が最初に読む短い見出し。例 `A. Command-line argument (Recommended)`）に付ける。description に付けるだけでは不十分」と一読で分かる文に直した（139 → 142 行）。28 contribution を再生成し、同じ手順で実走した。

### 画面

| 画面 | 内容 | 判定 |
|---|---|---|
| 1 | モード選択 4 択。Grill me の description は固定文と逐語一致 | pass |
| 2 | ラウンド 1 の前半: Q1 目的、Q2 利用者、Q4 言語とランタイム、Q7 スコープの妥当性（4 問）。**各問の先頭選択肢の label に `(Recommended)`**（例 `A. Learning exercise / demo (Recommended)`） | pass |
| 3 | ラウンド 1 の後半: Q3 成功の定義、Q5 名前の渡し方、Q6 挨拶の書式（3 問）。各問の先頭 label に `(Recommended)` | pass |

テストの結果: **5 pass / 0 fail / 1 skip**（`grilling/tests/live-claude.test.ts`。画面 1〜3 と帳簿の 4 テスト + 到達確認）。

### 帳簿

- 質問ファイルに `## Round 1` の見出しがあり、Q1〜Q7 の 7 問が 1 ラウンドとして追記されていた（フロンティア 7 問を 4 + 3 の 2 画面に分割）
- 各質問に `**Recommended:** <文字> — <理由>` の行
- 画面 2 の答え（Q1、Q2、Q4、Q7）は画面 3 を出す前に `[Answer]:` に書き戻され、直下に `**Mode:** grill`。Q3・Q5・Q6 は停止時点で未回答（テストが画面 3 の後で止めるため）
- 決めた前提の節は無し（閾値 M 未満と判定した決定が無かった）
- 監査記録: `DECISION_RECORDED` 3 件（モード選択、画面 2、画面 3）、`QUESTION_ANSWERED` 2 件（モード選択、画面 2）

### 同じ画面の質問どうしの独立性（人が読んだ判断）

- 画面 2: Q1（目的）、Q2（利用者）、Q4（言語）、Q7（スコープ）。Q4 は Q1・Q2 の答えで推奨が変わりうる（学習用・自分用なら Python、パイプライン用なら別）が、問い自体は変わらない。Q7 は独立。同じ画面に置いたことは妥当
- 画面 3: Q3（成功の定義）、Q5（名前の渡し方）、Q6（挨拶の書式）。互いに独立
- ラウンド 1 の 7 問はいずれも、他の質問の答えが無いと聞けない問いではない。取り込み元の限界の範囲で、人が指摘すべき依存はなかった

### 所見

- 1 回目の欠陥（印の置き場所）は文言の修正で解消した。ラウンド方式（1 ラウンド 7 問を 4 + 3 に分割、推奨が先頭で label に印、画面ごとの書き戻しと記録）は 2 回とも規則どおり
- 画面 3 の質問数は 1 回目が 2、2 回目が 3。ラウンドの大きさはモデルが下書きした質問数（6 と 7）で決まり、どちらも Standard の閾値 M 以上の決定だけを聞いている

## サンドボックス検証で見つかった別の欠陥（インストーラ）

断片テンプレートを変えた後に `bun grilling/scripts/install.ts --project ../grilling-sandbox --from <repo-root>` を再実行すると `Changed 0` と表示して合成を省き、サンドボックスは旧断片のままになる。インストーラの「変更なし」判定が provenance の `payload_sha256`（sensors / tools などのペイロード）だけを比べ、contributions を数えていないため。grilling は contributions しか持たないので、ダイジェストは常に空列のものになる。compose hook（`hooks/compose.ts`）自体は内容ベースで置き換えるので、直接実行すれば 28 ステージが新しい断片になった。

対処（Loop-back 2）: `install.ts` の provenance に記録するダイジェストを「投影のペイロードファイル＋ `contributions/**`」に広げ、導入先のファイルとの一致判定は従来どおりペイロードのファイルだけにした。修正後にサンドボックスで再実行すると、1 回目は `Changed 1`（provenance が `sha256:e3b0c4…` から `sha256:ef5956…` に更新され、28 ステージが新しい断片に）、2 回目は `Changed 0`。`grilling/tests/installer.test.ts` に「断片を変えて再実行すると合成し直し、さらにもう 1 回は `Changed 0`」を追加した。エンジンの再インストールで合成が消えた場合は provenance も候補も変わらないため検出できず、`/aidlc plugin sync` の再実行が要る（README に明記）。
