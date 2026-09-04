# ビルド手順 — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

入力: `../code-generation/code-generation-plan.md`（承認済み計画と Testing Contract）、`../code-generation/unit-test-instructions.md`（単位ごとのテストコマンド）、`../code-generation/code-summary.md`（作成・変更ファイルと判断）。

このプラグインに「コンパイルして配布する」ビルドは無い。ビルドに当たるのは (1) 型検査、(2) 断片テンプレートから 28 contribution を生成して一致を検査すること、(3) 7 ハーネスの投影（`dist/<harness>/`）を `aidlc-plugin-build.ts` で生成すること、の 3 つ。

## 前提

| 項目 | 値 | 確認方法 |
|---|---|---|
| bun | 1.3.13（`mise.toml` と CI の `setup-bun` が同じ版） | `bun --version` |
| submodule | `aidlc-workflows`（v2.7.0-1-ga277af21。validate / build / compose の道具と `dist/<harness>` を供給） | `ls aidlc-workflows/core/tools/aidlc-plugin-build.ts` |
| 依存 | `grilling/package.json` の devDependencies（`@types/bun`、`typescript`、`@anthropic-ai/claude-agent-sdk`）。実行時依存は無い（NFR4） | `bun install --frozen-lockfile` が `no changes` |
| ネットワーク | 不要（テストもビルドも GitHub に出ない） | — |

環境変数（任意）: `AIDLC_WORKFLOWS_CHECKOUT`（submodule が別の場所にあるとき）、`AIDLC_KEEP_TEMP=1`（テストの一時ディレクトリを残す）。

## 依存のインストール

```bash
cd grilling
bun install --frozen-lockfile
```

## ビルド（CI と同じ順）

```bash
cd grilling
bunx tsc --noEmit                                   # 1. 型検査（scripts/ と tests/）
bun scripts/sync-contributions.ts --check           # 2. 28 contribution がテンプレートと一致
bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts .      # 3. manifest と contribution の検査
for h in claude codex copilot cursor kiro kiro-ide opencode; do    # 4. 7 ハーネスの投影
  bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . "$h"
done
```

テンプレートを編集したときは `bun scripts/sync-contributions.ts`（`--check` なし）で 28 本を再生成してから 2 を実行する。

## ビルドの確認

- 1〜4 がすべて exit 0
- 3 の出力に `Plugin validation: VALID`（warnings 1 件 `compose-hook-absent` は既知の advisory。compose hook は build が投影に付ける）
- 4 の後、`grilling/dist/claude/contributions/` に 28 本、`grilling/dist/claude/hooks/compose.ts` が存在
- `dist/` は gitignore 済み（コミットしない）

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| `aidlc-workflows checkout not found` | submodule 未取得 | `git submodule update --init` |
| `sync-contributions: drift detected` | テンプレートを編集して再生成していない、または contribution を手で編集した | `bun scripts/sync-contributions.ts` で再生成 |
| `bun install` が lockfile を変えようとする | 依存の版がずれた | `--frozen-lockfile` を外さず、`package.json` と `bun.lock` を揃える |
| `tsc` が `scripts/` を見ない | `tsconfig.json` の `include` | `scripts/**/*.ts` が含まれることを確認（含まれている） |
| 投影の build が古い | `dist/<harness>` が前回の残り | `rm -rf grilling/dist` して 4 を再実行 |
