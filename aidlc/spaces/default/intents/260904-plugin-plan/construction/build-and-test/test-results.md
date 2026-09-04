# テスト結果 — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

実行日: 2026-09-04（UTC 11:21〜11:28）。入力: `../code-generation/code-generation-plan.md`、`../code-generation/unit-test-instructions.md`、`../code-generation/code-summary.md`。手順: `build-instructions.md`、`integration-test-instructions.md`、`performance-test-instructions.md`、`security-test-instructions.md`。

## ビルド

| 手順 | 結果 |
|---|---|
| `bun install --frozen-lockfile` | 成功（no changes、134 パッケージ） |
| `bunx tsc --noEmit` | 成功 |
| `bun scripts/sync-contributions.ts --check` | 成功（28 contributions match the template） |
| `aidlc-plugin-validate.ts .` | 成功（Errors 0 / warnings 1 `compose-hook-absent`。既知の advisory、作業前から同じ） |
| `aidlc-plugin-build.ts . <harness>` × 7（claude / codex / copilot / cursor / kiro / kiro-ide / opencode） | すべて COMPLETE |

## 単体テスト（`unit-test-instructions.md` のコマンドを重複なく 1 回ずつ）

| コマンド | 合計 | pass | fail | skip | 所要 |
|---|---|---|---|---|---|
| `bun test`（`tests/plugin.test.ts` 23、`tests/installer.test.ts` 10、`tests/release.test.ts` 8、`tests/live-claude.test.ts` と `tests/select-plugins.test.ts` は skip） | 57 | 43 | 0 | 14 | 3.7 秒 |
| `GRILLING_SELECT_KEY_CHECK=1 bun test tests/select-plugins.test.ts`（opt-in、Code Generation で実測） | 6 | 5 | 0 | 1 | 0.7 秒 |

CI 相当の列（型検査 → 一致検査 → `bun test` → validate → 7 build）の合計: 4.5 秒（NFR1 の 15 分に対して十分）。

## 統合テスト

### サンドボックス検証（`../grilling-sandbox`。人の指示）

| 手順 | 結果 |
|---|---|
| `aidlc-workflows/dist/claude` から作り直し | 成功 |
| `install.ts --project ../grilling-sandbox --from <repo-root> --harness claude`（1 回目） | `Changed 1 — recorded 0.1.0 from local <repo-root>`。案内 2 点（Grill me が 4 択目に現れる / エンジン更新後は `/aidlc plugin sync`）を表示 |
| 同（2 回目） | `Changed 0 — local <repo-root> is already installed` |
| provenance `.claude/tools/data/grilling-install.json` | `version` 0.1.0 / `ref` <repo-root> / `source` local / `installed_at` 2026-09-04T11:22:28Z / `payload_sha256` sha256:e3b0c4…（空ペイロードのダイジェスト。contributions のみのため） |
| `aidlc-plugin-test.ts grilling --install ../grilling-sandbox --harness claude` | `Plugin test: CLEAN`、Changed files (0)（導入済み）、Drops: 0、Idempotent second compose: true |
| 合成されたステージ数（sentinel `plugin:grilling:`） | 28 / 28 |
| サンドボックスの `/aidlc --doctor` | 50 passed / 0 failed。「Composed plugin surface: all enabled plugin stages and recorded contributions are present」 |

### サンドボックス検証（再、Loop-back 1 の断片修正の後）

| 手順 | 結果 |
|---|---|
| `install.ts --project ../grilling-sandbox --from <repo-root> --harness claude`（断片テンプレート変更後の再実行） | **`Changed 0 — local <repo-root> is already installed`** と表示して compose を省略。サンドボックスは旧断片のまま |
| `aidlc-plugin-test.ts --install ../grilling-sandbox`（一時コピーで compose） | `Changed files (29)`（28 ステージ + `plugin-contrib-grilling.json`）— サンドボックスの内容が新しい投影と異なることの証拠 |
| 投影の `hooks/compose.ts` を直接実行 | 28 ステージすべてが新しい断片に置き換わった（compose は内容ベースで置き換える） |

所見（T16）: インストーラの「変更なし」判定（BR8.7）は provenance の `payload_sha256` と投影のペイロード（sensors / tools / knowledge / agents / scopes / stages）だけを比べており、contributions を数えていない。grilling は contributions しか持たないため、テンプレートを変えても `payload_sha256` は空列のダイジェストのままで、`--from` の再実行が `Changed 0` になり合成し直さない。参照先 deep-spec-analysis では payload があるので顕在化しないが、contributions のみのプラグインでは要求 NFR5「provenance にダイジェストを残して変更を検出する」の趣旨に反する。README の `--update` 節にも同じ前提（provenance が同じなら `Changed 0`）で書いてある。

### Claude Code の実走（`bun run test:live`、sonnet、371 秒）

| テスト | 結果 | 内容 |
|---|---|---|
| the run reached three AskUserQuestion menus and stopped there | pass | 画面 3 で停止 |
| menu 1 offers Grill me as the fourth interaction mode, verbatim | pass | 4 択、description が固定文と逐語一致 |
| menu 2 asks the first round as one screen of two to four questions, each recommended first | **fail** | 質問数 4（範囲内）、推奨が先頭。ただし `(Recommended)` が label ではなく description の末尾に付いていた（4 問とも） |
| menu 3 asks at most four questions, each recommended first | **fail** | 質問数 2（範囲内）、推奨が先頭。Q5 は description に、Q6 は label に `(Recommended)` |
| the mode choice and the first answer were logged and written back | pass | `## Round 1`、Q1〜Q4 に `[Answer]:` と `**Mode:** grill`、DECISION_RECORDED 3 件、QUESTION_ANSWERED 2 件 |

失敗の詳細:

```
error: first option must be marked recommended: A. Learning exercise or personal project
Expected substring or pattern: /\(Recommended\)/
Received: "A. Learning exercise or personal project"
  at expectRecommendedFirst (grilling/tests/live-claude.test.ts:204:100)
```

同じ失敗が画面 3（`A. No constraints — choose whatever fits best`）でも発生。記録: `docs/live-check-2026-09-04.md`（画面の全文、帳簿、独立性の判断）。使い捨て install は `AIDLC_KEEP_TEMP=1` で残してある。

### Claude Code の実走（2 回目、Loop-back 1 の後。sonnet、340 秒）

| テスト | 結果 | 内容 |
|---|---|---|
| the run reached three AskUserQuestion menus and stopped there | pass | 画面 3 で停止 |
| menu 1 offers Grill me as the fourth interaction mode, verbatim | pass | 4 択、description 逐語一致 |
| menu 2 asks the first round as one screen of two to four questions, each recommended first | **pass** | 4 問（Q1 目的、Q2 利用者、Q4 言語、Q7 スコープ）。各先頭 label に `(Recommended)` |
| menu 3 asks at most four questions, each recommended first | **pass** | 3 問（Q3 成功の定義、Q5 名前の渡し方、Q6 書式）。各先頭 label に `(Recommended)` |
| the mode choice and the first answer were logged and written back | pass | `## Round 1`、Q1・Q2・Q4・Q7 に `[Answer]:` と `**Mode:** grill`、DECISION_RECORDED 3 件、QUESTION_ANSWERED 2 件 |

5 pass / 0 fail / 1 skip。記録: `docs/live-check-2026-09-04.md`「実走 2 回目」（独立性の判断を含む）。

### サンドボックス検証（Loop-back 2 の後、14:14 UTC）

| 手順 | 結果 |
|---|---|
| CI 相当の列（型検査 → 一致検査 → `bun test` → validate → 7 build） | すべて green。`bun test` 44 pass / 14 skip / 0 fail（`installer.test.ts` が 11 件に）。合計 4.9 秒 |
| `install.ts --project ../grilling-sandbox --from <repo-root>`（修正後、開発者役が 2 回実行） | 1 回目 `Changed 1`（provenance の `payload_sha256` が空列のダイジェスト `sha256:e3b0c4…` から contributions 込みの `sha256:ef5956…` に更新）、2 回目 `Changed 0` |
| 同（品質エンジニアが再実行） | `Changed 0`。provenance 5 項目、`payload_sha256` = `sha256:ef5956…` |
| `aidlc-plugin-test.ts --install ../grilling-sandbox` | `Plugin test: CLEAN`、Changed files (0)、Drops: 0、Idempotent second compose: true |
| サンドボックスの 28 ステージに新しい断片の文 | 28 / 28 |
| サンドボックスの `/aidlc --doctor` | 50 passed / 0 failed。Composed plugin surface に全 contribution |

## 性能（NFR1）

CI 相当の列が 4.5 秒（上限 15 分）。`bun test` の内訳: compose（Claude / Kiro）と plugin-test と installer の e2e を含めて 3.7 秒。

## セキュリティ

| 検査 | 結果 |
|---|---|
| tar.gz のパストラバーサル・リンク拒否（`tests/installer.test.ts`） | pass |
| `--dry-run` で対象の全ファイルの sha256 が不変 | pass |
| 引数の検証（選択子の併用、`--update` + 選択子、manifest 名の不一致） | pass |
| 認証情報のハードコード | なし（`grilling/scripts/` に api key / secret / token / password の一致なし） |
| 実行時依存ゼロ（`package.json` に dependencies 無し、import は `node:*` のみ） | pass |
| リリースの事前検査（`tests/release.test.ts`） | pass |
| CI のタグ検査ステップ（`refs/tags/` 条件） | 存在 |

## カバレッジ

plugin-dev スコープにカバレッジの数値目標は無い（Testing Contract の scope_floor: 既存スイート green のみ）。計測はしていない。

## Target Verification Matrix（確定）

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T1 | Testing Contract scope_floor | 既存スイート green | 43 pass / 0 fail | `bun test` | build-and-test | Met |
| T2 | Testing Contract strategy_volume | 新設コンポーネント 5〜8 件 | Installer 10、ReleaseTool 8 | `tests/installer.test.ts`、`tests/release.test.ts` | build-and-test | Met（Installer は上限を 2 件超えるが不足ではない） |
| T3 | requirements.md NFR1 | CI 15 分以内 | 4.5 秒（ローカル） | 本ファイル「性能」 | build-and-test | Met |
| T4 | requirements.md NFR2 | 再実行が `Changed 0` | 2 回目 `Changed 0`、plugin-test idempotent true | サンドボックス検証、`tests/installer.test.ts` | build-and-test | Met |
| T5 | requirements.md NFR4 | 実行時依存ゼロ | dependencies 無し | `grilling/package.json` | build-and-test | Met |
| T6 | requirements.md NFR5 | provenance にダイジェスト、同じソースで一致 | 5 項目、2 回目は一致で `Changed 0` | provenance ファイル | build-and-test | Met |
| T7 | requirements.md NFR6 | symlink を追わない・外へ書かない・認証情報なし | 該当テスト pass | `tests/installer.test.ts` | build-and-test | Met |
| T8 | rules.md BR10.2 | 断片テンプレート 150 行以内 | 139 行 | `tests/plugin.test.ts` | build-and-test | Met |
| T9 | rules.md BR10.3 | 画面 1 が 4 択・description 逐語 | pass | ライブ確認 | build-and-test | Met |
| T10 | rules.md BR10.4 | 画面 2 に 2〜4 問、各先頭 label に `(Recommended)` | 1 回目: 4 問だが印は description（Not Met）→ 2 回目（Loop-back 1 の後）: 4 問、各先頭 label に印 | ライブ確認 2 回目（pass） | build-and-test | Met |
| T11 | rules.md BR10.5 | 画面 3 は 4 問以下、各先頭 label に `(Recommended)` | 1 回目: 2 問、1 問は印が description（Not Met）→ 2 回目: 3 問、各先頭 label に印 | ライブ確認 2 回目（pass） | build-and-test | Met |
| T12 | rules.md BR10.6 | 帳簿と監査 | pass | ライブ確認 | build-and-test | Met |
| T13 | rules.md BR10.7 | ライブ確認の記録 | `docs/live-check-2026-09-04.md` | 記録ファイル | build-and-test | Met |
| T14 | requirements.md NG1（記録のみ） | 選択キー環境で合成される | 28/28、drop 0 | `tests/select-plugins.test.ts`、`grilling/docs/decisions.md` | code-generation | Met |
| T15 | 人の指示（サンドボックス検証） | 導入・合成チェック・doctor が通る | すべて通過 | 本ファイル「サンドボックス検証」 | build-and-test | Met |
| T16 | requirements.md NFR5 / BR8.7（変更の検出） | ソース（contributions）が変わったら `install.ts --from` の再実行が合成し直す | Loop-back 2 の前: `Changed 0` で合成を省いた（Not Met）→ 修正後: 断片変更後の再実行が `Changed 1` で合成し直し、その次は `Changed 0`（テスト `installer.test.ts` と実サンドボックスで確認） | 本ファイル「サンドボックス検証（Loop-back 2 の後）」、`tests/installer.test.ts` | build-and-test | Met |

判定: 1 回目は T10・T11 が Not Met → Loop-back 1 で解消。2 回目は T16 が Not Met → Loop-back 2 で解消。3 回目（14:14 UTC）は **すべての目標が Met** で、この実行は **成功**（Loop-backs used: 2/3）。

## Loop-Back Log

### Loop-back 1 — 2026-09-04T11:40:00Z

- **Diagnosis**: ライブ確認（`bun run test:live`、sonnet）で、画面 2・3 の先頭選択肢の label に `(Recommended)` が無く、description の末尾に付いていた（6 問中 5 問）。ラウンド方式（4 + 2 の分割、推奨が先頭、書き戻しと記録）は規則どおり動いており、欠陥は印の置き場所だけ。断片の描画規則「append " (Recommended)" to its label」が段落の中に埋まっていて、モデルが label ではなく description に付けた
- **Root-cause stage**: code-generation（`grilling/tests/fragment-template.md` の描画規則の文言）
- **Planned fix**: 断片の「Rendering」段落で、印を付ける先が選択肢の **label**（短い見出し側）であり description ではないことを明示する 1〜2 行の修正。28 contribution を再生成し、`bun test`（テンプレート検査）と `bun run test:live` を再実行する。テストと設計ルール BR2.2 は変えない
- **Estimated impact**: effort 約 15 分（編集とテスト 5 分、ライブ 6〜7 分）、financial cost ライブ 1 回で 2〜4 ドル、risk 中（プロンプトへの従い方は確率的。再発したら「印は label または description」と検査とルールを広げる設計変更を次の候補として提案する）
- **Human decision**: Retry with fix（2026-09-04）
- **Outcome**: 解消。断片の Rendering 段落を label と明示する文に直して再実走し、5 pass / 0 fail（`docs/live-check-2026-09-04.md` 実走 2 回目）

### Loop-back 2 — 2026-09-04T13:20:00Z（Outcome: 解消。provenance のダイジェストに contributions を含める修正で、断片変更後の再実行が `Changed 1` → その次は `Changed 0`。テスト 44 件 pass、サンドボックスで実測）

- **Diagnosis**: サンドボックスで断片テンプレートを変えた後に `install.ts --from` を再実行すると `Changed 0` と表示して合成を省き、サンドボックスは旧断片のまま（T16）。「変更なし」判定（BR8.7）が provenance の `payload_sha256`（sensors / tools などペイロードのファイル）だけを比べ、contributions を数えていない。grilling は contributions しか持たないため、テンプレートを変えてもダイジェストは空列のもののまま。compose hook 自体は内容ベースで置き換える（直接実行で 28 ステージが更新された）
- **Root-cause stage**: code-generation（`grilling/scripts/install.ts` の候補ダイジェストと provenance の内容。参照先を写した際に contributions のみの plugin の性質を考慮していなかった）
- **Planned fix**: provenance に記録するダイジェストを「ペイロードのファイル＋投影の `contributions/**`」に広げる。導入先のファイルとの一致判定（`installedPayloadEntries`）は従来どおりペイロードのファイルだけ。`tests/installer.test.ts` に「contribution を変えて再実行すると合成し直す（Changed 1）。さらにもう 1 回は Changed 0」を足す。README（ルート ja / en とプラグイン ja / en）の `--update` と `Changed 0` の説明をそろえ、`code-summary.md` の該当判断を更新する
- **Estimated impact**: effort 約 30 分（修正とテスト 15 分、見直し 5 分、サンドボックスでの再確認 5 分。ライブ確認の再実行は不要）、financial cost 0、risk 低（判定条件を 1 つ広げるだけ。参照先との差は README に明記）
- **Human decision**: Retry with fix（2026-09-04）
