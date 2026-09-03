# チームナレッジ（aidlc-shared）

このディレクトリは `aidlc/spaces/default/knowledge/aidlc-shared/` ——すべてのエージェントが読む、チーム自身が育てる設計ノウハウの置き場。フレームワーク同梱の `.claude/knowledge/` とは別物。

規則そのもの（何をしてよく、何をしてはいけないか）は `aidlc/spaces/default/memory/project.md` の `## Mandated` に置き、ここには「なぜそうなのか」「どう作るのか」「どこで転ぶのか」を書く。両者が食い違ったら memory が勝つ。

出発点として、姉妹プラグイン [aidlc-deep-spec-analysis-plugin](https://github.com/amadeus-dlc/aidlc-deep-spec-analysis-plugin) の `knowledge/aidlc-shared/` から、このリポジトリにも当てはまるものを 2026-09-03 にコピーした（各ファイル冒頭に出典を記載）。形式検証バックエンドの運用ノウハウ（`formal-verification-ops.md`）は grilling に関係しないので持ち込んでいない。

| ファイル | 内容 | 主な読み手 |
|---|---|---|
| `domain-modeling.md` | Tell-Don't-Ask 全数反転で確立したドメインモデリングの型——commandable class・ドメインプリミティブ・不変条件としての検査・published language とアーキテクチャゲート。`grilling/src/` を DDD のマルチパッケージ構成で組むときの型 | architect / developer / architecture-reviewer |
| `aidlc-engine-operations.md` | エンジン（aidlc-workflows）とシェル（`.claude/`）の更新手順、プラグインの再 compose、検証の正しい信号、実サンドボックス実射の型 | delivery / developer / pipeline-deploy |
| `src-layout.md` | deep-spec-analysis の `src/` から整理した構成の型——コンテキスト × 層の workspace パッケージ、依存方向の強制（isolated linker・sanctioned edges）、各層の住人、`tools/` を生成物にする出荷、19 のアーキテクチャ規則。`grilling/src/` を設計するときの参照 | architect / developer / architecture-reviewer |

このリポジトリ固有の実測記録:

- `docs/plugin-plan.md`（要求と計画）
- `docs/live-check-2026-09-03.md`（headless / Agent SDK でのライブ確認と、そこで見つかった欠陥の是正）
- `grilling/tests/live-claude.test.ts`（Agent SDK 経由のライブテスト。`bun run test:live`）

追記するときは、実測か裁定に裏づけられたことだけを書く。仮説は「仮説」と明記する。
