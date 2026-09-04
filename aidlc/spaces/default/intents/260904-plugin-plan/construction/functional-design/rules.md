# ビジネスルール — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

出典: 要求一覧 `../../inception/requirements-analysis/requirements.md`、構成決定 `../../inception/domain-design/components.md` と `decisions.md`（ADR-001〜008）、確認済み回答 `functional-design-questions.md`（Q1〜Q5 と決めた前提）、取り込み元スキルの逐語コピー `../../inception/domain-design/upstream-grilling-SKILL.md` / `upstream-grilling-doc.md`。

ルールの群: BR1〜BR7 は Grill me の断片（FR8.1〜FR8.7 の順）、BR8 はインストーラ（FR4）、BR9 はリリースツール（FR5）、BR10 は検証スイート（FR1・FR4.4・FR5.3）、BR11 は開発環境設定（FR5.2・FR6.2・FR6.3）、BR12 は文書の内容の方針（FR1.3・FR2・FR3・FR6.1・FR6.4。ADR-008 に従い、文書のエンティティにルールを付けるのではなく「どの文書に何を書くか」の方針として書く）。

## Part A — 機械可読の定義（正本）

```yaml
rules:
  # ---- BR1: 決定の木とフロンティア（FR8.1） ----
  - id: BR1.1
    statement: 相談内容を決定の木として捉え、各決定に前提（先に決まっていないと答えられない決定）を付ける
    category: policy
    applies_to: [InterviewSession, Decision]
    trigger: Grill me が選ばれた直後、および各ラウンドの答えを受け取った後
    logic: >-
      IF Grill me が選ばれた THEN ステージが下書きした質問を Decision に写し、各 Decision に prerequisites と tier を付ける。
      IF 答えによって新しい決定が見えた THEN その Decision を木に足す
    violation: 前提の分からない質問は出さない（先に木を作ってから出す）
    source: FR8.1

  - id: BR1.2
    statement: 前提がすべて決まった決定だけを 1 つのラウンドに入れる。同じラウンドの質問は互いに独立でなければならない
    category: constraint
    applies_to: [Round, Decision]
    trigger: フロンティアの計算
    logic: >-
      IF Decision の prerequisites がすべて answered または agent-decided AND status が open THEN その Decision を今のラウンドの候補にする。
      IF prerequisites に open / asked / waiting-fact がある THEN 次以降のラウンドに回す
    violation: 依存する 2 問が同じラウンドに入ったと人が指摘したら、影響を受けた枝を次のラウンドで聞き直す（取り込み元の「フロンティアは判断であり計算ではない」という限界をそのまま受け入れる）
    source: FR8.1

  - id: BR1.3
    statement: 答えを受け取るたびに木を更新し、フロンティアを計算し直す
    category: policy
    applies_to: [InterviewSession]
    trigger: 画面の答えの書き戻し後、FactLookup の完了後
    logic: IF 答えまたは調査結果が入った THEN 依存する Decision の status を見直し、次のラウンドを composed にする
    violation: 前のラウンドで計算したフロンティアをそのまま出さない（毎回計算し直す）
    source: FR8.1

  # ---- BR2: 書式と画面（FR8.2） ----
  - id: BR2.1
    statement: 各質問に番号・題・本文（1 行の文脈を含む）・推奨回答（理由 1 行）を付ける
    category: constraint
    applies_to: [Question]
    trigger: 質問の追記
    logic: IF 質問を質問ファイルに書く THEN 番号（ファイル全体で通し）、題、本文、選択肢（最後は `X. Other (please specify)`）、推奨の文字と理由 1 行を揃える
    violation: 推奨のない質問、番号のない質問は出さない
    source: FR8.2

  - id: BR2.2
    statement: Claude Code の画面では推奨選択肢を先頭に置き、その label に `(Recommended)` を付ける。並べ替えは画面だけで、質問ファイルは元の並びと文字を保つ
    category: constraint
    applies_to: [Question]
    trigger: Claude Code での構造化質問の描画
    logic: IF ハーネスが Claude Code THEN options を推奨が先頭になるよう並べ替え、先頭 label の末尾に ` (Recommended)` を付ける。書き戻しは元の文字（A〜X）で行う
    violation: 画面の並びをファイルに反映しない。`(Recommended)` を答えの値に含めない
    source: FR8.2, C3

  - id: BR2.3
    statement: 番号付きプローズで描画するハーネスでは取り込み元の書式（`❓ **Qn** - **題**: 本文` / `➡️ 推奨回答` / `---` 区切り）で 1 ラウンドを 1 つのメッセージに出す。選択肢の並びは変えない
    category: constraint
    applies_to: [Round, Question]
    trigger: Claude Code 以外での描画
    logic: IF ハーネスが番号付きプローズ THEN ラウンドの全質問を ❓ / ➡️ / --- の書式で並べ、各質問の番号付き選択肢と最後の Other（描画 annex の規則）を保つ。人は「1 は A、2 は B」と番号で答えられる
    violation: 推奨を選択肢の並び替えで示さない（➡️ 行で示す）
    source: FR8.2

  - id: BR2.4
    statement: Claude Code では 1 回の画面に 4 問まで。5 問以上のラウンドは 4 問ずつ画面を分けて出す
    category: constraint
    applies_to: [Round]
    trigger: Claude Code でのラウンドの提示
    logic: >-
      IF ラウンドの質問数 > 4 THEN 先頭から 4 問ずつ画面に分ける（screenCount = ceil(質問数 / 4)）。
      同じラウンドの質問は独立なので、分割しても意味は変わらない。画面ごとに書き戻し（BR5.2）と記録（BR5.3）を行う。
      IF oneAtATime THEN 1 問ずつ（screenCount = 質問数）
    violation: 5 問以上を 1 画面に詰めない。分割の途中で木を計算し直さない（同じラウンドの残りを先に出し切る）
    source: FR8.2, C3

  - id: BR2.5
    statement: モード選択の 4 択目は label `Grill me`、description は固定文「Interview me in rounds of independent questions, each with a recommended answer; drill into every branch until we share the same understanding」
    category: constraint
    applies_to: [FragmentTemplate]
    trigger: ステージのモード選択（stage-protocol §3 Step 2）
    logic: IF ステージがモード選択を出す THEN Guide me / I'll edit the file / Chat の後に上記の 4 択目を足す。描画 annex の Other 規則と番号はそのまま
    violation: 旧文（one question at a time）を残さない。label を変えない
    source: FR8.2, FR1.4

  # ---- BR3: 事実の調査（FR8.3） ----
  - id: BR3.1
    statement: 調べれば分かること（ファイルの中身、設定、前段の成果物）は人に聞かず調べる。Claude Code ではサブエージェントに調べさせ、呼べないハーネスでは自分で調べる
    category: policy
    applies_to: [FactLookup, Decision]
    trigger: 木を作るとき、フロンティアを計算するとき
    logic: IF 決定の答えが環境の事実で決まる THEN FactLookup を作って開始し、その決定を waiting-fact にする。IF サブエージェントを呼べる THEN method = subagent ELSE self
    violation: 調べれば分かることを質問にしない
    source: FR8.3

  - id: BR3.2
    statement: 調査結果を待つ質問は、空の `[Answer]:` と `**Pending:** <調べていること>` の行を付けて質問ファイルに先に追記し、結果が出た次のラウンドで出す
    category: policy
    applies_to: [Question]
    trigger: FactLookup の開始
    logic: >-
      IF 質問が FactLookup の結果を待つ THEN 質問ブロックを追記し `[Answer]:` を空、直下に `**Pending:** <調べていること>` を置く。
      IF 結果が出て質問が必要なまま THEN Pending 行を消して次のラウンドで出す。
      IF 結果で聞く必要がなくなった THEN `[Answer]:` に `Resolved by lookup (round <n>)` と書き、直下に `**Mode:** grill`、そのラウンドの決めた前提に決定と理由を書く
    violation: Pending の質問を Pending のまま画面に出さない。Pending の質問を空欄のまま最後の確認に進まない
    source: FR8.3, Q4

  - id: BR3.3
    statement: 調査が終わるのを待たず、その結果に依存しない残りのフロンティアを先に出す
    category: policy
    applies_to: [Round, FactLookup]
    trigger: FactLookup が running のとき
    logic: IF FactLookup が running THEN dependentDecisionIds の決定だけを待たせ、それ以外の候補で今のラウンドを作る
    violation: 調査中を理由にラウンドを止めない（依存しない質問があるのに待たない）
    source: FR8.3, Q4

  # ---- BR4: 終了と共有理解の確認（FR8.4） ----
  - id: BR4.1
    statement: フロンティアが空になったら質問を終える
    category: policy
    applies_to: [InterviewSession]
    trigger: フロンティアの計算
    logic: IF open / waiting-fact / asked の Decision がなく、askThreshold 以上で未回答の Decision もない THEN status = frontier-empty
    violation: 人に聞くべき決定（閾値以上）を残したまま終えない。人が「もう十分」と言ったときだけ、残りを決めた前提に落として終える
    source: FR8.4

  - id: BR4.2
    statement: 終了後は AI-DLC の consolidated summary（回答と決めた前提の全件）を「同じ理解に至ったかの確認」として出し、確認前に成果物を生成しない
    category: policy
    applies_to: [InterviewSession]
    trigger: status = frontier-empty
    logic: IF frontier-empty THEN 回答の要約と「決めた前提」の全件（ラウンド順）を並べ、Looks correct / Request changes の checkpoint を記録してから待つ。Looks correct のときだけ status = confirmed にして成果物生成に進む
    violation: 確認を取る前に成果物を書かない（取り込み元「It ran out of questions and started building」の防止）
    source: FR8.4, stage-protocol §3 Step 3a

  - id: BR4.3
    statement: Request changes で決めた前提が挙がったら、その決定を次のラウンドの質問に格上げして聞き直す。回答済みの質問への異議は、その枝を開き直して次のラウンドで聞き直す
    category: policy
    applies_to: [DecidedAssumption, Decision]
    trigger: checkpoint の答えが Request changes
    logic: >-
      IF 異議の対象が DecidedAssumption THEN status = promoted、Decision を frontier に戻し、新しい Q 番号で次のラウンドに追記する（tier はそのまま）。
      IF 異議の対象が回答済みの Question THEN その Decision と依存する Decision を open に戻す。
      その後 BR1.3 で計算し直し、再びフロンティアが空になったら BR4.2 に戻る
    violation: 異議の対象を「前提」のまま残さない
    source: FR8.4, Q2

  # ---- BR5: 帳簿（FR8.5） ----
  - id: BR5.1
    statement: ラウンドの質問は提示する前にまとめて質問ファイルへ追記する（ラウンドの見出し、各質問は空の `[Answer]:` 付き）
    category: policy
    applies_to: [Round, Question]
    trigger: Round が composed になったとき
    logic: IF ラウンドを出す THEN 先にラウンドの見出し（会話言語。英語なら `## Round <n>`）と質問ブロックを追記し、status = appended にしてから画面に出す
    violation: 画面に出した質問がファイルにない状態を作らない
    source: FR8.5

  - id: BR5.2
    statement: 答えは受け取り次第 `[Answer]:` に書き戻し、直下に `**Mode:** grill` を置く
    category: policy
    applies_to: [Question]
    trigger: 画面の答えの受領
    logic: IF 画面の答えが返った THEN その画面の各質問の `[Answer]:` に選択肢の文字（Other なら本文）を書き、直下の行に `**Mode:** grill` を置く（答えの値の中には入れない）
    violation: 次の画面を出す前に書き戻していない質問を残さない
    source: FR8.5

  - id: BR5.3
    statement: 画面ごとに、提示前に `aidlc-log.ts decision`、受領後に `aidlc-log.ts answer` を記録する
    category: policy
    applies_to: [Round]
    trigger: 画面の提示と受領
    logic: IF 画面を出す THEN 直前に decision（要約と選択肢）、直後に answer（実際の選択）を記録する。番号付きプローズでは 1 ラウンド = 1 画面
    violation: 記録のない画面を出さない
    source: FR8.5

  - id: BR5.4
    statement: 決めた前提は、そのラウンドの質問の直後に見出し（会話言語。英語なら `### Decided assumptions (round <n>)`）を置き、`- [<段階>] <決定> — <理由>` を 1 件 1 行で書く。0 件のラウンドは見出しを省く
    category: constraint
    applies_to: [DecidedAssumption]
    trigger: フロンティアの計算で閾値未満の決定を決めたとき
    logic: IF そのラウンドに DecidedAssumption がある THEN 質問の追記と同時に節を追記する。段階タグ `[XL]`〜`[SS]` は固定トークン
    violation: 決めた前提をファイルに書かずに進めない。質問ファイル末尾に集めない（ラウンドとの対応を保つ）
    source: FR8.7, Q2

  # ---- BR6: 1 問ずつへの切り替え（FR8.6） ----
  - id: BR6.1
    statement: "`aidlc/spaces/<space>/memory/project.md` の `## Corrections` に「Grill me（または grilling）は 1 問ずつ聞く」旨の行があれば oneAtATime = true。文言は意味で判断し、完全一致は求めない"
    category: policy
    applies_to: [InterviewSession]
    trigger: Grill me の開始
    logic: IF Corrections にその趣旨の行がある（日本語・英語いずれでも） THEN oneAtATime = true
    violation: 定型文との完全一致を要求しない
    source: FR8.6, Q5

  - id: BR6.2
    statement: 会話中に人が「1 問ずつにして」と言えば、そのステージの残りを 1 問ずつにする。永続化は §13 の学びの儀式に任せる
    category: policy
    applies_to: [InterviewSession]
    trigger: 面接中の人の発言
    logic: IF 人が 1 問ずつを求めた THEN 以後の画面を 1 問ずつにする（ステージ内のみ）。project.md は直接書かない
    violation: 人の発言で project.md を直接編集しない
    source: FR8.6, Q5

  - id: BR6.3
    statement: oneAtATime でもフロンティアの計算・追記・決めた前提は変えない。変わるのは画面の質問数だけ
    category: constraint
    applies_to: [Round]
    trigger: oneAtATime = true
    logic: IF oneAtATime THEN screenCount = 質問数。追記はラウンド単位のまま
    violation: 1 問ずつのときに依存順を崩さない（同じラウンドの質問は独立なので順序は任意）
    source: FR8.6

  # ---- BR7: 決定の大きさと Depth（FR8.7） ----
  - id: BR7.1
    statement: >-
      決定の大きさは 2 つの問いかけで判定する。(1) 影響の広がり — 「あとで変えると、他に何が変わるか」（解の形や他の構成要素の契約 → XL/L、同じ構成要素の中で利用者に見える挙動 → M、その場だけ → S/SS）。
      (2) 戻しやすさ — 「戻すのにどれだけかかるか」（境界の引き直しや設計の再承認 → XL、他の構成要素のインターフェース変更 → L、1 か所を数分 → S、誰も気づかない → SS）。
      段階ごとの判定の問いかけ・例・反例は functional-spec.md「決定の大きさの判定」の正本のとおり
    category: calculation
    applies_to: [Decision]
    trigger: Decision を木に足すとき
    logic: IF 2 つの問いかけの答えが揃う THEN 該当する段階を tier にする（XL: 解の形、L: 責務や契約、M: 見える挙動、S: 局所の選択、SS: 見えない選択）
    violation: 段階を付けずに質問にしない
    source: FR8.7, Q1

  - id: BR7.2
    statement: Depth によって人に聞く最小の段階（askThreshold）を決める — Minimal は L（XL・L を聞く）、Standard は M（M まで聞く）、Comprehensive は S（S まで聞く）。SS は常にエージェントが決める
    category: policy
    applies_to: [InterviewSession]
    trigger: Grill me の開始
    logic: IF depth = Minimal THEN askThreshold = L; IF Standard THEN M; IF Comprehensive THEN S
    violation: Depth を質問数の上限として使わない（数ではなく大きさで絞る、C7）
    source: FR8.7, Q9（要求整理）

  - id: BR7.3
    statement: askThreshold 未満の決定は推奨回答で決め、そのラウンドの決めた前提として書き、最後の確認で一括確認する
    category: policy
    applies_to: [Decision, DecidedAssumption]
    trigger: フロンティアの計算
    logic: IF Decision の tier < askThreshold AND prerequisites が揃った THEN status = agent-decided、resolution = 推奨回答、DecidedAssumption を作る（BR5.4）
    violation: 閾値未満の決定を黙って決めない（必ず書く）。閾値以上の決定をエージェントが決めない（取り込み元「It answered its own questions」の防止）
    source: FR8.7

  - id: BR7.4
    statement: 2 つの段階のどちらにも当てはまるときは大きい方にする（人に聞く側に倒す）
    category: policy
    applies_to: [Decision]
    trigger: tier の判定で迷ったとき
    logic: IF 判定が 2 段階にまたがる THEN 大きい方を tier にする
    violation: 迷いを小さい方に倒して質問を減らさない
    source: FR8.7（決めた前提）

  # ---- BR8: インストーラ（FR4） ----
  - id: BR8.1
    statement: "`--project <path>` は必須で、存在するディレクトリでなければならない。`--harness` は claude / codex / copilot / opencode / kiro / kiro-ide / cursor のいずれか（既定 claude）。不明なフラグは失敗にする"
    category: validation
    applies_to: [Installer]
    trigger: 起動時の引数解析
    logic: IF `--project` がない OR ディレクトリでない OR `--harness` が 7 種にない OR 不明なフラグ THEN 使い方を表示して非 0 で終了
    violation: 引数不正のまま取得や書き込みに進まない
    source: FR4.1

  - id: BR8.2
    statement: "ソース選択子 `--from` / `--ref` / `--tag` は同時に 1 つまで。指定がなければ GitHub の最新の安定 SemVer タグ（latest）"
    category: validation
    applies_to: [SourceSelector]
    trigger: 引数解析
    logic: IF 2 つ以上の選択子 THEN 失敗。IF なし THEN リポジトリのタグ一覧から `v<stable semver>` の最大を選ぶ。IF `--from` THEN kind = local（ローカル checkout をそのまま使い、ダウンロードしない）
    violation: 選択子の併用を黙って優先順で解決しない
    source: FR4.1

  - id: BR8.3
    statement: "`--update` は選択子と併用できず、provenance が必要。provenance の source が tag なら固定タグなので `Changed 0` で終える。それ以外は前回の source と ref を再利用する"
    category: validation
    applies_to: [Installer, InstallProvenance]
    trigger: "`--update` 指定"
    logic: IF `--update` AND 選択子あり THEN 失敗。IF provenance なし THEN 失敗（通常の導入を促す）。IF provenance.source = tag THEN `Changed 0` で終了。ELSE provenance.source / ref で取得
    violation: provenance なしで `--update` を進めない
    source: FR4.1

  - id: BR8.4
    statement: "取得したソースの manifest は name が `grilling`、version が安定 SemVer でなければならない。`--tag` のときは tag が `v` + version と一致しなければならない"
    category: validation
    applies_to: [PluginManifest]
    trigger: ソース取得後
    logic: IF name != `grilling` OR version が安定 SemVer でない OR (`--tag` AND tag != `v${version}`) THEN 失敗
    violation: 版の食い違ったソースを導入しない
    source: FR4.1, NFR5

  - id: BR8.5
    statement: tar.gz の展開では `..` を含むパス、絶対パス、symlink / hardlink のエントリを拒否し、展開先の外へ書かない
    category: validation
    applies_to: [Installer]
    trigger: "`--tag` / `--ref` / latest のアーカイブ展開"
    logic: IF エントリのパスが展開先の外に出る OR エントリがリンク THEN 失敗（展開を中止）
    violation: 危険なエントリを読み飛ばして続行しない
    source: NFR6, ADR-001

  - id: BR8.6
    statement: "`--project` の外へは書かず、symlink を追わず、認証情報を扱わない（GitHub の公開アーカイブ API だけを使う）"
    category: constraint
    applies_to: [Installer]
    trigger: すべての書き込み
    logic: IF 書き込み先が `--project` の外 OR 経路に symlink THEN 失敗
    violation: なし（境界の外への書き込みは常に失敗）
    source: NFR6, ADR-001

  - id: BR8.7
    statement: provenance が同じ source と ref、同じ version、同じ payload ダイジェストを示し、廃止済みファイルも残っていなければ、何もせず `Changed 0` で終える（冪等）
    category: policy
    applies_to: [Installer, InstallProvenance]
    trigger: 投影の build 後
    logic: IF provenance.source/ref = 解決した選択子 AND provenance.version = manifest.version AND 導入済みペイロードのダイジェスト = 候補のダイジェスト = provenance.payload_sha256 AND tombstone なし THEN `Changed 0` で終了
    violation: 変更がないのに compose を走らせない
    source: NFR2, FR4.2

  - id: BR8.8
    statement: store 系ハーネス（claude / codex / copilot / opencode）は投影 dist から直接 compose し、storeless 系（kiro / kiro-ide / cursor）は投影をプロジェクト直下へフォルダドロップしてから compose する。`aidlc plugin sync` があればそれを、無ければ投影の `hooks/compose.ts` を実行する
    category: policy
    applies_to: [Installer]
    trigger: build 後、変更がある場合
    logic: IF ハーネスが storeless THEN 投影を `<project>/<フォルダ>` に置く。IF `aidlc plugin sync` が使える THEN それを実行 ELSE `hooks/compose.ts` を環境変数（plugin root / project dir / harness dir）付きで実行
    violation: compose を省いて「導入済み」と表示しない
    source: FR4.2, architecture.md Data Flow 3〜4

  - id: BR8.9
    statement: 更新時の「以前 compose した自分のファイルを消して置き直す」処理は残すが、grilling では対象がなく 0 件で終わる。廃止済みファイルの一覧（tombstone）は空
    category: policy
    applies_to: [Installer]
    trigger: compose 前
    logic: IF 投影に sensors / tools / knowledge / agents / scopes / stages がない（contributions のみ） THEN 消すものがなく refreshed = 0。contribution のマージは内容ベースで自動的に置き換わる
    violation: なし（決めた前提。参照先の処理を削らない）
    source: FR4.2, A2, OQ2（決めた前提）

  - id: BR8.10
    statement: 成功したインストールの provenance を `<harness dir>/tools/data/grilling-install.json` に、一時ファイルへ書いて rename する原子的な方法で書く。項目は version / ref / source / installed_at / payload_sha256 の 5 つ
    category: constraint
    applies_to: [InstallProvenance]
    trigger: compose 成功後
    logic: IF compose が成功 THEN 導入済みペイロードのダイジェストを計算し、5 項目を JSON で書く。`--dry-run` では書かない
    violation: 失敗した導入の provenance を書かない
    source: FR4.3, NFR5

  - id: BR8.11
    statement: "`--dry-run` は取得・検証・計画の表示までを行い、対象プロジェクトへ一切書かない"
    category: policy
    applies_to: [Installer]
    trigger: "`--dry-run` 指定"
    logic: IF `--dry-run` THEN build までは一時領域で行い、compose と provenance の書き込みを省いて計画（ハーネス、選択子、版、変更の有無）を表示する
    violation: dry-run で対象プロジェクトを変更しない
    source: FR4.1

  - id: BR8.12
    statement: 導入完了時に「次の質問ステージのモード選択に Grill me が 4 択目として現れる」ことと「エンジン更新後は `/aidlc plugin sync` を再実行する」ことを表示する
    category: policy
    applies_to: [Installer]
    trigger: provenance 書き込み後
    logic: IF 導入が成功 THEN 2 点の案内を表示する（`Changed 0` のときは案内を省く）
    violation: なし
    source: FR4.2, ADR-007

  # ---- BR9: リリースツール（FR5） ----
  - id: BR9.1
    statement: "`release.ts <version>` の引数は 1 つで、安定 SemVer（`X.Y.Z`）でなければならない"
    category: validation
    applies_to: [ReleaseTool]
    trigger: 起動時
    logic: IF 引数が 1 つでない OR 安定 SemVer でない THEN 使い方を表示して非 0 で終了
    violation: プレリリース版（`1.0.0-rc1` など）を受け付けない
    source: FR5.1

  - id: BR9.2
    statement: 事前検査 — ブランチが `main`、worktree が clean、タグ `v<version>` がローカルにもリモート（origin）にも存在しないこと
    category: validation
    applies_to: [ReleaseTool, ReleaseTag]
    trigger: 引数検査の後、変更の前
    logic: IF ブランチ != main OR `git status --porcelain` が空でない OR ローカルにタグあり OR リモートにタグあり THEN 失敗（何も変更しない）
    violation: 事前検査を 1 つでも落としたら変更に進まない
    source: FR5.1, ADR-002

  - id: BR9.3
    statement: "変更の順序 — manifest の version を更新 → `chore(release): publish v<version>` でコミット（`--allow-empty`。manifest が既に同じ版でも通す）→ タグ `v<version>` → `git push --atomic origin main v<version>`"
    category: policy
    applies_to: [ReleaseTool, PluginManifest, ReleaseTag]
    trigger: 事前検査の通過
    logic: IF 事前検査が通った THEN 上記の順に実行し、いずれかが失敗したらそこで止めて非 0 で終了する
    violation: push を省かない（参照先と同じ範囲）。コミット文言を変えない
    source: FR5.1, ADR-002

  - id: BR9.4
    statement: "`--check-tag <tag>` は tag が `v<stable semver>` で、manifest の version と一致するときだけ成功する"
    category: validation
    applies_to: [ReleaseTag, PluginManifest]
    trigger: CI のタグ push
    logic: IF tag が `v` で始まらない OR 残りが安定 SemVer でない OR manifest.version != tag の版 THEN 非 0 で終了
    violation: 不一致を警告で済ませない
    source: FR5.2

  - id: BR9.5
    statement: git 操作は関数として注入できるようにし、テストは実際の git を使わずに事前検査と変更の順序を検証する
    category: constraint
    applies_to: [ReleaseTool]
    trigger: テスト
    logic: IF テストから呼ぶ THEN 注入した git 関数が呼ばれた引数の列で検証する
    violation: なし
    source: FR5.3

  - id: BR9.6
    statement: "今回の完了に合わせて `release.ts 0.2.0` を実行して `v0.2.0` を公開し、README の Quickstart は `--tag v0.2.0` を例示する"
    category: policy
    applies_to: [ReleaseTool, DocumentationSet]
    trigger: Build and Test の完了後
    logic: IF CI が green THEN 0.2.0 を公開する
    violation: FR8 を含まない版を 0.2.0 として公開しない
    source: FR5.4

  # ---- BR10: 検証スイート（FR1、FR4.4、FR5.3） ----
  - id: BR10.1
    statement: 既存の自動検証（validate、7 ハーネスの build、テンプレート一致、アンカー解決、Claude / Kiro への compose、Claude の plugin-test、typecheck）を CI で green のまま維持する
    category: constraint
    applies_to: [VerificationSuite]
    trigger: CI
    logic: IF いずれかが失敗 THEN CI が失敗
    violation: 既存検査を外して通さない
    source: FR1.1

  - id: BR10.2
    statement: "テンプレート検査（`plugin.test.ts`）は新方式の固定トークンがテンプレートと 28 断片にあることを検査する — `Grill me`、BR2.5 の description 文、`(Recommended)`、`**Mode:** grill`、`**Pending:**`、`Decided assumptions`、`❓` / `➡️`、XL〜SS の 5 段階と Depth の対応表、1 問ずつへの切り替えの記述"
    category: constraint
    applies_to: [VerificationSuite, FragmentTemplate]
    trigger: "`bun test`"
    logic: IF いずれかのトークンが欠ける THEN 失敗。テンプレートの行数が 150 を超えても失敗
    violation: 旧文（one question at a time の description）が残っていたら失敗
    source: FR1.4, FR8.2, FR8.7

  - id: BR10.3
    statement: ライブ確認の画面 1（モード選択）は 4 択で、4 番目が `Grill me`、description が BR2.5 の文と逐語一致する
    category: constraint
    applies_to: [VerificationSuite]
    trigger: "`bun run test:live`（AIDLC_CLAUDE_SDK_LIVE=1）"
    logic: IF 選択肢が [Guide me, I'll edit the file, Chat, Grill me] でない OR description 不一致 THEN 失敗
    violation: なし
    source: FR1.2, FR1.4

  - id: BR10.4
    statement: ライブ確認の画面 2（Grill me を選んだ後の最初の画面）には 2 問以上 4 問以下が並び、各質問の先頭選択肢の label に `(Recommended)` が付く
    category: constraint
    applies_to: [VerificationSuite]
    trigger: "`bun run test:live`"
    logic: IF 質問数 < 2 OR > 4 OR いずれかの先頭 label に `(Recommended)` がない THEN 失敗
    violation: 1 問だけの画面 2 は失敗（まとめて出す方式の検証）
    source: FR1.4, Q3, OQ5

  - id: BR10.5
    statement: ライブ確認の画面 3 以降（停止まで）は 4 問以下で、各質問の先頭選択肢に `(Recommended)` が付く。質問どうしの独立性はテストで機械判定せず、記録に人が読んだ結果を書く
    category: constraint
    applies_to: [VerificationSuite]
    trigger: "`bun run test:live`"
    logic: IF 質問数 > 4 OR 先頭 label に `(Recommended)` がない THEN 失敗。独立性の判定はしない
    violation: なし
    source: FR1.4, Q3

  - id: BR10.6
    statement: "ライブ確認の帳簿検査 — 質問ファイルに記入済みの `[Answer]:` と `**Mode:** grill` があり、監査記録に `Options: Guide me,I'll edit the file,Chat,Grill me`、`QUESTION_ANSWERED` に Grill me、`DECISION_RECORDED` が 3 件以上ある"
    category: constraint
    applies_to: [VerificationSuite]
    trigger: "`bun run test:live`"
    logic: IF いずれかが欠ける THEN 失敗
    violation: なし
    source: FR1.4, FR8.5

  - id: BR10.7
    statement: ライブ確認の実行後、`docs/live-check-<日付>.md` にハーネス・モデル・観測したラウンド数と質問数・`**Mode:** grill` の件数・画面ごとの質問の独立性を人が読んだ結果を書く。旧記録 `docs/live-check-2026-09-03.md` は残す
    category: policy
    applies_to: [VerificationSuite]
    trigger: ライブ確認の完了
    logic: IF ライブ確認が完了 THEN 記録を新設し、完了記録から両記録を参照する
    violation: 記録のないライブ確認を成功と数えない
    source: FR1.2, FR1.3, Q3

  - id: BR10.8
    statement: "`installer.test.ts` — ローカル checkout からの `--from` 導入で 28 ステージに断片が入る、`--dry-run` は対象を変更しない、2 回目の実行は `Changed 0`、provenance が 5 項目を持つ、パストラバーサルとリンクを含むアーカイブを拒否する"
    category: constraint
    applies_to: [VerificationSuite, Installer]
    trigger: "`bun test`"
    logic: IF いずれかが失敗 THEN CI が失敗
    violation: なし
    source: FR4.4, NFR2, NFR5, NFR6

  - id: BR10.9
    statement: "`release.test.ts` — SemVer 検査、事前検査 4 種、manifest の更新、git の注入による変更の順序、`--check-tag` の一致と不一致"
    category: constraint
    applies_to: [VerificationSuite, ReleaseTool]
    trigger: "`bun test`"
    logic: IF いずれかが失敗 THEN CI が失敗
    violation: なし
    source: FR5.3

  - id: BR10.10
    statement: CI の所要時間は 15 分以内に収める。ライブ確認と選択キー環境の確認は opt-in（環境変数）で CI には含めない
    category: constraint
    applies_to: [VerificationSuite]
    trigger: CI
    logic: IF `timeout-minutes: 15` を超える THEN 失敗
    violation: なし
    source: NFR1, ADR-005

  # ---- BR11: 開発環境設定（FR5.2、FR6.2、FR6.3） ----
  - id: BR11.1
    statement: "CI はタグ push（`refs/tags/*`）のとき `bun grilling/scripts/release.ts --check-tag $GITHUB_REF_NAME` を実行し、不一致を失敗にする"
    category: constraint
    applies_to: [DevEnvironmentConfig]
    trigger: タグ push
    logic: IF `github.ref_type == tag` THEN `--check-tag` を実行
    violation: なし
    source: FR5.2

  - id: BR11.2
    statement: "`mise.toml` の bun の版は CI の `setup-bun` の版（1.3.13）と一致する"
    category: constraint
    applies_to: [DevEnvironmentConfig]
    trigger: 版の更新
    logic: IF 2 つの版が異なる THEN 同じ変更で揃える（Renovate が両方を更新する）
    violation: なし
    source: FR6.2

  - id: BR11.3
    statement: "`renovate.json` は `config:recommended` に、bun ランタイムと `@types/bun` の同時更新、GitHub Actions の一括 PR を加える。このリポジトリに無い規則（ソルバー固定など）は持ち込まない"
    category: constraint
    applies_to: [DevEnvironmentConfig]
    trigger: 設定の作成
    logic: IF 3 規則のいずれかが欠ける OR 無関係の規則がある THEN 直す
    violation: なし
    source: FR6.3, C5

  # ---- BR12: 文書の内容の方針（FR1.3、FR2、FR3、FR6.1、FR6.4） ----
  - id: BR12.1
    statement: 新設する README と decisions は ja / en の対で作り、見出しと項目を一致させる
    category: policy
    applies_to: [DocumentationSet]
    trigger: 文書の作成・更新
    logic: IF 一方を変えた THEN 同じ変更でもう一方も変える
    violation: 片方だけの文書を作らない
    source: NFR3, FR3.1, FR6.1

  - id: BR12.2
    statement: "計画書 `docs/plugin-plan.md` を完了記録にする — 命名 `grilling`・配置 `grilling/`・`sync-contributions.ts`・実アンカーの反映、§3 を新方式（ラウンド・推奨回答・決めた前提・Depth 対応）に差し替え、§8 / §10 の各項目に 済 / N/A / 残（N/A は §8-2 と §8-5、残は他 6 ハーネスの `--install` と番号付きプローズ系のライブ確認）、§9 に確定した 3 事実、成功指標 3 の証拠（旧記録と新記録の所在と集計）"
    category: policy
    applies_to: [DocumentationSet]
    trigger: Code Generation
    logic: IF 計画書を更新する THEN 上記の項目をすべて含める
    violation: 実態と食い違う記述を残さない
    source: FR1.3, FR2.1, FR2.2, FR2.3

  - id: BR12.3
    statement: "ルート README（ja / en）は Highlights / Quickstart（Requirements、Install、Adopting mid-project、Alternative: host plugin store）/ Development / Repository layout / Documentation / Getting help / License の 7 見出しを持ち、Install は `curl | bun -` に `--tag v0.2.0` を推奨、代替として Claude Code と Codex の store 経由を示し、Adopting mid-project は「合成は追加のみ」「次の質問ステージ（単一ステージ実行を含む）から現れる」「エンジン更新後は `/aidlc plugin sync`」を書き、License 節から `LICENSE`（MIT）を参照し、ja / en が相互リンクする"
    category: policy
    applies_to: [DocumentationSet]
    trigger: Code Generation
    logic: IF README を作る THEN 上記の項目をすべて含める
    violation: なし
    source: FR3.1, FR3.2, FR3.3, FR3.4, OQ3（決めた前提）

  - id: BR12.4
    statement: "`grilling/docs/decisions.md` と `decisions.ja.md` は 7 件の決定（contributions のみ、`grill-me` → `grilling`、アンカー選定、テンプレートの置き場、Claude 限定の検証、参照先との同等品質上限、取り込み元現行版の採用と Depth 対応）を持ち、NG1（選択キー環境）の結果を記録する。否定的な結果なら README の Limits にも書く"
    category: policy
    applies_to: [DocumentationSet]
    trigger: Code Generation、NG1 の確認後
    logic: IF decisions を作る THEN 7 件と NG1 の結果を含める
    violation: なし
    source: FR6.1, NG1

  - id: BR12.5
    statement: プラグイン README（`grilling/README.md` / `README.ja.md`）の Install / Development / How the mode works を、インストーラ・リリースツール・ルート README・新方式（ラウンド・推奨回答・決めた前提・Depth 対応・1 問ずつへの切り替え）と整合させる
    category: policy
    applies_to: [DocumentationSet]
    trigger: Code Generation
    logic: IF 手順や仕様が変わった THEN プラグイン README も同じ変更で更新する
    violation: 手順と仕様が食い違う README を残さない
    source: FR6.4
```

## Part B — 要約表

| 群 | 対象 | 要点 | 出典 |
|---|---|---|---|
| BR1.1〜1.3 | 面接・決定・ラウンド | 決定の木を作り、前提の揃った独立な質問だけを 1 ラウンドに入れ、答えのたびに計算し直す | FR8.1 |
| BR2.1〜2.5 | 質問・ラウンド・断片 | 番号・題・本文・推奨（理由 1 行）。Claude Code は推奨先頭＋`(Recommended)`、他は ❓/➡️。4 問ずつ画面分割。4 択目の固定文 | FR8.2、C3 |
| BR3.1〜3.3 | 事実の調査 | 聞かずに調べる。`**Pending:**` で先に追記。待たずに残りを出す | FR8.3、Q4 |
| BR4.1〜4.3 | 終了と確認 | フロンティアが空で終了。summary＋決めた前提の一括確認。異議は質問に格上げ | FR8.4、Q2 |
| BR5.1〜5.4 | 帳簿 | 提示前に追記、受領次第書き戻し＋`**Mode:** grill`、画面ごとに decision / answer、決めた前提の節 | FR8.5、FR8.7 |
| BR6.1〜6.3 | 1 問ずつ | Corrections の行を趣旨で判断、会話中の指示も受ける。計算と帳簿は変えない | FR8.6、Q5 |
| BR7.1〜7.4 | 決定の大きさ | 2 つの問いかけで 5 段階。Depth → 閾値（L / M / S）。未満は決めた前提。迷ったら大きい方 | FR8.7、Q1 |
| BR8.1〜8.12 | インストーラ | 引数・選択子・`--update`・manifest 検証、アーカイブ安全性、書き込み境界、冪等、合成経路、no-op の置き直し、provenance、dry-run、完了案内 | FR4、NFR2/5/6 |
| BR9.1〜9.6 | リリース | 安定 SemVer、事前検査 4 種、更新→コミット→タグ→atomic push、`--check-tag`、git 注入、0.2.0 | FR5 |
| BR10.1〜10.10 | 検証スイート | 既存検査の維持、テンプレートのトークン検査、ライブ確認（画面 1〜3＋帳簿）、記録、installer / release のテスト、15 分 | FR1、FR4.4、FR5.3、NFR1 |
| BR11.1〜11.3 | 開発環境 | CI のタグ検査、mise と CI の bun 版一致、renovate の 3 規則 | FR5.2、FR6.2、FR6.3 |
| BR12.1〜12.5 | 文書の内容 | ja/en 対、計画書の完了記録の項目、ルート README の項目、decisions の 7 件＋NG1、プラグイン README の整合 | FR1.3、FR2、FR3、FR6.1、FR6.4 |
