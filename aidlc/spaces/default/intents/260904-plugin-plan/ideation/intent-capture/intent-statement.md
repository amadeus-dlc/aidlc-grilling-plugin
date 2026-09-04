# 意図ステートメント — Grill me プラグイン計画の完了

## Problem Statement（解決したい問題）

- 依頼は計画書 `docs/plugin-plan.md` の指定で始まっており、この作業の対象はその計画書である [desc]
- 計画書の残項目（未実施の検証・ライブ確認・ドキュメントなど）が仕上がっておらず、Grill me プラグインが「完了」の状態になっていない。何が残っているかはこの後の要求整理で洗い出す [Q1]
- 計画書を書いた後の実装の到達状況を整理し、plugin-dev の最初の実タスクとして計画書を通し切ることが求められている [Q4]

## Target Customer（誰のために）

- 利用者は AI-DLC v2 を使う開発者全般（7 ハーネスの利用者）であり、Grill me は配布物として仕上げる [Q2]
- 得られる恩恵は、計画書が「完了」に到達し、配布できる状態の Grill me が手に入ること [Q1] [Q2]

## Success Metrics（成功の定義）

| # | 指標 | 判定方法 | Source |
|---|------|----------|--------|
| 1 | 計画書 §8 の 1〜5 に相当する自動検証（validate・build・テスト・冪等な compose）がすべて通る | 各検証の実行結果が成功で終わる | [Q3] |
| 2 | 計画書 §8-6 のライブ確認で、Claude Code と番号付きプローズ系ハーネス 1 つにおいて 4 択＋Grill me の挙動が確認できる | 2 ハーネスでのライブ確認の記録 | [Q3] |
| 3 | 実プロジェクトで Grill me を 1 ステージ分使い切り、質問ファイルと監査記録が毎問更新される | 使い切ったステージの質問ファイルと監査記録を確認する | [Q3] |

## Initiative Trigger（なぜ今）

- plugin-dev スコープが出来たので、その最初の実タスクとして計画書を通したいことがきっかけである [Q4]

## Initial Scope Signal（スコープの手がかり）

- workflow-selected: このワークフローは `plugin-dev` スコープを選択して開始された [scope]
- 利用者が確認した作業範囲: plugin-dev（10 ステップ、運用フェーズなし）と一致しており、設計ステップを外す・practices-discovery を足す・別の進め方に変える、のいずれも選ばれていない [Q7]
- 成果物には `docs/`（計画書やライブ確認ノート）の更新と README（ja / en）への反映が含まれる [Q6]

## Assumptions & Open Questions

None.

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-04T05:33:23Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | aidlc/spaces/default/intents/260904-plugin-plan/ideation/intent-capture/stakeholder-map.md > Decision-makers vs Influencers 表「影響者として選ばれなかったもの」行 | Q5 では選択肢 B（上流 aidlc-workflows の互換性を影響者に含める）と D（B と C の両方）が用意されていたが、人間は C のみを選んだ。それを本表は「影響者として扱う選択はされていない」と明示的に書き下ろしている。これは未選択の選択肢を明示的な除外へと変換しており、グラウンディング契約の「未選択の選択肢を除外や要件に変換してはならない」に抵触しうる。計画書 (`docs/plugin-plan.md`) 自体が言及する上流互換性の制約が、下流の要求整理・設計ステージで見落とされるリスクがある。 | この行を削除するか、「今回は影響者として選ばれなかった（今後の要求整理で再検討可）」といった、除外ではなく未確認である旨のニュアンスに書き換える。あるいは `## Assumptions & Open Questions` に `[assumption]` として移す。 | New |
| R-02 | Minor | aidlc/spaces/default/intents/260904-plugin-plan/ideation/intent-capture/intent-statement.md > Initial Scope Signal | 「plugin-dev（10 ステップ、運用フェーズなし）と一致しており」という具体的な構造の記述が `[Q7]` としてタグ付けされているが、この詳細（10 ステップ・運用フェーズなしという事実）は質問文の地の文（ステージが用意した説明）に由来し、人間が確認した回答本文（「A. 一致する — plugin-dev のまま進める」）自体には含まれていない。claim-sources センサーはタグの構造的な解決のみを見るため機械的には通るが、この特定の事実的主張がユーザー確認を経たものかどうかは人間による確認が望ましい。 | 「plugin-dev（10 ステップ、運用フェーズなし）」の詳細な言い回しをタグから外すか、`[scope]` の記述（ワークフロー選択スコープの構造）として位置づけを明確にする。 | New |
| R-03 | Minor | aidlc/spaces/default/intents/260904-plugin-plan/ideation/intent-capture/intent-statement.md > Success Metrics 表 #2 | 「ライブ確認で…4 択＋Grill me の挙動が確認できる」という成功指標は、判定方法の列に「2 ハーネスでのライブ確認の記録」とあるものの、その記録がどのような形式・場所（例: `docs/` 配下のノートか、audit ログか）で残るかまでは定義されていない。後続の要求整理ステージで具体化されなければ、検証可能性がやや弱いままになる。 | 要求整理ステージで、ライブ確認の記録形式・保存場所・受け入れ基準を具体化する。 | New |

### Summary

Sources register とグラウンディング契約はおおむね遵守されており、成果物内の実質的な主張はすべて許可されたソースタグ（[desc]／[Q<n>]／[scope]）で裏付けられている。唯一の懸念は stakeholder-map.md の「影響者として選ばれなかったもの」行で、未選択の選択肢を明示的な除外として書き下ろしている点（R-01）。Critical な欠落はなく、Major は 1 件のみで人間が判断できる範囲のため READY とする。
