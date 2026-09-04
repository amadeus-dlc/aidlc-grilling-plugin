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

## 追加質問（上流 grilling の取り込み — 要求整理へ戻って追加）

構成決定の途中で、上流 mattpocock/skills の `grilling` スキル（現行版）を忠実に取り込む要望が出ました。上流の逐語コピーは `<record>/inception/domain-design/upstream-grilling-SKILL.md` と `upstream-grilling-doc.md` にあります。現在の断片は旧版（1 問ずつ）を写したもので、上流の現行版は「フロンティア（前提が全部決まった決定）を 1 ラウンドでまとめて出す」方式です。以下は取り込みに関する判断です。

## Q8. 上流の何を取り込みますか？

上流 SKILL.md の要素: (1) design tree で捉える、(2) フロンティアを 1 ラウンドでまとめて出し、依存する質問は次のラウンドへ、(3) `❓ **Qn** - **題**: 本文` ＋ `➡️ 推奨回答` の書式、(4) 事実は sub-agent に調べさせ、待たずに残りを聞く、(5) フロンティアが空になったら終了、共有理解の確認まで行動しない。

A. (1)〜(5) すべてを断片に取り込む（AI-DLC の質問ファイル・監査記録・summary 確認の仕組みに載せて表現する）
B. (2) のラウンド方式だけ取り込む（書式と sub-agent は AI-DLC の描画・探索に任せる）
C. 上流本文を逐語で断片に埋め込む（AI-DLC の語彙への言い換えをしない）
D. Not yet defined（まだ決めていない）
E. Not applicable（取り込まない）
X. Other (please specify)

[Answer]: A

## Q9. Depth と決定の解像度（葉の大きさ）はどう対応させますか？

上流は質問数の上限を意図的に設けません。AI-DLC の Depth は「人に聞く量」の目安です。

A. 提案どおり — 決定の大きさを XL / L / M / S / SS で分け、Minimal は XL・L まで、Standard は M まで、Comprehensive は S まで人に聞く（SS は常にエージェントが決める）。閾値以下の決定は推奨回答で決め、ラウンドごとに「決めた前提」として質問ファイルに明示し、最後の summary 確認で一括確認する
B. Depth は無視し、常にフロンティアが空になるまで聞く（上流の原則を優先）
C. Depth を質問数の目安として扱う（既存の表: Minimal 2〜4 / Standard 5〜8 / Comprehensive 8〜12）
D. Not yet defined（まだ決めていない）
E. Not applicable（Depth と関係づけない）
X. Other (please specify)

[Answer]: A

## Q10. 「1 問ずつ」への切り替え（上流の opt-out）は用意しますか？

上流は `CLAUDE.md` に「When grilling, ask one question at a time.」と書くと 1 問ずつに戻せます。

A. 用意する — `aidlc/spaces/<space>/memory/project.md` の `## Corrections` に同趣旨の 1 行があればラウンドを 1 問ずつにする、と断片に書く
B. 用意しない（常にラウンド方式）
C. 逆に既定を 1 問ずつにし、ラウンドは opt-in にする
D. Not yet defined（まだ決めていない）
E. Not applicable
X. Other (please specify)

[Answer]: X. Guide meは事前に質問票を出すけど、Grill meは事前に質問を決定できません。一つ一つ答えることで次の質問が変わります。理解していますか

## Q11. ラウンドとハーネス制約（Claude Code は 1 回の構造化質問に 4 問まで）はどう折り合わせますか？

A. 1 ラウンドを 4 問ずつに分割して出す（同一ラウンド内の質問は独立なので分割しても意味は変わらない）
B. 1 ラウンドを最大 4 問に制限し、フロンティアが大きいときは複数ラウンドに分ける
C. Claude では 1 問ずつ、番号付きプローズ系ではラウンドでまとめる
D. Not yet defined（まだ決めていない）
E. Not applicable
X. Other (please specify)

[Answer]: X. まとめて質問を出せません。そもそも。

## Q12. 事実の調査（sub-agent）はどう扱いますか？

A. Claude Code では sub-agent（Task）に調べさせ、他ハーネスでは自分で探索する。断片はハーネス中立に「dispatch するか自分で調べる。待たずに残りのフロンティアを先に聞く」と書く
B. 常に自分で探索する（sub-agent は使わない）
C. Not yet defined（まだ決めていない）
D. Not applicable
E. 上流どおり常に sub-agent を dispatch する（できないハーネスでは省略）
X. Other (please specify)

[Answer]: A

## Q13. 検証はどう更新しますか？

既存の `tests/plugin.test.ts`（断片の内容検査）と `tests/live-claude.test.ts`（メニュー 2・3 が 1 問ずつであることを検証）、`docs/live-check-2026-09-03.md` は 1 問ずつ方式を前提にしています。

A. テストを新方式（ラウンド・推奨回答・決めた前提）に更新し、Claude Code のライブ確認を再実施して記録を更新する（Q1 / Q2 の「Claude のみ」は維持）
B. テストは更新するが、ライブ確認の再実施はしない
C. テストもライブ確認も現状のまま（新方式は未検証で出す）
D. Not yet defined（まだ決めていない）
E. Not applicable
X. Other (please specify)

[Answer]: A

## Q14. 質問の出し方は、どちらにしますか？（Q10・Q11 の聞き直し）

前提の確認: Grill me は質問票を先に全部作れません。答えを聞いて次の質問が決まるので、質問ファイルには聞く直前に追記します。この点はどちらを選んでも同じです。違うのは「互いに関係のない質問が同時に複数あるとき、それらを 1 回で出すか、1 問ずつ出すか」だけです。

取り込み元の現行版は「前提の決まった、互いに関係のない質問だけを 1 回で出す。片方の答えで変わる質問は次の回に回す」方式です。同じページで「1 問ずつに戻したい人は設定ファイルに 1 行書けばよい」と正式に案内しています。あなたの手元の古い版は「1 問ずつ」です。

A. 現行版どおり — 互いに関係のない質問だけをまとめて出す。依存する質問は次の回。Claude Code の画面が 4 問までなので、5 問以上の回は画面を分ける。設定ファイルに 1 行書けば 1 問ずつに切り替えられるようにする
B. 1 問ずつ — 手元の古い版のとおり、常に 1 問ずつ出す（まとめて出す方式は入れない）
C. 既定は 1 問ずつ。設定ファイルに 1 行書いたときだけ、まとめて出す
D. Not yet defined（まだ決めていない）
E. Not applicable
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

回答のまとめ（要求整理へ戻って追加した Q8〜Q14 を含む）:

- Q1（7 ハーネス検証）= X: 「Cluadeだけでいいです。一旦。あとから残りは考えます」— 合成検証は Claude のみ。残り 6 ハーネスは今後の課題として記録
- Q2（番号付きプローズ系のライブ確認）= X: 「ClaudeCodeだけで」— ライブ確認は Claude Code のみ。意図の成功指標 2 を要求で上書き
- Q3（実プロジェクトで 1 ステージ分）= B: grilling-sandbox の既存記録で成功指標 3 を満たしたとみなす。ただし Q13 で新方式のライブ確認をやり直すので、その新しい記録も証拠に加える
- Q4（計画と実装の乖離）= A: 計画書を実装に合わせて更新し、完了状況を書いて「完了記録」にする
- Q5（検出リスク）= B: 検証はするが受け入れ基準にはしない
- Q6（deep-spec-analysis との同等項目）= A, B, C, D: ルート README（ja/en）＋LICENSE、インストーラ、リリース機構、docs/decisions＋mise＋renovate
- Q7（バージョン）= A: 0.2.0 として公開。取り込み元スキルの取り込みも 0.2.0 に含める
- Q8（取り込み範囲）= A: 取り込み元スキル（Matt Pocock の grilling、GitHub main の現行版）の 5 要素すべて（決定の木、前提の揃った質問をまとめて出す、❓/➡️ 書式、事実は調べさせて待たない、同じ理解に至るまで行動しない）を、AI-DLC の質問ファイル・監査記録・最後の確認に合わせて断片に入れる
- Q9（Depth との対応）= A: 決定を XL / L / M / S / SS に分け、Minimal は XL・L、Standard は M まで、Comprehensive は S まで人に聞く。SS は常にエージェントが決める。聞かなかった決定は「決めた前提」として質問ファイルに書き、最後の確認でまとめて見てもらう
- Q10・Q11 = X（いただいた言葉をそのまま記録。Q14 で聞き直し）
- Q12（調べ方）= A: Claude Code ではサブエージェントに調べさせ、呼べないツールでは自分で調べる。待たずに残りの質問を先に出す
- Q13（検証）= A: テストを新方式に更新し、Claude Code のライブ確認をやり直して記録を更新する
- Q14（出し方）= A: 互いに関係のない質問だけをまとめて出す。依存する質問は次の回。Claude Code では 5 問以上の回を 4 問ずつに分ける。設定ファイルに 1 行書けば 1 問ずつに切り替えられる

Does this all look correct before I generate the requirements artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
