# Build and Test の要約 — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

入力: `../code-generation/code-generation-plan.md`（Testing Contract: test-after / Standard / plugin-dev）、`../code-generation/unit-test-instructions.md`、`../code-generation/code-summary.md`。結果の詳細は `test-results.md`。

## ビルドの状態と前提

- ビルド（型検査、28 contribution の一致検査、validate、7 ハーネスの投影）: すべて成功。手順は `build-instructions.md`
- 前提: bun 1.3.13、submodule `aidlc-workflows`、devDependencies 3 つ。実行時依存とネットワークは不要

## テストの種類

| 種類 | 手順書 | 生成の理由 |
|---|---|---|
| 単体（Code Generation で作成済み） | `../code-generation/unit-test-instructions.md` | ContributionOverlay 23 件、Installer 10 件、ReleaseTool 8 件 |
| 統合 | `integration-test-instructions.md` | Standard 戦略。compose / plugin-test / installer e2e の境界、サンドボックス検証、Claude Code の実走 |
| 性能 | `performance-test-instructions.md` | NFR1（CI 15 分）だけが測定可能な目標 |
| セキュリティ | `security-test-instructions.md` | NFR6（インストーラの安全性）、NFR4（依存ゼロ）、リリースの事前検査、CI のタグ検査 |

## カバレッジの期待

plugin-dev スコープにカバレッジの数値目標は無い（Testing Contract の scope_floor は「既存スイート green」のみ）。新設コンポーネントは 5〜8 件（Standard）。

## Target Verification Matrix

| Target ID | Source | Expected | Actual | Evidence | Owning Stage | Verdict |
|---|---|---|---|---|---|---|
| T1 | Testing Contract scope_floor | 既存スイート green | 43 pass / 0 fail | `test-results.md` 単体テスト | build-and-test | Met |
| T2 | Testing Contract strategy_volume | 新設コンポーネント 5〜8 件 | Installer 10、ReleaseTool 8 | `tests/installer.test.ts`、`tests/release.test.ts` | build-and-test | Met |
| T3 | requirements.md NFR1 | CI 15 分以内 | 4.5 秒（ローカル） | `test-results.md` 性能 | build-and-test | Met |
| T4 | requirements.md NFR2 | 再実行が `Changed 0` | 2 回目 `Changed 0`、idempotent true | `test-results.md` サンドボックス検証 | build-and-test | Met |
| T5 | requirements.md NFR4 | 実行時依存ゼロ | dependencies 無し | `grilling/package.json` | build-and-test | Met |
| T6 | requirements.md NFR5 | provenance にダイジェスト、同じソースで一致 | 5 項目、一致 | provenance ファイル | build-and-test | Met |
| T7 | requirements.md NFR6 | symlink を追わない・外へ書かない・認証情報なし | 該当テスト pass | `tests/installer.test.ts` | build-and-test | Met |
| T8 | rules.md BR10.2 | 断片テンプレート 150 行以内 | 139 行 | `tests/plugin.test.ts` | build-and-test | Met |
| T9 | rules.md BR10.3 | 画面 1 が 4 択・description 逐語 | pass | `docs/live-check-2026-09-04.md` | build-and-test | Met |
| T10 | rules.md BR10.4 | 画面 2 に 2〜4 問、各先頭 label に `(Recommended)` | 2 回目: 4 問、各先頭 label に印（1 回目は description で Not Met → Loop-back 1 で解消） | `docs/live-check-2026-09-04.md` 実走 2 回目 | build-and-test | Met |
| T11 | rules.md BR10.5 | 画面 3 は 4 問以下、各先頭 label に `(Recommended)` | 2 回目: 3 問、各先頭 label に印 | `docs/live-check-2026-09-04.md` 実走 2 回目 | build-and-test | Met |
| T12 | rules.md BR10.6 | 帳簿と監査 | pass | `docs/live-check-2026-09-04.md` | build-and-test | Met |
| T13 | rules.md BR10.7 | ライブ確認の記録 | 記録あり | `docs/live-check-2026-09-04.md` | build-and-test | Met |
| T14 | requirements.md NG1（記録のみ） | 選択キー環境で合成される | 28/28、drop 0 | `grilling/docs/decisions.md` | code-generation | Met |
| T15 | 人の指示（サンドボックス検証） | 導入・合成チェック・doctor が通る | すべて通過 | `test-results.md` | build-and-test | Met |
| T16 | requirements.md NFR5 / BR8.7（変更の検出） | contributions が変わったら `install.ts --from` の再実行が合成し直す | Loop-back 2 で修正: 断片変更後の再実行が `Changed 1`、その次は `Changed 0`（テストと実サンドボックスで確認） | `test-results.md` サンドボックス検証（Loop-back 2 の後）、`tests/installer.test.ts` | build-and-test | Met |

## 準備状況

| 観点 | 状態 |
|---|---|
| build-ready | 可（ビルドはすべて成功） |
| test-ready | 可（CI 相当の検査は green、44 pass / 0 fail。ライブ確認は 2 回目で 5 pass / 0 fail。サンドボックス検証はすべて通過） |
| deployment-ready | 可（マージ後の作業として `release.ts 0.2.0`。変更をコミット → PR → CI green → マージ → 公開） |

## 既知の制約と残項目

- **ライブ確認（T10 / T11）は Loop-back 1 で解消**: 1 回目は `(Recommended)` が description に付いた（6 問中 5 問）。断片の Rendering 段落を label と明示する文に直して再実走し、7 問すべて label に印が付いた（5 pass / 0 fail）
- **インストーラの変更検出（T16）は Loop-back 2 で解消**: provenance の `payload_sha256` を「投影のペイロードファイル＋contributions」のダイジェストに広げ、断片を変えた後の再実行が合成し直すようになった（テスト 1 件追加、README 4 本を更新）。エンジンの再インストールで合成が消えた場合は provenance も候補も変わらないため検出できず、`/aidlc plugin sync` の再実行が必要（README に明記）
- **0.2.0 の公開（FR5.4）**: `release.ts` は `main` と clean な worktree を要求するため、今回の変更をコミットして PR をマージした後にしか実行できない。ステージ内では実行しない
- **計画書 §11 の新記録の追記（FR1.3）**: ライブ確認が green になった時点で `docs/plugin-plan.md` に新記録の所在と集計を書く
- 他 6 ハーネスの検証と番号付きプローズ系のライブ確認は対象外（C6。計画書 §12）
- フレームワーク側の制約 2 件（Unit を切らないスコープでの検査、計画チェックで承認が失効）は計画書 §12 に上流への報告事項として記録済み
