---
name: plugin-dev
depth: Standard
keywords: []
description: AI-DLC v2 プラグイン開発 — contributions・manifest・tests を設計付きで作り、validate/build で検証する
skeleton: off
runner: true
---

# plugin-dev scope

このワークスペースで AI-DLC v2 プラグイン（`.aidlc-plugin/plugin.json` と
`contributions/<phase>/<stage>.md` の overlay 断片、bun テスト、drift guard）を
開発するための Standard depth のスコープ。Ideation は intent-capture のみ、
Inception は reverse-engineering → requirements-analysis → domain-design、
Construction は functional-design → code-generation → build-and-test の
10 ステージで、Operation フェーズは持たない。composer の提案から起こし、各
ステージの `scopes:` フロントマターに登録した stock スコープで、既存 11 スコープのどれにも当てはまらない「フレームワーク内で
新しい能力を足す」種類の作業を受け持つ。

## Why these stages, why skip those

プラグインは単一パッケージに集約されているが、その挙動は vendored エンジン
（`aidlc-workflows/`）の compile / overlay merge / 7 ハーネス projection という
設定駆動の仕組みで決まる。そのため brownfield の `reverse-engineering` で
エンジンの拡張点と現行プラグイン構造を local codekb store に写し、
`requirements-analysis` で contributions の機能分解・制約（エンジン版ピン、
ハーネス移植性）・対象外を仕様化する。`intent-capture` は短く汎用な依頼を
「どの能力を・誰のために・なぜ」に固定する低コストの枠として残す。

設計は 2 段で持つ。`domain-design` は contributions-only か
stages / agents / sensors / `src/` を持つかといった構成決定と ADR を担い、
feasibility とユニット分解をここに吸収する。`functional-design` は断片を
横断する挙動規則（質問プロトコル、帳簿の書き方）や tool ロジックを
生成前に設計する。`code-generation` が実装し、`build-and-test` が
typecheck・drift check・bun test・aidlc-plugin-validate・7 ハーネス build を
回して検証する。

SKIP の理由は「別の EXECUTE ステージか既存の資産が同じ成果を出す」か
「この種の作業にその成果物の消費先がない」のどちらか。
`market-research` / `team-formation` / `rough-mockups` / `refined-mockups` /
`user-stories` は市場・チーム・UI・複数ペルソナがない開発者ツールには
消費先がない。`feasibility` と `scope-definition` はそれぞれ `domain-design` と
`requirements-analysis` の out-of-scope に折り込む。`approval-handoff` は
Ideation が intent-capture 1 つなので brief に新情報がなく、intent-capture の
ゲートが handoff になる（stock `poc` と同じ扱い）。`practices-discovery` は
brownfield の慣行が既存コードと CI に体現済みなので折り込むが、`team.md` を
確定したい初回だけ un-SKIP する価値がある。`units-generation` /
`delivery-planning` / `contract-design` は、通常 3 ユニット以下で依存が軽く、
契約はフレームワーク所有で `aidlc-plugin-validate` が強制するため外す
（新ステージ・エージェント・センサー・tools を跨ぐ大型プラグインでは
units-generation と delivery-planning を対で un-SKIP）。NFR・インフラ・
`ci-pipeline` は既存 CI と requirements の constraints が担い、Operation
フェーズは配布物がリポジトリ内容（contributions と harness projections）で
完結するため全て SKIP。レジストリ公開やリリース運用を始める時に
deployment 系を un-SKIP する。

## Membership

Keyword triggers: なし（`keywords: []`）。推論では選ばれず、
`/aidlc --scope plugin-dev` で明示指定するか、`/aidlc-plugin-dev` ランナーで
起動する（`runner: true`）。Initialization 3 ステージに
加えて `intent-capture`、`reverse-engineering`、`requirements-analysis`、
`domain-design`、`functional-design`、`code-generation`、`build-and-test` が
EXECUTE、残る 23 ステージは SKIP。`skeleton: off` — プラグインは既に
build が通る状態にあり、最初の Bolt に bootstrap すべきものがない。
