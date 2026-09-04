<!-- INVARIANT: examples are single-line HTML comments so a fresh template parses to total=0 (MEMORY_EMPTY). Do NOT un-comment or split across lines. t100 guards this. -->
> This file is kept up to date automatically while the stage runs. Add observations at the review step, not by editing here directly.

## Interpretations
<!-- example: 2026-05-29T10:14:32Z — chose REST over GraphQL; the consuming team only needs CRUD, revisit if subscriptions land -->
- 2026-09-04T10:19:24Z — 承認済み計画 18 ステップの実装を、開発者役への 3 回の順次依頼（Step 1〜7 断片とテスト、Step 8〜12 インストーラ・リリース・CI、Step 13〜17 文書と全体確認）に分けた。1 回の依頼に全部を載せると turn 上限で途中終了する恐れがあるため。各依頼の先頭には同じ承認マーカー（AIDLC-STAGE / AIDLC-TESTING-CONTRACT）を付け、同じ計画ファイルのチェックを更新させる
- 2026-09-04T10:19:24Z — Testing Contract の 5 層（データモデル / データアクセス / ビジネスロジック / API / フロントエンド）はこのプラグインには当てはまらないので、「ビジネスロジック」を断片テンプレート・インストーラ・リリースツールの 3 つと読み替え、それぞれ実装 → テストの順（test-after）にした

## Deviations
<!-- example: 2026-05-29T10:14:32Z — skipped the optional caching layer the stage prose suggested; the dataset is small enough that it adds risk -->
- 2026-09-04T13:20:00Z — Loop-back 2（Build and Test から戻り）: サンドボックスで断片を変えた後の `install.ts --from` が `Changed 0` で合成を省く欠陥（provenance のダイジェストが contributions を数えない。参照先を写した際に contributions のみの plugin の性質を見落とした）。Step 20 として provenance のダイジェストに投影の contributions を含める修正とテストを入れる。人に再承認してもらう（4 回目の Plan Approval）
- 2026-09-04T11:45:00Z — Loop-back 1（Build and Test から戻り）: ライブ確認でモデルが `(Recommended)` を label ではなく description に付けたため、断片の Rendering 段落だけを「印は option の label に付ける」と明示する形に直す（Step 19）。テストと BR2.2 は変えない。計画には Step 19 を足し、人に再承認してもらった（3 回目の Plan Approval）
- 2026-09-04T10:40:00Z — ステージ定義の Step 4「計画のチェックボックスを完了のたびに更新する」を、最初の依頼（Step 1〜7）の後は行わないことにした。承認ガード（aidlc-plan-approval-guard）は計画ファイルの bytes を指紋に含めるため、チェックを付けた瞬間に承認が失効し、以後のワークスペース書き込みが全部拒否される。Step 1〜7 のチェックで一度失効し、`next` で directive を出し直して人に再承認してもらった（PLAN_APPROVAL_BLOCKED 3 件が監査に残る）。以後の依頼では計画ファイルを触らず、完了ステップは返答で受け取り、最後に一括でチェックを付ける。ステージ定義とガードの不整合はフレームワーク側の課題として計画書の完了記録に転記する

## Tradeoffs
<!-- example: 2026-05-29T10:14:32Z — picked TDD over BDD this run; the team is unit-first and the domain is well-understood -->
- 2026-09-04T11:20:00Z — インストーラのテストは 10 件で Standard の目安（5〜8）を 2 件超えた。参照先の「toolchain 欠落で対象に触れない」「ダイジェストの順序」を落とすより、参照先と同等の検査を保つ方を優先した
- 2026-09-04T11:20:00Z — 選択子（--from / --ref / --tag）の併用は参照先のように優先順で黙って解決せず失敗にした（BR8.2）。参照先からの唯一の挙動差で、README の表に明記した
- 2026-09-04T11:20:00Z — README の Install は raw URL も `VERSION=v0.2.0` でタグ固定にした（参照先の「ブートストラップとソースを同じ不変タグから取る」意図）。v0.2.0 を公開するまで README の例は 404 になるが、公開は同じ完了作業（Build and Test）の中で行う

## Open questions
<!-- example: 2026-05-29T10:14:32Z — confirm the retention window with compliance before the next stage hardens the schema -->
- 2026-09-04T10:45:00Z — 人の指示「最終的にサンドボックスで検証してね」: Build and Test では、使い捨て install `../grilling-sandbox` を `aidlc-workflows/dist/claude` から作り直し、新しい `install.ts --from` で導入し、`aidlc-plugin-test.ts --install ../grilling-sandbox` と `bun run test:live`（Agent SDK で実走）をそのサンドボックスに対して通し、結果を `docs/live-check-<日付>.md` に残す。これを完了の条件に加える
