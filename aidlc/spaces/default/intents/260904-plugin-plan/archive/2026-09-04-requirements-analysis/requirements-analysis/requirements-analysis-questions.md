# Requirements Analysis — 質問

意図（intent-statement.md）の成功指標は「§8 相当の自動検証がすべて通る」「Claude Code と番号付きプローズ系 1 ハーネスでのライブ確認」「実プロジェクトで Grill me を 1 ステージ分使い切る」の 3 つです。計画書 `docs/plugin-plan.md` §8 / §10 と現在の `grilling/` を突き合わせた事実は次のとおりで、これを前提に「残項目」をどう定義するかを伺います。

- 済: validate（テスト＋CI）、§6 の単体テスト 6 項目（`tests/plugin.test.ts`）、7 ハーネスの build（CI）、Claude・Kiro への compose テスト、Claude の `aidlc-plugin-test.ts --install`、README（ja / en）、Claude Code のライブ確認（`docs/live-check-2026-09-03.md`、print モード＝番号付きプローズ描画で Other が 5 行目）、Agent SDK 経由の live テスト（opt-in）
- 部分: §8-3「7 ハーネス分の plugin-test」は Claude のみ。§8-6 の「番号付きプローズ系ハーネスでの実機」は print モード記録で代替
- N/A: §8-2 `scripts/package.ts` と §8-5 `tests/run-tests.sh --level integration` はフレームワーク repo 内でのみ意味を持つ（このプラグインは自分の repo に置かれている）
- 乖離: 計画は `plugins/grill-me/`・名前 `grill-me`、実装は `grilling/`・名前 `grilling`。`scripts/sync-contributions.ts`（drift guard）は計画にない追加
- 既存構造の把握で見つかったリスク: stage も scope も持たないプラグインは、`plugins` 選択キーのある環境で有効化・doctor 検出されない可能性（未検証）

各質問の `[Answer]:` に選択肢の文字（例: `A`）を記入してください。当てはまらない場合は `X` を選び、内容を書き添えてください。

## Q1. 7 ハーネスでの合成検証（計画書 §8-3）はどこまで求めますか？

現状は build が 7 ハーネス、compose テストが Claude・Kiro、`aidlc-plugin-test.ts --install` が Claude のみです。

A. 7 ハーネスすべてで `aidlc-plugin-test.ts --install` を CI で回す
B. 現状（Claude・Kiro の compose ＋ Claude の plugin-test ＋ 7 ハーネスの build）で §8-3 を満たしたとみなす
C. Claude・Kiro・Codex の 3 ハーネスに広げる（Codex はこのリポジトリにシェルがある）
D. 7 ハーネスをローカルで 1 回通して記録に残すが、CI には載せない
E. Not yet defined（まだ決めていない）
X. Other (please specify)

[Answer]: X. Cluadeだけでいいです。一旦。あとから残りは考えます

## Q2. 番号付きプローズ系ハーネスのライブ確認（計画書 §8-6）はどう行いますか？

意図の成功指標 2 は「Claude Code と番号付きプローズ系ハーネス 1 つ」です。

A. Codex CLI で実施して記録する（`.codex/` シェルあり）
B. Kiro CLI で実施して記録する
C. 2026-09-03 の print モード確認（番号付きプローズ描画で Other が 5 行目）で満たしたとみなす
D. A を実施し、print モード記録も証拠として併記する
E. Not yet defined（まだ決めていない）
X. Other (please specify)

[Answer]: X. ClaudeCodeだけで

## Q3. 「実プロジェクトで Grill me を 1 ステージ分使い切る」（成功指標 3）の対象はどれですか？

現在このリポジトリ自身の `.claude/` には grilling は compose されていません（このワークフローのモード選択も 3 択でした）。

A. このリポジトリ自身に grilling を compose し、このワークフローの以降のステージで Grill me を使って確認する（dogfooding）
B. grilling-sandbox での既存記録（8 問すべて `**Mode:** grill`、監査記録あり）で満たしたとみなす
C. 別の実プロジェクトで行う（X で指定）
D. A を行い、既存記録も証拠として併記する
E. Not yet defined（まだ決めていない）
X. Other (please specify)

[Answer]: B

## Q4. 計画書と実装の乖離はどう扱いますか？

乖離: 名前 `grill-me` → `grilling`、`plugins/grill-me/` → リポジトリ直下 `grilling/`、`scripts/sync-contributions.ts` の追加、§8-2 / §8-5 は N/A。

A. 計画書を実装に合わせて更新し、各項目の完了状況（済 / N/A / 残）を書き込んで「完了記録」にする
B. 実装を計画に合わせる（名前や配置を変える）
C. 計画書は履歴として据え置き、乖離と完了状況は README と別の決定記録に書く
D. Not yet defined（まだ決めていない）
E. Not applicable（乖離は放置してよい）
X. Other (please specify)

[Answer]: A

## Q5. stage も scope も持たないプラグインの有効化・検出リスクはどう扱いますか？

既存構造の把握で、`plugins` 選択キーのある環境では contributions のみのプラグインが名前指定できず、doctor にも検出されない可能性が指摘されました（未検証）。

A. 受け入れ基準に入れる — 選択キーありのサンドボックスで検証し、結果を README の Limits に反映する
B. 検証はするが受け入れ基準にはしない（結果は記録のみ）
C. 上流 aidlc-workflows へ issue を出すだけにする
D. 今回は対象外とする
E. Not yet defined（まだ決めていない）
X. Other (please specify)

[Answer]: B

## Q6. 姉妹プラグイン deep-spec-analysis と同等にするために、どの項目を足しますか？（select all that apply）

参照先 `/Users/j5ik2o/Sources/j5ik2o.github.com/j5ik2o/deep-spec-analysis` と比べて grilling に無いものは次のとおりです。品質は「同等」までで、それ以上は求めない前提です。

A. ルート README（ja / en）を同じ構成（Highlights / Quickstart: Requirements・Install・Adopting mid-project・host store の代替 / Development / Repository layout / Documentation / License）で書き、`LICENSE` を置く（現状のルート README はタイトル 1 行のみ）
B. インストーラ `scripts/install.ts`（`--project` / `--harness` / `--tag` / `--from` / `--ref` / `--update` / `--dry-run`、`<harness>/tools/data/grilling-install.json` への provenance 記録）を用意し、README の Quickstart から使う
C. リリース機構 — `scripts/release.ts <version>`（manifest のバージョン更新と `vX.Y.Z` タグ、`chore(release): publish vX.Y.Z`）と CI のタグ検査（`--check-tag`）
D. 文書 — `docs/decisions.md`（ja / en）に今回までの決定を記録し、`mise.toml`（bun 固定）と `renovate.json` を置く
E. None（現状で同等とみなし、何も足さない）
X. Other (please specify)

[Answer]: A, B, C, D

## Q7. リリースするなら、バージョンはどうしますか？

現在 `plugin.json` は 0.1.0（タグなし）。deep-spec-analysis は 0.5.0 を `v0.5.0` タグで公開しています。

A. 0.2.0 として公開する（計画完了＋ランナー等の追加）
B. 1.0.0 として公開する（計画書の完了を初回安定版とみなす）
C. 0.1.0 のまま `v0.1.0` タグだけ打つ
D. Not yet defined（まだ決めていない）
E. Not applicable（今回はリリースしない）
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

回答のまとめ:

- Q1（7 ハーネス検証）= X: 「Cluadeだけでいいです。一旦。あとから残りは考えます」— 合成検証は Claude のみを今回の範囲とし、残り 6 ハーネスは今後の課題（対象外）として記録する
- Q2（番号付きプローズ系のライブ確認）= X: 「ClaudeCodeだけで」— ライブ確認は Claude Code のみ。意図の成功指標 2 にあった「番号付きプローズ系ハーネス 1 つ」は今回の範囲から外す（要求に明記して意図の指標を上書き）
- Q3（実プロジェクトで 1 ステージ分）= B: grilling-sandbox の既存記録（8 問すべて `**Mode:** grill`、監査記録あり）で成功指標 3 を満たしたとみなす
- Q4（計画と実装の乖離）= A: 計画書 `docs/plugin-plan.md` を実装に合わせて更新し、各項目の完了状況（済 / N/A / 残）を書き込んで「完了記録」にする
- Q5（stage/scope なしプラグインの検出リスク）= B: 選択キーありのサンドボックスで検証するが、受け入れ基準にはしない（結果は記録のみ）
- Q6（deep-spec-analysis との同等項目）= A, B, C, D: ルート README（ja / en）＋ LICENSE、インストーラ `scripts/install.ts`、リリース機構（`scripts/release.ts` ＋ `vX.Y.Z` タグ ＋ CI のタグ検査）、`docs/decisions.md`（ja / en）＋ `mise.toml` ＋ `renovate.json` をすべて足す。品質は deep-spec-analysis と「同等」までで、それ以上は求めない
- Q7（バージョン）= A: 0.2.0 として公開する

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
