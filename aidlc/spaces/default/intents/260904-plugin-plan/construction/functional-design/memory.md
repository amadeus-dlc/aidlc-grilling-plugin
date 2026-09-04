<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-09-04T09:11:11Z — 文書（CompletionRecord / DecisionRecord / LiveCheckRecord）にはルールを付けず、「どの文書に何を書くか」を BR12 の内容方針として書いた。ADR-008 の制約（エンティティにルールや状態機械を持たせない）を守りつつ、FR2・FR3・FR6 の追跡先を GAP にしないため
- 2026-09-04T09:11:11Z — ラウンドと「決めた前提」の見出しは会話言語で描画する（固定トークンにしない）と解釈した。ツールもテストも読まない見出しであり、`**Mode:** grill` と `(Recommended)` だけがテストの読む固定トークン

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-09-04T09:33:30Z — レビュー依頼と承認ゲートのコマンドに限り `AIDLC_SKIP_SUMMARY_CONFIRMATION_GUARD=1` を付けて「確認済みの検査」を切った（人の許可あり）。理由: Unit を切らない plugin-dev スコープでは、Unit ごとのステージ（functional-design）の成果物がステージ直下 `construction/functional-design/` に置かれるが、検査は `construction/<unit>/functional-design/` しか探さず質問ファイルを見つけられない（aidlc-workflows v2.7.0 の見落とし）。確認（Looks correct）の記録自体は残っている。フレームワークは書き換えない。上流への報告事項として計画書の完了記録（残の課題）に転記する

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-09-04T09:11:11Z — 断片テンプレートに 150 行の上限を置いた（BR10.2）。28 ステージすべてに同じ本文が入るため、規則の網羅よりプロンプト予算を優先し、判定文は段階ごとに問いかけ 1 行と例・反例 1 つずつに絞った（Q1=A）

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-09-04T09:11:11Z — ライブ確認（feature スコープ、Standard）の画面 2 に 2 問以上並ぶか（BR10.4）は、モデルが S 以下と判定した決定を除いた後の 1 ラウンド目の大きさに依存する。Build and Test で 1 問しか出なければ、テストの下限か判定文の例を見直す
