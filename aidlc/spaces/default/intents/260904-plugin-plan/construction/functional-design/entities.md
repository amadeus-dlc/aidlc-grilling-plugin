# エンティティ — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

出典: 要求一覧 `../../inception/requirements-analysis/requirements.md`（FR1〜FR8）、構成決定 `../../inception/domain-design/components.md`（コンポーネントとエンティティの所有）、確認済み回答 `functional-design-questions.md`（Q1〜Q5 と決めた前提）。plugin-dev スコープは Unit を切らない単一の作業として進めるため、`unit-of-work.md` / `unit-of-work-story-map.md` / `contract-summary.md` は存在しない（スコープ設計どおり）。

構成決定の DocumentationSet が持つ CompletionRecord / DecisionRecord / LiveCheckRecord は、ADR-008 の制約により本ファイルには載せない。これらはルールもライフサイクルも持たない「書く項目の一覧」であり、その項目は `rules.md` の BR12（内容の方針）と `functional-spec.md` の「文書の項目」に記す。

## Part A — 機械可読の定義（正本）

```yaml
entities:
  - name: FragmentTemplate
    owner: ContributionOverlay
    description: Grill me の全仕様を自己完結で持つ唯一の原本（grilling/tests/fragment-template.md）。28 の Contribution はこれを描画したもの
    identifier: path
    attributes:
      - name: path
        type: string
        required: true
        unique: true
      - name: modeLabel
        type: string
        required: true
        constraints: 固定値 `Grill me`
      - name: modeDescription
        type: string
        required: true
        constraints: BR2.5 の固定文（ラウンド方式を表す 1 文）
      - name: roundRules
        type: text
        required: true
        constraints: BR1.1〜BR1.3
      - name: renderingRules
        type: text
        required: true
        constraints: BR2.1〜BR2.3
      - name: screenSplitRule
        type: text
        required: true
        constraints: BR2.4
      - name: factFindingRule
        type: text
        required: true
        constraints: BR3.1〜BR3.3
      - name: terminationRule
        type: text
        required: true
        constraints: BR4.1〜BR4.3
      - name: ledgerRules
        type: text
        required: true
        constraints: BR5.1〜BR5.4
      - name: optOutRule
        type: text
        required: true
        constraints: BR6.1〜BR6.3
      - name: decisionSizeTiers
        type: text
        required: true
        constraints: BR7.1 の 5 段階（2 つの問いかけ、段階ごとの問いかけ・例・反例）
      - name: depthThresholds
        type: table
        required: true
        constraints: BR7.2 の対応表（Depth × 人に聞く段階）
      - name: decidedAssumptionsFormat
        type: text
        required: true
        constraints: BR5.4 の書式
      - name: lineCount
        type: integer
        required: true
        max: 150
        constraints: ADR-004 のプロンプト予算。28 ステージすべてに同じ本文が入るため上限を置く
    constraints:
      - 本文は英語（差し込み先のステージファイルと同じ言語）。人に見せる文は会話言語で描画し、固定トークンだけ英語のまま残す
      - 固定トークン: `Grill me`、`(Recommended)`、`**Mode:** grill`、`**Pending:**`、段階タグ `[XL]` `[L]` `[M]` `[S]` `[SS]`、`❓`、`➡️`、`---`、`[Answer]:`、`X. Other (please specify)`
      - ラウンドの見出しと「決めた前提」の見出しは人が読む文なので会話言語で書く（英語の原文は functional-spec.md「質問ファイルの形」）

  - name: Contribution
    owner: ContributionOverlay
    description: 1 つのコアステージへ差し込む断片。target と anchor だけが FragmentTemplate の描画結果に加わる
    identifier: target
    attributes:
      - name: phase
        type: enum
        required: true
        allowed_values: [ideation, inception, construction, operation]
      - name: target
        type: string
        required: true
        unique: true
        constraints: コアステージの slug（28 種）
      - name: anchor
        type: string
        required: true
        constraints: "`after-step:N` / `before-step:N` / `end-of-steps` のいずれか（`after-questions` は compose で落ちるため使えない、C2）"
      - name: order
        type: integer
        required: true
        default: 0
      - name: fragmentBody
        type: text
        required: true
        constraints: FragmentTemplate をそのまま描画したもの（`sync-contributions.ts --check` で一致を検査）
    relationships:
      - target: FragmentTemplate
        cardinality: many-to-one
        direction: Contribution → FragmentTemplate
        description: 描画元

  - name: PluginManifest
    owner: ContributionOverlay
    description: "`.aidlc-plugin/plugin.json`"
    identifier: path
    attributes:
      - name: path
        type: string
        required: true
        unique: true
      - name: name
        type: string
        required: true
        constraints: 固定値 `grilling`
      - name: version
        type: string
        required: true
        constraints: 安定 SemVer（`X.Y.Z`。プレリリースやビルド識別子は不可）
      - name: description
        type: string
        required: true
      - name: contributes
        type: object
        required: true
        constraints: "`overlays` のみ（contributions のみのプラグイン、C1）"

  - name: InterviewSession
    owner: ContributionOverlay
    description: 1 つのステージの質問を Grill me で進める面接 1 回分。断片が定義し、エージェントが実行する。質問ファイルがその帳簿
    identifier: questionsFilePath
    attributes:
      - name: questionsFilePath
        type: string
        required: true
        unique: true
      - name: stage
        type: string
        required: true
        constraints: ステージの slug
      - name: depth
        type: enum
        required: true
        allowed_values: [Minimal, Standard, Comprehensive]
        constraints: "`aidlc-state.md` の `**Depth**`"
      - name: askThreshold
        type: enum
        required: true
        allowed_values: [L, M, S]
        constraints: 人に聞く最小の段階。depth から BR7.2 で決まる（Minimal → L、Standard → M、Comprehensive → S）
      - name: oneAtATime
        type: boolean
        required: true
        default: false
        constraints: BR6.1 / BR6.2 で true になる
      - name: roundCount
        type: integer
        required: true
        min: 1
      - name: status
        type: enum
        required: true
        allowed_values: [open, frontier-empty, confirmed]
    relationships:
      - target: Round
        cardinality: one-to-many
        direction: InterviewSession → Round
      - target: Decision
        cardinality: one-to-many
        direction: InterviewSession → Decision
        description: 決定の木の全節

  - name: Decision
    owner: ContributionOverlay
    description: 決定の木の 1 節。人に聞く Question になるか、エージェントが決める DecidedAssumption になる
    identifier: id
    attributes:
      - name: id
        type: string
        required: true
        unique: true
        constraints: 内部の識別。質問ファイルには Q 番号または前提の行として現れる
      - name: title
        type: string
        required: true
      - name: tier
        type: enum
        required: true
        allowed_values: [XL, L, M, S, SS]
        constraints: BR7.1 の 2 つの問いかけで判定。迷ったら大きい方（BR7.4）
      - name: prerequisites
        type: list<Decision.id>
        required: true
        default: []
        constraints: 先に決まっていないと答えられない決定
      - name: status
        type: enum
        required: true
        allowed_values: [open, waiting-fact, frontier, asked, answered, agent-decided, promoted]
        constraints: 遷移は functional-spec.md の状態機械のとおり
      - name: resolution
        type: string
        required: false
        constraints: 選ばれた選択肢、または前提として決めた内容
      - name: factLookup
        type: FactLookup.subject
        required: false
    constraints:
      - tier が askThreshold 以上の決定は人に聞く。未満はエージェントが推奨回答で決める（BR7.3）
      - prerequisites がすべて answered または agent-decided になるまで frontier に入らない（BR1.2）

  - name: Round
    owner: ContributionOverlay
    description: 前提がすべて決まった質問の集合（フロンティア）を 1 回で出す単位
    identifier: number
    attributes:
      - name: number
        type: integer
        required: true
        min: 1
        constraints: 面接内で通し
      - name: questionNumbers
        type: list<Question.number>
        required: true
        constraints: 空でもよい（決めた前提だけのラウンドは出さず、次の計算に進む）
      - name: decidedAssumptionCount
        type: integer
        required: true
        default: 0
      - name: screenCount
        type: integer
        required: true
        min: 1
        constraints: Claude Code では ceil(質問数 / 4)。oneAtATime なら質問数と同じ。番号付きプローズでは 1
      - name: status
        type: enum
        required: true
        allowed_values: [composed, appended, presented, written-back]
    constraints:
      - 同じラウンドの質問は互いに独立（片方の答えでもう片方が変わらない）（BR1.2）
      - 質問数に上限はない（C7。絞るのは数ではなく決定の大きさ）
    relationships:
      - target: Question
        cardinality: one-to-many
        direction: Round → Question
      - target: DecidedAssumption
        cardinality: one-to-many
        direction: Round → DecidedAssumption

  - name: Question
    owner: ContributionOverlay
    description: 人に聞く 1 問。質問ファイルの `## Qn.` ブロック
    identifier: number
    attributes:
      - name: number
        type: integer
        required: true
        unique: true
        constraints: ファイル全体で通し（ラウンドをまたいで振り直さない）
      - name: title
        type: string
        required: true
      - name: body
        type: text
        required: true
        constraints: 1 行の文脈（なぜ聞くか、何が依存するか）を含む
      - name: options
        type: list<string>
        required: true
        constraints: A〜 の選択肢。最後は固定の `X. Other (please specify)`
      - name: recommendedOption
        type: string
        required: true
        constraints: options の 1 つの文字
      - name: reasoning
        type: string
        required: true
        constraints: 推奨の理由 1 行
      - name: answer
        type: string
        required: false
        constraints: "`[Answer]:` の値。空欄は未回答"
      - name: modeMarker
        type: string
        required: false
        constraints: answer が入った直後の行に固定値 `**Mode:** grill`
      - name: pending
        type: string
        required: false
        constraints: "`**Pending:** <調べていること>`。調査結果を待つ間だけ付く（BR3.2）"
      - name: roundNumber
        type: Round.number
        required: true
      - name: decisionId
        type: Decision.id
        required: true
    constraints:
      - 質問ファイルの選択肢の並びと文字は変えない。Claude Code の画面だけ推奨を先頭にして `(Recommended)` を付ける（BR2.2）
    relationships:
      - target: Decision
        cardinality: one-to-one
        direction: Question → Decision
        description: この質問が決める決定

  - name: DecidedAssumption
    owner: ContributionOverlay
    description: askThreshold より小さいのでエージェントが推奨回答で決めた決定。ラウンドの節に 1 件 1 行で書く
    identifier: [roundNumber, index]
    attributes:
      - name: tier
        type: enum
        required: true
        allowed_values: [L, M, S, SS]
        constraints: askThreshold 未満の段階のみ（XL は常に人に聞く）
      - name: decision
        type: string
        required: true
      - name: reason
        type: string
        required: true
      - name: roundNumber
        type: Round.number
        required: true
      - name: decisionId
        type: Decision.id
        required: true
      - name: status
        type: enum
        required: true
        allowed_values: [held, promoted]
        constraints: 人が最後の確認で異議を出したら promoted（次のラウンドの Question になる、BR4.3）
    relationships:
      - target: Decision
        cardinality: one-to-one
        direction: DecidedAssumption → Decision

  - name: FactLookup
    owner: ContributionOverlay
    description: 調べれば分かること。人には聞かず、サブエージェントまたは自分で調べる
    identifier: subject
    attributes:
      - name: subject
        type: string
        required: true
        unique: true
      - name: method
        type: enum
        required: true
        allowed_values: [subagent, self]
        constraints: Claude Code は subagent、サブエージェントを呼べないハーネスは self（BR3.1）
      - name: status
        type: enum
        required: true
        allowed_values: [running, done]
      - name: result
        type: text
        required: false
      - name: dependentDecisionIds
        type: list<Decision.id>
        required: true
    constraints:
      - 実行中でもラウンドを止めない。依存する Decision だけ waiting-fact に留める（BR3.3）
    relationships:
      - target: Decision
        cardinality: one-to-many
        direction: FactLookup → Decision
        description: 結果を待つ決定

  - name: SourceSelector
    owner: Installer
    description: インストール元の指定（値オブジェクト）
    identifier: [kind, value]
    attributes:
      - name: kind
        type: enum
        required: true
        allowed_values: [local, ref, tag, latest]
      - name: value
        type: string
        required: true
        constraints: local はリポジトリのパス、ref はブランチ名、tag と latest は解決したタグ名（`vX.Y.Z`）
    constraints:
      - "`--from` / `--ref` / `--tag` は同時に 1 つまで。指定がなければ latest（BR8.2）"

  - name: InstallProvenance
    owner: Installer
    description: 成功したインストールの記録
    identifier: path
    attributes:
      - name: path
        type: string
        required: true
        unique: true
        constraints: "`<project>/<ハーネスの dir>/tools/data/grilling-install.json`。ハーネスはこのパスで分かるため項目に持たない（決めた前提）"
      - name: version
        type: string
        required: true
        constraints: 導入した PluginManifest.version と一致
      - name: ref
        type: string
        required: true
        constraints: SourceSelector.value
      - name: source
        type: enum
        required: true
        allowed_values: [local, ref, tag, latest]
      - name: installed_at
        type: string
        required: true
        constraints: ISO 8601（UTC）
      - name: payload_sha256
        type: string
        required: true
        constraints: "`sha256:<hex>`。投影ペイロード（provenance 自身を除く）のパスとバイト列を順に連結したダイジェスト"
    relationships:
      - target: PluginManifest
        cardinality: many-to-one
        direction: InstallProvenance → PluginManifest
        description: version が一致する

  - name: ReleaseTag
    owner: ReleaseTool
    description: 公開したバージョンを指す git タグ
    identifier: tag
    attributes:
      - name: tag
        type: string
        required: true
        unique: true
        constraints: "`v<version>`"
      - name: version
        type: string
        required: true
        constraints: 安定 SemVer
      - name: commitMessage
        type: string
        required: true
        constraints: 固定書式 `chore(release): publish v<version>`
    relationships:
      - target: PluginManifest
        cardinality: many-to-one
        direction: ReleaseTag → PluginManifest
        description: version が一致しなければならない（BR9.4）
```

## Part B — 要約

- **配布物**（ContributionOverlay 所有）: `FragmentTemplate` が唯一の原本で、28 の `Contribution` はその描画結果。`PluginManifest` は名前・版・contributes（overlays のみ）を持つ。
- **面接の帳簿**（断片が定義し、エージェントが実行する）: `InterviewSession` は 1 ステージ分の面接で、`Decision`（決定の木の節）を持つ。前提が揃った決定は `Round` にまとめて出され、人に聞くものは `Question`、閾値より小さいものは `DecidedAssumption` になる。調べれば分かることは `FactLookup` に回し、その結果を待つ決定だけが `waiting-fact` に留まる。質問ファイルに現れるのは `Round`（見出し）、`Question`（`## Qn.` ブロック）、`DecidedAssumption`（ラウンドの節の 1 行）で、`Decision` と `FactLookup` はエージェントの内部モデル。
- **導入と公開**: `SourceSelector`（値オブジェクト）が取得元を表し、成功したインストールは `InstallProvenance`（5 項目）として残る。`ReleaseTag` は manifest の version と一致するタグ。
- **載せないもの**: CompletionRecord / DecisionRecord / LiveCheckRecord（ADR-008。書く項目は BR12 と functional-spec.md「文書の項目」）。
