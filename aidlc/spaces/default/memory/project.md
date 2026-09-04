# Project-Level Rules

> Project-specific specialisation and corrections. Loaded after `org.md` and
> `team.md` as strict-additive guidance; contradictions with broader policy
> are rejected. Populated by practices-discovery and the self-learning loop.
>
> Use sparingly: most teams don't need a project layer. Reach for it
> only when this specific project needs stable, durable guidance beyond the
> team practice (for example, package-specific release checks or an additional
> regression suite for a legacy component).

## Way of Working

<!-- Project-specific specialisation. Example: -->
<!-- This monorepo requires package-scoped branch names and a package owner -->
<!-- review in addition to the team's normal merge policy. -->

## Walking Skeleton

<!-- Project-specific specialisation. Example: -->
<!-- The walking skeleton must exercise the legacy service adapter as well -->
<!-- as the new service boundary. -->

## Testing Posture

<!-- Project-specific specialisation. -->

## Deployment

<!-- Project-specific specialisation. -->

## Code Style

<!-- Project-specific specialisation. -->

## Tech Stack

<!-- Technology choices locked for this project. -->

## Decided

<!-- Decisions made in earlier stages that should not be re-asked. -->
<!-- Format: DECIDED: [decision] (Stage [slug], [date]) -->

## Scope Overrides

<!-- Custom scope rules for this project. -->

## Forbidden

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: NEVER [behavior] (affirmed [date]) -->
<!-- Example: NEVER throw exceptions across service layer boundaries (affirmed 2026-05-17) -->

## Mandated

<!-- Populated by practices-discovery affirmation gate. -->
<!-- Format: ALWAYS [behavior] (affirmed [date]) -->
<!-- Example: ALWAYS use Result<T,E> for fallible operations in service layer (affirmed 2026-05-17) -->

## Corrections

<!-- Project-specific corrections from human feedback. -->
<!-- Format: NEVER/ALWAYS [behavior] (learned [date]) -->
- Grill me と AI-DLC の Depth の対応は、質問数の上限ではなく決定の解像度で取る: 決定を XL / L / M / S / SS に分け、Minimal は XL・L、Standard は M まで、Comprehensive は S まで人に聞き、SS は常にエージェントが決める。閾値以下の決定は推奨回答で決めて「決めた前提」として質問ファイルに明示し、consolidated summary で一括確認する (learned 2026-09-04) <!-- cid:260904-plugin-plan:requirements-analysis:79ab1f56da57b08f8c8eaeeabc8ba935f7e28f2436953fdff90cb1021b4f752c -->
- grilling プラグインの合成検証とライブ確認は当面 Claude Code のみを対象にする（intent 260904-plugin-plan の Q1・Q2 で人が決定。意図の成功指標 2「番号付きプローズ系ハーネス 1 つ」は上書き済み）。他の 6 ハーネスは今後の課題として計画書の完了記録に残す (learned 2026-09-04) <!-- cid:260904-plugin-plan:requirements-analysis:03bfcdeb43ba613ac934b11c14656b70f94e5255ed0b54113ccf2f6af755c131 -->
- レビュー依頼と承認ゲートのコマンドに限り `AIDLC_SKIP_SUMMARY_CONFIRMATION_GUARD=1` を付けて「確認済みの検査」を切った（人の許可あり）。理由: Unit を切らない plugin-dev スコープでは、Unit ごとのステージ（functional-design）の成果物がステージ直下 `construction/functional-design/` に置かれるが、検査は `construction/<unit>/functional-design/` しか探さず質問ファイルを見つけられない（aidlc-workflows v2.7.0 の見落とし）。確認（Looks correct）の記録自体は残っている。フレームワークは書き換えない。上流への報告事項として計画書の完了記録（残の課題）に転記する (learned 2026-09-04) <!-- cid:260904-plugin-plan:functional-design:93a12459d45e5c5718f1cdc36c299a092b70776713425d2e633c398d6fb133a0 -->
- ラウンドと「決めた前提」の見出しは会話言語で描画する（固定トークンにしない）と解釈した。ツールもテストも読まない見出しであり、`**Mode:** grill` と `(Recommended)` だけがテストの読む固定トークン (learned 2026-09-04) <!-- cid:260904-plugin-plan:functional-design:f9a6f5ae2c0cd7fe48dd7637c11fc1a5af4f96166045496e4abcdaacb3eb2885 -->
- ステージ定義の Step 4「計画のチェックボックスを完了のたびに更新する」を、最初の依頼（Step 1〜7）の後は行わないことにした。承認ガード（aidlc-plan-approval-guard）は計画ファイルの bytes を指紋に含めるため、チェックを付けた瞬間に承認が失効し、以後のワークスペース書き込みが全部拒否される。Step 1〜7 のチェックで一度失効し、`next` で directive を出し直して人に再承認してもらった（PLAN_APPROVAL_BLOCKED 3 件が監査に残る）。以後の依頼では計画ファイルを触らず、完了ステップは返答で受け取り、最後に一括でチェックを付ける。ステージ定義とガードの不整合はフレームワーク側の課題として計画書の完了記録に転記する (learned 2026-09-04) <!-- cid:260904-plugin-plan:code-generation:84f09c016697438696b9f0bd114c9121ee39bb97f5dc27b56e612990b895632a -->
- Loop-back 2（Build and Test から戻り）: サンドボックスで断片を変えた後の `install.ts --from` が `Changed 0` で合成を省く欠陥（provenance のダイジェストが contributions を数えない。参照先を写した際に contributions のみの plugin の性質を見落とした）。Step 20 として provenance のダイジェストに投影の contributions を含める修正とテストを入れる。人に再承認してもらう（4 回目の Plan Approval） (learned 2026-09-04) <!-- cid:260904-plugin-plan:code-generation:85cc044f2b0301f8bfbc799ca3608a0cba33719d0e32caa84acefd590d4a0ab2 -->
- 人の指示「最終的にサンドボックスで検証」は、(a) `../grilling-sandbox`（リポジトリの隣）を `aidlc-workflows/dist/claude` から作り直して新しいインストーラで導入し、配布側の合成チェックと doctor を通す、(b) `bun run test:live` が自前で作る使い捨て install で Claude Code を実走する、の 2 つで満たすと解釈した。(b) のテストは install 先を外から差し替えられないため、同じ dist/claude から作った 2 つ目のサンドボックスになる (learned 2026-09-04) <!-- cid:260904-plugin-plan:build-and-test:54a8eca9e4c0f25c555b3a4b2a8fd909405cc34bd65ea79ed90095c9c049084f -->
- 0.2.0 の公開（`release.ts 0.2.0`）はこのステージでは実行しない。リリースツールの事前検査が `main` ブランチと clean な worktree を要求するため、今回の変更をコミットして PR をマージした後にしか実行できない。要求 FR5.4 は「マージ後の作業」として承認ゲートで明示する (learned 2026-09-04) <!-- cid:260904-plugin-plan:build-and-test:64d2def5fc67655590b71fa5de20a7bc5fe53c3f2b516dd85dd1d3a597fea75f -->
