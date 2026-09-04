# 統合テスト手順 — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

Test Strategy は Standard（`aidlc-state.md`）。単体テストは `../code-generation/unit-test-instructions.md` のとおり Code Generation で用意済み。ここでは構成要素どうしの境界と、実際の AI-DLC install に対する結合を検証する。入力: `../code-generation/code-generation-plan.md`、`../code-generation/code-summary.md`。

## 境界の一覧

| 境界 | 何を確かめるか | 手段 |
|---|---|---|
| 断片 → compose（Claude / Kiro の install） | 28 ステージの anchor に断片が入り、drop が無く、2 回目が byte 同一 | `tests/plugin.test.ts`（既存。`bun test` に含まれる） |
| 投影 → `aidlc-plugin-test.ts`（配布側の合成チェック） | 使い捨て Claude install で `Changed files (28) / Drops: 0 / Idempotent second compose: true` | `tests/plugin.test.ts`（既存）と、下記のサンドボックス検証 |
| インストーラ → 使い捨て install | `--from` で 28 ステージに断片、`--dry-run` 無変更、2 回目 `Changed 0`、provenance 5 項目 | `tests/installer.test.ts`（`bun test` に含まれる） |
| リリースツール → git | 事前検査と変更順序（注入した git で） | `tests/release.test.ts` |
| 選択キー環境（NG1） | `plugins: ["aidlc","grilling"]` で合成される | `GRILLING_SELECT_KEY_CHECK=1 bun test tests/select-plugins.test.ts`（opt-in） |
| 断片 → Claude Code の実走（Grill me の新方式） | 画面 1 に 4 択、画面 2 に 2〜4 問（先頭が (Recommended)）、画面 3 は 4 問以下、帳簿と監査 | `bun run test:live`（opt-in。Claude Code のログインが必要） |

## サンドボックス検証（人の指示「最終的にサンドボックスで検証」）

`../grilling-sandbox` を使い捨ての AI-DLC install として作り直し、新しいインストーラで導入して、配布側の合成チェックと doctor を通す。

```bash
# 1. サンドボックスを作り直す（gitignore 済み。リポジトリの外）
rm -rf ../grilling-sandbox
mkdir -p ../grilling-sandbox
cp -R aidlc-workflows/dist/claude/. ../grilling-sandbox/

# 2. 新しいインストーラで導入（--from はリポジトリのルート）
bun grilling/scripts/install.ts --project ../grilling-sandbox --from . --harness claude
#    期待: Changed 1（compose）、案内 2 点、provenance が ../grilling-sandbox/.claude/tools/data/grilling-install.json に 5 項目

# 3. 2 回目は何もしない
bun grilling/scripts/install.ts --project ../grilling-sandbox --from . --harness claude
#    期待: Changed 0

# 4. 配布側の合成チェック
bun aidlc-workflows/core/tools/aidlc-plugin-test.ts grilling --install ../grilling-sandbox --harness claude
#    期待: Plugin test: CLEAN、Changed files (28)（または導入済みなら 0）、Drops: 0、Idempotent second compose: true

# 5. doctor の「Composed plugin surface」
cd ../grilling-sandbox && bun .claude/tools/aidlc-utility.ts doctor
#    期待: 失敗 0。Composed plugin surface に grilling の 28 ステージが見える
```

## Claude Code の実走（ライブ確認）

```bash
cd grilling
bun run test:live            # = AIDLC_CLAUDE_SDK_LIVE=1 bun test tests/live-claude.test.ts
```

- 使い捨て install は テスト自身が `aidlc-workflows/dist/claude` から mkdtemp に作る（`AIDLC_KEEP_TEMP=1` で残る）。Claude Code のログイン（`CLAUDE_CONFIG_DIR`、既定 `~/.claude`）を使い、同梱の Bedrock 既定は `settings.local.json` で無効化する。モデルは `GRILLING_LIVE_MODEL`（既定 sonnet）
- 検証項目: 画面 1 の 4 択と description の逐語一致、画面 2 の質問数 2〜4 と各先頭 `(Recommended)`、画面 3 の質問数 4 以下と各先頭 `(Recommended)`、質問ファイルの `[Answer]:` と `**Mode:** grill`、監査の Options / QUESTION_ANSWERED / DECISION_RECORDED ≥ 3
- テストが印字するメニューを人が読み、同じ画面の質問どうしが独立だったか（片方の答えでもう片方が変わらないか）を判断して `docs/live-check-<日付>.md` に書く（BR10.7）
- 所要: 5〜15 分、数ドル

## 合否

- `bun test`（Claude / Kiro の compose、plugin-test、installer、release）が 0 fail
- サンドボックス検証の 1〜5 が期待どおり
- ライブ確認の 4 テストが pass し、記録が `docs/` にある

## テストデータと環境

- 使い捨て install は毎回 `aidlc-workflows/dist/claude` からコピーして作る。既存のサンドボックスは消してよい（リポジトリの外、gitignore 済み）
- ライブ確認は実際の Claude Code のセッションを使うため、ネットワークとログインが必要。CI では走らない（opt-in）
