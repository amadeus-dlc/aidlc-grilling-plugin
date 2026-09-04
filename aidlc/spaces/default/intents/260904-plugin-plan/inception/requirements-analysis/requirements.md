# 要求一覧 — Grill me プラグイン計画の完了と、取り込み元スキル現行版の取り込み

## 上流の入力

この要求は次の成果物と確認済み回答（`requirements-analysis-questions.md` の Q1〜Q14。Q8〜Q14 は構成決定の途中で要求整理へ戻って追加したもの）から導いた。

- 意図: `aidlc/spaces/default/intents/260904-plugin-plan/ideation/intent-capture/intent-statement.md`（成功指標 1〜3、利用者、境界）
- 既存構造の把握（`aidlc-workflows` の知識ベース）: `aidlc/spaces/default/codekb/aidlc-workflows/business-overview.md`（プラグイン機構の位置づけ、contributions のみのプラグインの扱い）、`aidlc/spaces/default/codekb/aidlc-workflows/architecture.md`（validate → build/emit → install → compose/sync → recompile の流れ、`after-questions` 未実装、選択・doctor 検出の前提）、`aidlc/spaces/default/codekb/aidlc-workflows/code-structure.md`（プラグイン系ツールの配置と規約）
- 参照実装: 姉妹プラグイン `deep-spec-analysis`（`/Users/j5ik2o/Sources/j5ik2o.github.com/j5ik2o/deep-spec-analysis`）。品質の上限を定める基準であり、それを超える作り込みは求めない（Q6）
- 取り込み元スキル: Matt Pocock が公開する `grilling` スキルの現行版（GitHub `mattpocock/skills` の `main`、`skills/productivity/grilling/SKILL.md` と `docs/productivity/grilling.md`、2026-09-04 取得）。逐語コピーは `<record>/inception/domain-design/upstream-grilling-SKILL.md` と `upstream-grilling-doc.md`（Q8）

## Intent analysis（何を達成したいか）

計画書 `docs/plugin-plan.md` を「完了」の状態にする。完了とは、(1) 計画書の残項目が Claude Code の範囲で検証済みであること、(2) 計画書自体が実装の実態と完了状況を反映した記録になっていること、(3) リポジトリとしての体裁（README・インストーラ・リリース・文書・開発環境）が姉妹プラグイン deep-spec-analysis と同等であること、の 3 点である。これに加えて、Grill me モードの中身を取り込み元スキルの現行版（前提の揃った質問をまとめて出す方式）に合わせ、AI-DLC の Depth と「どの大きさの決定まで人に聞くか」を対応づける（Q8・Q9・Q14）。利用者は AI-DLC v2 を使う開発者全般（7 ハーネス）だが、今回の検証範囲は Claude Code に限定し、他ハーネスは今後の課題として記録する（Q1・Q2）。

## Functional requirements（機能要求）

### FR1 — 検証の完了（計画書 §8 相当、Claude Code の範囲）

- **FR1.1** 既存の自動検証（`aidlc-plugin-validate`、7 ハーネスの `aidlc-plugin-build`、`tests/plugin.test.ts` の単体テスト、Claude・Kiro への compose テスト、Claude の `aidlc-plugin-test.ts --install`、`sync-contributions.ts --check`、typecheck）が CI で green のまま維持されること。合否: CI の全ステップが成功する。（出典: 意図の成功指標 1、Q1）
- **FR1.2** ライブ確認は Claude Code のみで行う。FR8 の新方式で `bun run test:live` をやり直し、`docs/` にその記録（日付付き）を残す。既存の `docs/live-check-2026-09-03.md` は旧方式の記録として保持し、完了記録から両方を参照する。合否: 新方式の記録が `docs/` にあり、完了記録が両記録を所在付きで参照している。（出典: 意図の成功指標 2 を Q2 で上書き、Q13）
- **FR1.3** 「実プロジェクトで Grill me を 1 ステージ分使い切る」は grilling-sandbox の既存記録（8 問すべて `**Mode:** grill`、質問ファイルと監査記録が毎問更新）で充足したとみなし、FR1.2 でやり直した新方式の記録も証拠に加える。完了記録にその証拠（記録の所在と集計）を書く。合否: 完了記録に両記録の所在と集計がある。（出典: 意図の成功指標 3、Q3、Q13）
- **FR1.4** テスト（`tests/plugin.test.ts` の断片検査、`tests/live-claude.test.ts` のメニュー検証）を FR8 の新方式（まとめて出す・推奨回答・決めた前提）に更新する。「メニュー 2・3 は 1 問ずつ」の検証は「1 回の画面に前提の揃った質問がまとまって出る（4 問まで）」の検証に置き換える。合否: 更新後のテストが CI で通る。（出典: Q13、Q14）

### FR2 — 計画書を完了記録にする

- **FR2.1** `docs/plugin-plan.md` を実装の実態に合わせて更新する: プラグイン名 `grilling`（計画の `grill-me`）、配置はリポジトリ直下 `grilling/`（計画の `plugins/grill-me/`）、`scripts/sync-contributions.ts`（28 断片の drift guard）の追加、code-generation の実アンカー（計画の「要確認」を確定値に）、§3 の Grill me 仕様を FR8 の新方式（まとめて出す・Depth 対応）に差し替え。合否: 計画書の記述と `grilling/` の実態に食い違いがない。（出典: Q4、Q8、意図の問題定義）
- **FR2.2** 計画書 §8（検証手順）と §10（作業手順）の各項目に完了状況を付ける: 済 / N/A / 残（対象外）。N/A は §8-2（`scripts/package.ts`）と §8-5（`tests/run-tests.sh --level integration`。いずれもフレームワーク repo 内専用）。残は「Claude 以外 6 ハーネスの `aidlc-plugin-test.ts --install`」と「番号付きプローズ系ハーネスでの実機ライブ確認」で、今後の課題として明記する。合否: 各項目に 3 値のいずれかが付き、残の 2 件が列挙されている。（出典: Q1、Q2、Q4）
- **FR2.3** 計画書 §9 のリスク表を、既存構造の把握で確定した事実で更新する: `after-questions` アンカーは compose で drop される（`compose.ts` の `locateAnchor` に分岐なし）、validate は anchor / fragment の対応を検査しないため compose 層のテストが必須、エンジン更新でマージが消えるため `plugin sync` の再実行が必要。合否: 3 点が表に反映されている。（出典: architecture.md「Improvement Opportunities」、business-overview.md）

### FR3 — ルート README と LICENSE（deep-spec-analysis と同等）

- **FR3.1** リポジトリ直下に `README.md` と `README.ja.md` を置き、参照先と同じ構成にする: Highlights / Quickstart（Requirements、Install into your AI-DLC project、Adopting mid-project、Alternative: install through the host plugin store）/ Development / Repository layout / Documentation / Getting help / License。合否: 両ファイルに上記見出しがすべてあり、相互リンクがある。（出典: Q6-A）
- **FR3.2** Quickstart の Install は FR4 のインストーラを `curl | bun -` で使う手順（`--tag` によるタグ固定インストールを推奨）を示し、host plugin store 経由（Claude Code の `/plugin marketplace add` + `/plugin install aidlc-grilling@aidlc-plugins`、Codex の `codex plugin ...`）を代替として示す。合否: 両経路のコマンドが README にある。（出典: Q6-A、Q6-B、business-overview.md「プラグイン作者」）
- **FR3.3** Adopting mid-project は grilling の実態に合わせる: 合成は追加のみで、既存ワークフローの次の質問ステージから Grill me が現れること、エンジン更新後は `/aidlc plugin sync` を再実行すること。合否: 両点が記載されている。（出典: Q6-A、architecture.md D1）
- **FR3.4** `LICENSE` をリポジトリ直下に置き、README の License 節から参照する。ライセンス種別は参照先と揃える（Assumption A1）。合否: ファイルが存在し README が参照している。（出典: Q6-A）

### FR4 — インストーラ `grilling/scripts/install.ts`

- **FR4.1** 1 コマンドでターゲットの AI-DLC プロジェクトへ導入する: `--project <path>` 必須、`--harness <name>`（既定 `claude`、7 ハーネスのいずれか）、ソース選択子 `--tag vX.Y.Z` / `--from <repo-root>` / `--ref <branch>`（選択子なしは最新の安定 SemVer タグ）、`--update`（前回の選択子を再利用、選択子との併用不可）、`--dry-run`。合否: 各フラグが README の表どおりに動く。（出典: Q6-B、参照先 `scripts/install.ts`）
- **FR4.2** 動作: ソースを取得（タグ / ブランチは GitHub のソースアーカイブ、`--from` はローカル checkout）→ `aidlc-plugin-build.ts` でハーネス投影を生成 → store 系ハーネス（Claude Code、Codex、Copilot、opencode）は `dist/` から直接 compose、storeless 系（Kiro、Kiro IDE、Cursor）は投影をプロジェクト直下へフォルダドロップしてから compose → `aidlc plugin sync` があればそれを、無ければ投影の `hooks/compose.ts` を実行。合否: Claude Code 向けの実行で 28 ステージに断片が入り、2 回目の実行が `Changed 0` になる。（出典: Q6-B、architecture.md「Data Flow」3〜4）
- **FR4.3** 各成功インストールの provenance を `<harness>/tools/data/grilling-install.json` に記録する（バージョン、解決したソース選択子、時刻、ペイロードのダイジェスト）。合否: ファイルが生成され 4 項目を含む。（出典: Q6-B）
- **FR4.4** インストーラのテストを `grilling/tests/` に置く（ローカル checkout からの `--from` 導入、`--dry-run`、2 回目の冪等性、provenance の内容）。合否: `bun test` に含まれ CI で通る。（出典: Q6-B、org.md Testing Posture）

### FR5 — リリース機構

- **FR5.1** `grilling/scripts/release.ts <version>` を用意する: 安定 SemVer のみ受け付け、`.aidlc-plugin/plugin.json` の `version` を更新し、`chore(release): publish vX.Y.Z` でコミットして `vX.Y.Z` タグを打つ。合否: 実行後に manifest・コミット・タグが揃う。（出典: Q6-C、参照先 `scripts/release.ts`）
- **FR5.2** CI はタグ push 時に `release.ts --check-tag $GITHUB_REF_NAME` を実行し、タグと manifest のバージョン不一致を失敗にする。合否: 不一致のタグで CI が失敗する。（出典: Q6-C、参照先 `.github/workflows/ci.yml`）
- **FR5.3** リリーススクリプトのテストを `grilling/tests/` に置く（SemVer 検査、manifest 更新、git 操作の注入）。合否: `bun test` に含まれ CI で通る。（出典: Q6-C）
- **FR5.4** 今回の完了に合わせて 0.2.0 を公開する（`v0.2.0` タグ）。FR8 の取り込みも 0.2.0 に含める。合否: タグが存在し、README の Quickstart が `v0.2.0` を例示する。（出典: Q7、要求整理へ戻る際の選択「0.2.0 に含める」）

### FR6 — 文書と開発環境

- **FR6.1** `grilling/docs/decisions.md` と `decisions.ja.md` を新設し、これまでの決定を記録する: contributions のみで作る判断、`grill-me` → `grilling` の命名、アンカーの選定（`after-questions` 不採用）、断片テンプレートを `tests/fragment-template.md` に置く判断、検証範囲を Claude に限定した判断、参照先との同等品質を上限とした判断、取り込み元スキル現行版（まとめて出す方式）の採用と Depth との対応（FR8）。合否: 両ファイルに上記 7 件がある。（出典: Q6-D、Q1、Q2、Q8、Q9）
- **FR6.2** `mise.toml` をリポジトリ直下に置き、bun を CI（`setup-bun` 1.3.13）と同じ版に固定する。合否: `mise.toml` と `ci.yml` の bun 版が一致する。（出典: Q6-D）
- **FR6.3** `renovate.json` をリポジトリ直下に置く（`config:recommended`、bun ランタイムと `@types/bun` の同時更新、GitHub Actions の一括 PR）。ソルバー固定などこのリポジトリに無い規則は持ち込まない。合否: ファイルが妥当な JSON で上記 3 規則を含む。（出典: Q6-D）
- **FR6.4** プラグイン README（`grilling/README.md` / `README.ja.md`）の Install・Development・How the mode works を、インストーラ・リリース機構・ルート README・FR8 の新方式と整合させる。合否: 手順と仕様が食い違わない。（出典: 意図の記録・共有要件、Q6、Q8）

### FR8 — Grill me モードを取り込み元スキルの現行版に合わせる

取り込み元スキルの 5 要素（Q8）を、AI-DLC の質問ファイル・監査記録・最後の確認の仕組みに載せて断片（`tests/fragment-template.md` → 28 contribution）に表現する。

- **FR8.1 決定の木とフロンティア**: 相談内容を「決定の木」（ひとつ決めると、その下にぶら下がる決定が見えてくる）として捉え、前提がすべて決まった質問の集合（フロンティア）を 1 回（ラウンド）でまとめて出す。同じラウンドの質問は互いに独立で、片方の答えで変わる質問は次のラウンドに回す。答えを受けるたびにフロンティアを計算し直す。合否: 断片に「フロンティア」「ラウンド」「依存する質問は次のラウンド」の規則が取り込み元と同じ意味で書かれている。（出典: Q8、Q14、取り込み元 SKILL.md）
- **FR8.2 質問の書式と画面分割**: 各質問に番号・題名・本文と推奨回答（理由 1 行）を付ける。番号付きプローズで描画するハーネスと質問ファイルでは取り込み元の書式（`❓ **Qn** - **題**: 本文` / `➡️ 推奨回答` / `---` 区切り）を使い、Claude Code では推奨選択肢を先頭に置いて「(Recommended)」を付ける現行の表現を使う。Claude Code の画面は 1 回 4 問までなので、5 問以上のラウンドは 4 問ずつ画面を分けて出す（同じラウンド内は独立なので分割しても意味は変わらない）。合否: 断片に両描画の規則と分割規則がある。（出典: Q8、Q14、C3）
- **FR8.3 事実の調査**: ファイルの中身など調べれば分かることは利用者に聞かない。Claude Code ではサブエージェントに調べさせ、呼べないハーネスでは自分で調べる。調べ終わるのを待たず、その結果に依存しない残りのフロンティアを先に出す。断片はハーネスを限定しない書き方（「調べさせるか自分で調べる」）にする。合否: 断片に「聞かずに調べる」「待たずに残りを出す」の規則がある。（出典: Q8、Q12）
- **FR8.4 終了と共有理解の確認**: フロンティアが空になったら質問を終え、AI-DLC の consolidated summary（Looks correct / Request changes）を「同じ理解に至ったかの確認」として使う。確認前に成果物を生成しない。合否: 断片が summary 確認への合流を明記している。（出典: Q8、stage-protocol §3 Step 3a）
- **FR8.5 帳簿**: 質問は聞く直前に質問ファイルへ追記する（ラウンド単位。空の `[Answer]:` 付き）。回答は受け取り次第 `[Answer]:` に書き戻し、直下に `**Mode:** grill` を置く。各ラウンドの提示前後に `aidlc-log.ts decision` / `answer` を記録する。合否: 断片に追記・書き戻し・記録の規則があり、FR1.2 の記録で毎ラウンド更新が確認できる。（出典: Q8、Q14、既存断片、計画書 §3.2）
- **FR8.6 1 問ずつへの切り替え**: `aidlc/spaces/<space>/memory/project.md` の `## Corrections` に「Grill me は 1 問ずつ聞く」旨の 1 行があれば、ラウンドを 1 問ずつに分けて出す（フロンティアの計算と帳簿は変えない）。合否: 断片にこの切り替え規則がある。（出典: Q14、取り込み元 docs「Can I go back to one question at a time?」）
- **FR8.7 Depth と決定の解像度**: 決定を大きさで 5 段階に分ける — XL（解の形を変える。境界・アーキテクチャ様式・データの所有者。戻すのが高くつく）、L（コンポーネントの責務やコンポーネント間の契約を変える）、M（コンポーネント内で利用者に見える挙動。ルール・ワークフロー・エラー時の扱い）、S（局所の選択。既定値・命名・形式・閾値。数分で戻せる）、SS（利用者に見えない微細な選択）。Depth によって人に聞く下限を変える: Minimal は XL・L、Standard は M まで、Comprehensive は S まで。SS は常にエージェントが決める。閾値以下の決定は推奨回答で決め、そのラウンドの「決めた前提」として質問ファイルに明示し、FR8.4 の確認で一括確認する。合否: 断片に 5 段階の定義と Depth の対応表、「決めた前提」の書き方がある。（出典: Q9）

## Non-functional requirements（非機能要求）

いずれも Q&A で個別に確認した項目ではなく、参照先 deep-spec-analysis と同等（Q6、C5）であることから導いたエンジニアリング上の推定である。承認ゲートで異議があれば外す。

- **NFR1** CI の所要時間は現行の `timeout-minutes: 15` 内に収める（検証範囲が Claude のみのため、追加はインストーラ・リリースのテストに限る）。合否: CI が timeout せずに完了する。（出典: Q1・Q2 の Claude 限定から導出。参照先 `ci.yml` も 15 分）
- **NFR2** 冪等性: インストーラと compose の再実行は対象プロジェクトを変更しない（`Changed 0` / バイト同一）。合否: FR4.4 のテストで検証。（出典: 参照先 README「Composition is idempotent」、既存テスト「a second compose is a byte-identical no-op」）
- **NFR3** 二言語の対（ja / en）: 新設する README・decisions は必ず両言語を用意し、内容を一致させる。合否: 対応ファイルが揃っている。（出典: 参照先の README / decisions が ja・en 対、既存 `grilling/README{,.ja}.md`）
- **NFR4** 依存ゼロ: `install.ts` と `release.ts` は bun と `node:*` 組込みのみに依存し、対象プロジェクトに何もインストールしない。合否: `package.json` の dependencies が増えない。（出典: 参照先 `install.ts` / `release.ts` の import、code-structure.md「オフライン前提・依存ゼロ」）
- **NFR5** 再現性: タグ指定インストールは不変のソースアーカイブから導入し、provenance にダイジェストを残す。合否: 同じタグで 2 回導入した provenance のダイジェストが一致する。（出典: 参照先 README「immutable tag」、FR4.3）
- **NFR6** 安全性: インストーラは symlink を追わず、`--project` の外へ書き込まず、認証情報を扱わない。合否: テストで symlink と外部パスが拒否される。（出典: 参照先 `installer.test.ts`「rejects path traversal and archive links」、code-structure.md「symlink 拒否」）

## Constraints（制約）

- **C1** grilling は contributions のみのプラグインのまま（stages / agents / scopes / sensors / tools を持たない）。（意図の問題定義、business-overview.md）
- **C2** エンジンは submodule `aidlc-workflows` の `v2.7.0-1-ga277af21` に固定。`after-questions` アンカーは使えず、貢献はステージごとの `after-step:N` / `before-step:N` / `end-of-steps` に依存する。（architecture.md）
- **C3** Claude Code の構造化質問は 1 回 4 問・各 4 選択肢が上限で、Grill me はモード選択の最後の枠を使う。（意図のステークホルダーマップ「影響者」、question-rendering.md）
- **C4** エンジンの再インストール・更新で合成済み断片は消えるため、利用者は `/aidlc plugin sync` を再実行する。（architecture.md D1）
- **C5** 品質の上限は deep-spec-analysis との同等。判定手順: 参照先に対応するファイルまたは仕組みが存在するときだけ真似る。存在しないもの（例: CHANGELOG ファイル、npm 配布、GitHub Release アセット、CI バッジ）は導入しない。（Q6）
- **C6** 検証範囲は Claude Code のみ。意図の成功指標 2 の「番号付きプローズ系ハーネス 1 つ」は本要求で上書きされ、残の課題として FR2.2 に記録する。（Q1、Q2）
- **C7** 取り込み元スキルの版は 2026-09-04 取得の `main`（記録内の逐語コピーが正本）。取り込み元の「質問数に上限を設けない」方針は、FR8.7 の解像度による絞り込みで置き換える（数ではなく大きさで絞る）。（Q8、Q9）

## Assumptions（前提）

- **A1** `LICENSE` の種別は参照先 deep-spec-analysis と同じ MIT にする（構成決定の下書きで MIT が選ばれていたが、ステージのやり直しで改めて確定する）。
- **A2** インストーラは参照先 `scripts/install.ts` の設計を写して作れる。grilling は `tools/` を持たないため、参照先の「更新時に以前 compose した自分のファイルを更新する」処理は不要か no-op になる（構成決定で確認）。
- **A3** 成功指標 3 の証拠として使う grilling-sandbox の記録は `docs/live-check-2026-09-03.md` に集約されており、旧方式の証拠としてはそのまま使える。

## Out of scope（対象外）

- Claude 以外 6 ハーネスでの `aidlc-plugin-test.ts --install` と、番号付きプローズ系ハーネスでの実機ライブ確認（今後の課題として FR2.2 に記録）。（Q1、Q2）
- このリポジトリ自身に grilling を compose する dogfooding。（Q3）
- 実装を計画書の命名・配置（`plugins/grill-me/`）に合わせる変更。（Q4）
- 選択キー環境の検出リスクを受け入れ基準にすること、上流フレームワークへの issue 起票。（Q5）
- Grill me 以外のモード（Guide me / I'll edit the file / Chat）の変更、`/grilling` スキルへの依存、取り込み元の周辺スキル（grill-with-docs、wayfinder 等）の取り込み。（計画書 §3.3、Q8）

## Non-gating（記録のみ）

完了の必須条件ではない作業。結果は記録するが、未達でも完了を妨げない。

- **NG1** `harness.json` に `plugins` 選択キーがある使い捨て install で、contributions のみの `grilling` が `select-plugins` で有効化できるか、貢献がマージされるか、`/aidlc --doctor` の「Composed plugin surface」に現れるかを確認し、結果を `docs/decisions` に記録する。否定的な結果なら README の Limits にも書く。（出典: Q5、business-overview.md 4、architecture.md「Improvement Opportunities」4）

## Open questions（後続ステージへ）

- **OQ1** NG1 の検証に使う install はどれか（`grilling-sandbox` に `plugins` キーを足すか、新規の使い捨て install か）— 構成決定で決める。
- **OQ2** A2 の確認: インストーラの「以前 compose したファイルの更新」を残すか外すか。
- **OQ3** ルート README の「Adopting mid-project」で、単一ステージ実行（参照先の `--single`）に相当する案内が grilling にあるか（無ければ「次の質問ステージから有効」とだけ書く）。
- **OQ4** FR8.7 の 5 段階を、断片の中でエージェントがぶれずに当てはめられる判定文（例・反例）にどう書くか — 挙動設計で決める。
- **OQ5** FR1.4 のライブテストで「1 回の画面に前提の揃った質問がまとまって出る」ことをどう検証するか（1 ラウンド目の質問数の下限、依存する質問が同じ画面に出ないことの検査方法）— 挙動設計で決める。

## Traceability（意図との対応）

| 要求 | 意図の根拠 | 確認済み回答 |
|------|-----------|--------------|
| FR1.1 | 成功指標 1 | Q1 |
| FR1.2 | 成功指標 2（上書き） | Q2、Q13 |
| FR1.3 | 成功指標 3 | Q3、Q13 |
| FR1.4 | 成功指標 1 | Q13、Q14 |
| FR2.1〜FR2.3 | 問題定義「計画書の残項目」、記録・共有要件 | Q4、Q8 |
| FR3.1〜FR3.4 | 利用者「配布物として仕上げる」、記録・共有要件 | Q6-A |
| FR4.1〜FR4.4 | 利用者「7 ハーネスの利用者」 | Q6-B |
| FR5.1〜FR5.4 | 利用者「配布物として仕上げる」 | Q6-C、Q7 |
| FR6.1〜FR6.4 | 記録・共有要件（docs・README） | Q6-D |
| FR8.1〜FR8.7 | 問題定義「Grill me を完了させる」、利用者「7 ハーネスの利用者」 | Q8、Q9、Q12、Q14 |
| NG1 | 既存構造の把握のリスク | Q5 |

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-04T08:09:41Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Minor | requirements.md > FR8.7、Open questions > OQ4 | FR8.7 の合否基準は「断片に 5 段階の定義と Depth 対応表、『決めた前提』の書き方がある」という存在チェックであり、エージェントが個々の決定を XL/L/M/S/SS のどこに分類すべきかをぶれずに判定できるかは検証していない。この判定文（例・反例）は OQ4 として次段階（挙動設計）に明示的に先送りされており、隠れた欠落ではないが、要求整理の時点では FR8.7 は「仕様が書かれていること」までしか保証しない。 | 承認時にこの限定を認識した上で進める、または挙動設計で OQ4 の判定文が具体化されるまで FR8.7 の完了を保留する運用にする。 | New |
| R-02 | Minor | requirements.md > FR8.2、Open questions > OQ5 | FR8.2 の「5 問以上のラウンドは 4 問ずつ画面を分ける」規則と FR1.4 の新方式ライブ確認は、「1 ラウンド目の質問数の下限」「依存する質問が同じ画面に出ないことの検査方法」を OQ5 として挙動設計に先送りしている。そのため FR1.4 の合否基準（更新後のテストが CI で通る）は、テストの中身がまだ確定していない段階での承認になる。 | 挙動設計で OQ5 の検証方法が具体化された時点で、FR1.4 のテスト設計をレビューし直す。 | New |

### Summary

前回指摘（NFR の出典欠如、FR7 の非ゲート化、C5 の境界判定）はいずれも本版で解消されている。追加された FR8 は取り込み元スキル `grilling`（design tree／frontier／round／❓➡️ 書式／sub-agent による事実調査／frontier が空になるまで行動しない）の 5 要素を忠実に AI-DLC の語彙（質問ファイル・監査記録・consolidated summary）へ移し替えており、上流が明示的に拒否する「質問数の上限」ではなく「決定の大きさ」で絞り込む設計（C7・FR8.7）になっている点も確認できた。FR8 が意図の当初境界（「計画を完了させる」）を超える追加である事実も、上流の入力節と Intent analysis 節に Q8〜Q14 の出典として明記されており、隠れたスコープ拡張ではない。Q3（サンドボックス記録で充足）と Q13（新方式でのライブ確認やり直し）は FR1.2／FR1.3 で矛盾なく両立させている。残る懸念は FR8.7 と FR8.2 の一部合否基準が OQ4／OQ5 として挙動設計に先送りされている点（R-01, R-02）で、いずれも Minor であり、承認済み Critical/Major はゼロ。
