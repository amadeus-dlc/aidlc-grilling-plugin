# 性能テスト手順 — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

このプラグインに応答時間やスループットの要求は無い（NFR 要求のステージは plugin-dev スコープでは実行しない）。性能に関する測定可能な目標は、要求一覧の NFR1「CI の所要時間は 15 分以内」だけである。入力: `../code-generation/code-generation-plan.md`（NFR1 の言及）、`../code-generation/unit-test-instructions.md`。

## 目標

| ID | 目標 | 出典 |
|---|---|---|
| NFR1 | CI 全体（依存インストール → 型検査 → 一致検査 → `bun test` → validate → 7 build）が `timeout-minutes: 15` 内に終わる | `requirements.md` NFR1、`.github/workflows/ci.yml` |

## 測り方

```bash
cd grilling
time (bunx tsc --noEmit && bun scripts/sync-contributions.ts --check && bun test && bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts . && for h in claude codex copilot cursor kiro kiro-ide opencode; do bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . "$h"; done)
```

- ローカルの実測値を CI の上限と比べる（CI の ubuntu-latest はローカルより遅いことがあるため、ローカルで 5 分を超えたら要注意）
- `bun test` の内訳（compose の Claude / Kiro、plugin-test、installer の e2e）は `bun test` の出力の所要時間で見る
- ライブ確認（`bun run test:live`）と選択キー環境の確認（opt-in）は CI に含めないので、この測定にも含めない

## 合否

- 上記の合計が 15 分を大きく下回る（目安: ローカル 1 分以内）
- 超えた場合は、遅いテスト（compose や plugin-test）を特定して報告する。CI の timeout を伸ばす対処は取らない（目標を緩めない）
