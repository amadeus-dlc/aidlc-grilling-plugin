# 横断の追跡表（最終カバレッジ）— Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

要求一覧 `../../inception/requirements-analysis/requirements.md` の FR / NFR を列挙し、Code Generation の追跡表 `../code-generation/traceability.json`（ステージ直下。Unit は切らない）で `OK` かつ target が実在するかを確かめた。入力: `../code-generation/code-generation-plan.md`、`../code-generation/code-summary.md`。

## 判定

**FAIL（未カバー 1 件）** — FR1.2、FR1.3、FR5.4 は Code Generation の追跡表で `Deferred`（この Build and Test と、マージ後の作業に先送り）。FR1.2 と FR1.3 はこのステージで充足した（下表）。FR5.4（0.2.0 の公開）だけがマージ後の作業として残り、承認ゲートで所見として提示する。

## 要求ごとのカバレッジ

| ID | 状態 | 担当ステージ | target（実在を確認） | 備考 |
|---|---|---|---|---|
| FR1 | OK | code-generation | `grilling/tests/plugin.test.ts` | |
| FR1.1 | OK | code-generation | `.github/workflows/ci.yml` | CI 相当の列は green（4.5 秒） |
| FR1.2 | OK（このステージで充足） | build-and-test | `docs/live-check-2026-09-04.md` | 新方式のライブ確認を 2 回実走（1 回目 2 件 fail → Loop-back 1 → 2 回目 5 pass / 0 fail）。記録に画面・帳簿・独立性の判断 |
| FR1.3 | OK（このステージで充足） | build-and-test | `docs/plugin-plan.md` §11 | 旧記録（2026-09-03）と新記録（2026-09-04）の所在と集計を記入 |
| FR1.4 | OK | code-generation | `grilling/tests/live-claude.test.ts` | |
| FR2 / FR2.1 / FR2.2 / FR2.3 | OK | code-generation | `docs/plugin-plan.md` | |
| FR3 / FR3.1 / FR3.2 / FR3.3 | OK | code-generation | `README.md` | |
| FR3.4 | OK | code-generation | `LICENSE` | |
| FR4 / FR4.1 / FR4.2 / FR4.3 | OK | code-generation | `grilling/scripts/install.ts` | サンドボックス検証で実走 |
| FR4.4 | OK | code-generation | `grilling/tests/installer.test.ts` | |
| FR5 / FR5.1 | OK | code-generation | `grilling/scripts/release.ts` | |
| FR5.2 | OK | code-generation | `.github/workflows/ci.yml` | |
| FR5.3 | OK | code-generation | `grilling/tests/release.test.ts` | |
| FR5.4 | **未カバー（Deferred → マージ後）** | 人（マージ後） | `bun grilling/scripts/release.ts 0.2.0` | `main` と clean な worktree が必要なため、PR マージ後に実行 |
| FR6 / FR6.1 | OK | code-generation | `grilling/docs/decisions.md` | |
| FR6.2 | OK | code-generation | `mise.toml` | |
| FR6.3 | OK | code-generation | `renovate.json` | |
| FR6.4 | OK | code-generation | `grilling/README.md` | |
| FR7 | N/A | — | NG1 へ移動（`grilling/docs/decisions.md` に結果を記録） | |
| FR8 / FR8.1〜FR8.7 | OK | code-generation | `grilling/tests/fragment-template.md` | ライブ確認でラウンド方式の動作を確認 |
| NFR1 | OK | code-generation | `.github/workflows/ci.yml` | 4.5 秒 |
| NFR2 | OK | code-generation | `grilling/tests/installer.test.ts` | サンドボックスでも `Changed 0` |
| NFR3 | OK | code-generation | `README.ja.md` | |
| NFR4 | OK | code-generation | `grilling/package.json` | |
| NFR5 | OK | code-generation | `grilling/scripts/install.ts` | |
| NFR6 | OK | code-generation | `grilling/tests/installer.test.ts` | |

AC（ユーザーストーリー）はこのスコープでは作っていないため対象外。

## 未カバーの要素

1. FR5.4 — 0.2.0 の公開はマージ後の作業（`release.ts` が `main` と clean な worktree を要求するため、ステージ内では実行できない）
