# Intent Capture & Framing — 質問

## Sources

- [desc] Initial description: "docs/plugin-plan.md"
- [scope] Workflow-selected scope: `plugin-dev`.

---

依頼は計画書 `docs/plugin-plan.md`（Grill me プラグイン 計画案）の指定でした。計画書の内容は参考として読みましたが、成果物に載せる事実はここでの回答で確定します。各質問の `[Answer]:` に選択肢の文字（例: `A`）を記入してください。当てはまらない場合は `X` を選び、内容を書き添えてください。

## Q1. この作業で、計画書に対して何を達成したいですか？

計画書は「Grill me」モードを 28 ステージの contribution で追加する案で、このリポジトリには既に `grilling/` として contributions・テスト・README・ライブ確認の記録があります。今回のワークフローの到達点を教えてください。

A. 計画書の残項目を仕上げて「完了」にする（未実施の検証・ライブ確認・ドキュメントなど、何が残っているかは次の要求整理で洗い出す）
B. 既存の `grilling/` を計画書と突き合わせ、計画と実装の乖離（例: 計画は `plugins/grill-me/`、実装は `grilling/`）を洗い出して解消する
C. plugin-dev スコープの試運転（dogfooding）が主目的で、計画書は題材。成果物は副次的でよい
D. 計画書にない新しい能力を Grill me に足す（内容は X で具体的に）
E. Not yet defined（まだ決めていない）
X. Other (please specify)

[Answer]: A

## Q2. Grill me は誰のためのものですか？

計画書 §1 は「全 7 ハーネスで動く」「プラグイン機構で配布する」としています。今回の作業で優先する利用者を教えてください。

A. AI-DLC v2 を使う開発者全般（7 ハーネスの利用者）— 配布物として仕上げる
B. まずメンテナ自身の AI-DLC 利用体験の改善。配布は副次的
C. amadeus-dlc 配下の姉妹プラグイン利用者も含めた内部利用者
D. A を目標にしつつ、今回の作業は B の範囲で止める
E. Not identified（まだ決めていない）
X. Other (please specify)

[Answer]: A

## Q3. 何ができたら「成功」ですか？

計画書 §8 には検証手順（1〜5: validate・package・7 ハーネスの plugin-test・unit test・integration tier、6: ライブ確認）が書かれています。確認できる到達点を選んでください。

A. §8 の 1〜5 に相当する自動検証がすべて通る（validate・build・テスト・冪等な compose）
B. A に加えて、§8-6 のライブ確認（Claude Code と、番号付きプローズ系のハーネス 1 つ）で 4 択＋Grill me の挙動が確認できる
C. B に加えて、実プロジェクトで Grill me を 1 ステージ分使い切り、質問ファイルと監査記録が毎問更新されることを確認する
D. まず A、B / C は段階的に
E. Not yet defined（まだ決めていない）
X. Other (please specify)

[Answer]: C

## Q4. なぜ今、この作業をしますか？

A. 計画書を書いたが実装の到達状況が曖昧で、どこまで済んでいるか整理したい
B. plugin-dev スコープが出来たので、その最初の実タスクとして計画書を通したい
C. Grill me を配布・共有する予定が近い
D. A と B の両方
E. Not applicable（特にきっかけはない）
X. Other (please specify)

[Answer]: B

## Q5. 利害関係者と決定権はどうなっていますか？

Grill me の仕様（4 択の位置、1 問ずつの手順、帳簿の取り方）を最終的に決めるのは誰で、何が制約として効きますか？

A. メンテナ単独が決定者。影響者なし
B. メンテナが決定者で、上流 aidlc-workflows の互換性（プロトコル本文は 3 択のまま、annex の不変条件）が影響者
C. メンテナが決定者で、各ハーネスの制約（例: Claude Code の構造化質問は 4 選択肢が上限）が影響者
D. B と C の両方
E. Not identified（まだ整理していない）
X. Other (please specify)

[Answer]: C

## Q6. 決定や進捗を記録・共有する必要はありますか？

A. None（個人作業。`aidlc/` 配下の記録と成果物で足りる）
B. `docs/`（計画書やライブ確認ノート）を更新して残す
C. B に加えて README（ja / en）にも反映する
D. PR 単位で GitHub 上に判断理由を残す
E. Not yet defined（まだ決めていない）
X. Other (please specify)

[Answer]: C

## Q7. 作るものの境界は、選ばれた進め方と一致していますか？

このワークフローは `plugin-dev`（意図の把握 → 既存構造の把握 → 要求整理 → 構成決定 → 挙動設計 → 実装 → 検証の 10 ステップ。運用フェーズなし）で始まっています。今回の作業範囲もこれと一致していますか？

A. 一致する — plugin-dev のまま進める
B. もっと軽くしたい — 実装は概ね済んでいるので、要求整理と検証を中心にしたい（設計ステップを外す）
C. もっと厚くしたい — 例: practices-discovery を入れてチームの実践（`team.md`）を確定する
D. 進め方自体を変えたい（plugin-dev 以外で進める）
E. Not yet defined（まだ決めていない）
X. Other (please specify)

[Answer]: A

## Consolidated Summary Confirmation

回答のまとめ:

- Q1（目的）= A: 計画書 `docs/plugin-plan.md` の残項目を仕上げて「完了」にする。何が残っているかは次の要求整理で洗い出す
- Q2（利用者）= A: AI-DLC v2 を使う開発者全般（7 ハーネスの利用者）。配布物として仕上げる
- Q3（成功）= C: 計画書 §8 の 1〜5 に相当する自動検証（validate・build・テスト・冪等な compose）がすべて通り、§8-6 のライブ確認（Claude Code と番号付きプローズ系ハーネス 1 つ）で 4 択＋Grill me の挙動が確認でき、さらに実プロジェクトで Grill me を 1 ステージ分使い切って質問ファイルと監査記録が毎問更新されることを確認する
- Q4（きっかけ）= B: plugin-dev スコープが出来たので、その最初の実タスクとして計画書を通す
- Q5（決定権）= C: メンテナが決定者で、各ハーネスの制約（例: Claude Code の構造化質問は 4 選択肢が上限）が影響者
- Q6（記録・共有）= C: `docs/`（計画書やライブ確認ノート）を更新し、README（ja / en）にも反映する
- Q7（境界）= A: 作業範囲は plugin-dev（10 ステップ）と一致。そのまま進める

Does this all look correct before I generate the artifact?

- Looks correct
- Request changes

[Answer]: Looks correct
