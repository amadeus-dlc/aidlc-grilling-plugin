<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-09-04T11:25:00Z — Test Strategy は Standard なので手順書は統合テストだけでよいが、directive の produces に性能・セキュリティの手順書も含まれるため、NFR1（CI 15 分）を性能の目標、NFR6（インストーラの安全性）と依存ゼロをセキュリティの目標として短い手順書を書いた。無いものを作らず、この作業に実在する目標だけを載せた
- 2026-09-04T11:25:00Z — 人の指示「最終的にサンドボックスで検証」は、(a) `../grilling-sandbox`（リポジトリの隣）を `aidlc-workflows/dist/claude` から作り直して新しいインストーラで導入し、配布側の合成チェックと doctor を通す、(b) `bun run test:live` が自前で作る使い捨て install で Claude Code を実走する、の 2 つで満たすと解釈した。(b) のテストは install 先を外から差し替えられないため、同じ dist/claude から作った 2 つ目のサンドボックスになる

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-09-04T14:15:00Z — Loop-back 2 の結果: 修正後のサンドボックス再確認で `Changed 0`（provenance は contributions 込みのダイジェスト）、plugin-test CLEAN、28 ステージに新しい断片、doctor 50 項目合格。CI 相当の列は 44 pass / 0 fail、4.9 秒。全目標 Met で成功
- 2026-09-04T13:20:00Z — Loop-back 2: サンドボックス検証で、断片を変えた後の `install.ts --from` が `Changed 0` で合成を省く欠陥（T16）。人が「Retry with fix」を選び、code-generation へ戻って provenance のダイジェストに contributions を含める修正とテストを入れる（test-results.md の Loop-Back Log 2）。Loop-back 1（ライブ確認の印の置き場所）は 2 回目の実走で解消済み
- 2026-09-04T11:40:00Z — Loop-back 1: ライブ確認で `(Recommended)` が label ではなく description に付き（6 問中 5 問）、BR10.4 / BR10.5 の検査が fail。ラウンド方式そのものは規則どおり動いた。人が「Retry with fix」を選び、code-generation へ戻って断片の描画規則を label と明示する修正を入れてからライブ確認をやり直す（test-results.md の Loop-Back Log 1 と同じ内容）

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-09-04T11:25:00Z — 0.2.0 の公開（`release.ts 0.2.0`）はこのステージでは実行しない。リリースツールの事前検査が `main` ブランチと clean な worktree を要求するため、今回の変更をコミットして PR をマージした後にしか実行できない。要求 FR5.4 は「マージ後の作業」として承認ゲートで明示する

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-09-04T13:10:00Z — サンドボックスでの再確認で見つけた欠陥: 断片テンプレートを変えた後の `install.ts --from` が `Changed 0` で合成を省く（変更なし判定が contributions を数えない。grilling は contributions しか持たないので変更を検出できない）。compose hook 自体は内容ベースで置き換える。対処案は「投影の `contributions/**` を provenance のダイジェストに含める（ファイル側の一致判定は従来どおり）＋ テスト追加」。人の判断を halt-and-ask で仰ぐ
