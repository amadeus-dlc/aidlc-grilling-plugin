# 要求一覧 — Grill me プラグイン計画の完了

## 上流の入力

この要求は次の成果物と確認済み回答（`requirements-analysis-questions.md` の Q1〜Q7）から導いた。

- 意図: `aidlc/spaces/default/intents/260904-plugin-plan/ideation/intent-capture/intent-statement.md`（成功指標 1〜3、利用者、境界）
- 既存構造の把握（`aidlc-workflows` の知識ベース）: `aidlc/spaces/default/codekb/aidlc-workflows/business-overview.md`（プラグイン機構の位置づけ、contributions のみのプラグインの扱い）、`aidlc/spaces/default/codekb/aidlc-workflows/architecture.md`（validate → build/emit → install → compose/sync → recompile の流れ、`after-questions` 未実装、選択・doctor 検出の前提）、`aidlc/spaces/default/codekb/aidlc-workflows/code-structure.md`（プラグイン系ツールの配置と規約）
- 参照実装: 姉妹プラグイン `deep-spec-analysis`（`/Users/j5ik2o/Sources/j5ik2o.github.com/j5ik2o/deep-spec-analysis`）。品質の上限を定める基準であり、それを超える作り込みは求めない（Q6）

## Intent analysis（何を達成したいか）

計画書 `docs/plugin-plan.md` を「完了」の状態にする。完了とは、(1) 計画書の残項目が Claude Code の範囲で検証済みであること、(2) 計画書自体が実装の実態と完了状況を反映した記録になっていること、(3) リポジトリとしての体裁（README・インストーラ・リリース・文書・開発環境）が姉妹プラグイン deep-spec-analysis と同等であること、の 3 点である。利用者は AI-DLC v2 を使う開発者全般（7 ハーネス）だが、今回の検証範囲は Claude Code に限定し、他ハーネスは今後の課題として記録する（Q1・Q2）。

## Functional requirements（機能要求）

### FR1 — 検証の完了（計画書 §8 相当、Claude Code の範囲）

- **FR1.1** 既存の自動検証（`aidlc-plugin-validate`、7 ハーネスの `aidlc-plugin-build`、`tests/plugin.test.ts` の単体テスト、Claude・Kiro への compose テスト、Claude の `aidlc-plugin-test.ts --install`、`sync-contributions.ts --check`、typecheck）が CI で green のまま維持されること。合否: CI の全ステップが成功する。（出典: 意図の成功指標 1、Q1）
- **FR1.2** ライブ確認の証拠は Claude Code のもののみとする。既存の `docs/live-check-2026-09-03.md`（print モードによる番号付きプローズ描画の記録を含む）と opt-in の `bun run test:live` を証拠として完了記録から参照する。新たなライブ確認の実施は要求しない。合否: 完了記録が両証拠を所在付きで参照している。（出典: 意図の成功指標 2 を Q2 で上書き）
- **FR1.3** 「実プロジェクトで Grill me を 1 ステージ分使い切る」は grilling-sandbox での既存記録（8 問すべて `**Mode:** grill`、質問ファイルと監査記録が毎問更新）で充足したとみなし、完了記録にその証拠（記録の所在と集計）を書く。合否: 完了記録に所在と「8 / 8」の集計がある。（出典: 意図の成功指標 3、Q3）

### FR2 — 計画書を完了記録にする

- **FR2.1** `docs/plugin-plan.md` を実装の実態に合わせて更新する: プラグイン名 `grilling`（計画の `grill-me`）、配置はリポジトリ直下 `grilling/`（計画の `plugins/grill-me/`）、`scripts/sync-contributions.ts`（28 断片の drift guard）の追加、code-generation の実アンカー（計画の「要確認」を確定値に）。合否: 計画書の記述と `grilling/` の実態に食い違いがない。（出典: Q4、意図の問題定義）
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
- **FR5.4** 今回の完了に合わせて 0.2.0 を公開する（`v0.2.0` タグ）。合否: タグが存在し、README の Quickstart が `v0.2.0` を例示する。（出典: Q7）

### FR6 — 文書と開発環境

- **FR6.1** `grilling/docs/decisions.md` と `decisions.ja.md` を新設し、これまでの決定を記録する: contributions のみで作る判断、`grill-me` → `grilling` の命名、アンカーの選定（`after-questions` 不採用）、断片テンプレートを `tests/fragment-template.md` に置く判断、検証範囲を Claude に限定した判断、参照先との同等品質を上限とした判断。合否: 両ファイルに上記 6 件がある。（出典: Q6-D、Q1、Q2）
- **FR6.2** `mise.toml` をリポジトリ直下に置き、bun を CI（`setup-bun` 1.3.13）と同じ版に固定する。合否: `mise.toml` と `ci.yml` の bun 版が一致する。（出典: Q6-D）
- **FR6.3** `renovate.json` をリポジトリ直下に置く（`config:recommended`、bun ランタイムと `@types/bun` の同時更新、GitHub Actions の一括 PR）。ソルバー固定などこのリポジトリに無い規則は持ち込まない。合否: ファイルが妥当な JSON で上記 3 規則を含む。（出典: Q6-D）
- **FR6.4** プラグイン README（`grilling/README.md` / `README.ja.md`）の Install と Development を、インストーラ・リリース機構・ルート README と整合させる。合否: 3 者の手順が食い違わない。（出典: 意図の記録・共有要件、Q6）

### FR7 — 選択キー環境での有効化・検出の検証（記録のみ）

- **FR7.1** `harness.json` に `plugins` 選択キーがある使い捨て install で、contributions のみの `grilling` が `select-plugins` で有効化できるか、貢献がマージされるか、`/aidlc --doctor` の「Composed plugin surface」に現れるかを確認し、結果を `docs/decisions` に記録する。否定的な結果なら README の Limits にも書く。受け入れ基準にはしない。合否: 記録が存在する。（出典: Q5、business-overview.md 4、architecture.md「Improvement Opportunities」4）

## Non-functional requirements（非機能要求）

- **NFR1** CI の所要時間は現行の `timeout-minutes: 15` 内に収める（検証範囲が Claude のみのため、追加はインストーラ・リリースのテストに限る）。合否: CI が timeout せずに完了する。
- **NFR2** 冪等性: インストーラと compose の再実行は対象プロジェクトを変更しない（`Changed 0` / バイト同一）。合否: FR4.4 のテストで検証。
- **NFR3** 二言語の対（ja / en）: 新設する README・decisions は必ず両言語を用意し、内容を一致させる。合否: 対応ファイルが揃っている。
- **NFR4** 依存ゼロ: `install.ts` と `release.ts` は bun と `node:*` 組込みのみに依存し、対象プロジェクトに何もインストールしない（参照先と同じ）。合否: `package.json` の dependencies が増えない。
- **NFR5** 再現性: タグ指定インストールは不変のソースアーカイブから導入し、provenance にダイジェストを残す。合否: 同じタグで 2 回導入した provenance のダイジェストが一致する。
- **NFR6** 安全性: インストーラは symlink を追わず、`--project` の外へ書き込まず、認証情報を扱わない。合否: テストで symlink と外部パスが拒否される。

## Constraints（制約）

- **C1** grilling は contributions のみのプラグインのまま（stages / agents / scopes / sensors / tools を持たない）。（意図の問題定義、business-overview.md）
- **C2** エンジンは submodule `aidlc-workflows` の `v2.7.0-1-ga277af21` に固定。`after-questions` アンカーは使えず、貢献はステージごとの `after-step:N` / `before-step:N` / `end-of-steps` に依存する。（architecture.md）
- **C3** Claude Code の構造化質問は 4 選択肢が上限で、Grill me が最後の枠を使う。（意図のステークホルダーマップ「影響者」）
- **C4** エンジンの再インストール・更新で合成済み断片は消えるため、利用者は `/aidlc plugin sync` を再実行する。（architecture.md D1）
- **C5** 品質の上限は deep-spec-analysis との同等。参照先にない仕組み（例: CHANGELOG ファイル、npm 配布、GitHub Release アセット）は導入しない。（Q6）
- **C6** 検証範囲は Claude Code のみ。意図の成功指標 2 の「番号付きプローズ系ハーネス 1 つ」は本要求で上書きされ、残の課題として FR2.2 に記録する。（Q1、Q2）

## Assumptions（前提）

- **A1** `LICENSE` の種別は参照先 deep-spec-analysis と同じにする（内容は構成決定で確認して確定する）。
- **A2** インストーラは参照先 `scripts/install.ts` の設計を写して作れる。grilling は `tools/` を持たないため、参照先の「更新時に以前 compose した自分のファイルを更新する」処理は不要か no-op になる（構成決定で確認）。
- **A3** 成功指標 3 の証拠として使う grilling-sandbox の記録は `docs/live-check-2026-09-03.md` に集約されており、追加の採取は不要。

## Out of scope（対象外）

- Claude 以外 6 ハーネスでの `aidlc-plugin-test.ts --install` と、番号付きプローズ系ハーネスでの実機ライブ確認（今後の課題として FR2.2 に記録）。（Q1、Q2）
- このリポジトリ自身に grilling を compose する dogfooding。（Q3）
- 実装を計画書の命名・配置（`plugins/grill-me/`）に合わせる変更。（Q4）
- 選択キー環境の検出リスクを受け入れ基準にすること、上流への issue 起票。（Q5）
- Grill me の新機能、他モードの変更、`/grilling` スキルへの依存。（計画書 §3.3、意図の境界）

## Open questions（後続ステージへ）

- **OQ1** FR7 の検証に使う install はどれか（`grilling-sandbox` に `plugins` キーを足すか、新規の使い捨て install か）— 構成決定で決める。
- **OQ2** A2 の確認: インストーラの「以前 compose したファイルの更新」を残すか外すか。
- **OQ3** ルート README の「Adopting mid-project」で、単一ステージ実行（参照先の `--single`）に相当する案内が grilling にあるか（無ければ「次の質問ステージから有効」とだけ書く）。

## Traceability（意図との対応）

| 要求 | 意図の根拠 | 確認済み回答 |
|------|-----------|--------------|
| FR1.1 | 成功指標 1 | Q1 |
| FR1.2 | 成功指標 2（上書き） | Q2 |
| FR1.3 | 成功指標 3 | Q3 |
| FR2.1〜FR2.3 | 問題定義「計画書の残項目」、記録・共有要件 | Q4 |
| FR3.1〜FR3.4 | 利用者「配布物として仕上げる」、記録・共有要件 | Q6-A |
| FR4.1〜FR4.4 | 利用者「7 ハーネスの利用者」 | Q6-B |
| FR5.1〜FR5.4 | 利用者「配布物として仕上げる」 | Q6-C、Q7 |
| FR6.1〜FR6.4 | 記録・共有要件（docs・README） | Q6-D |
| FR7.1 | 既存構造の把握のリスク | Q5 |

## Review

**Verdict:** READY
**Reviewer:** aidlc-product-lead-agent
**Date:** 2026-09-04T07:25:11Z
**Iteration:** 1

### Findings

| ID | Severity | Location | Finding | Required action | Status |
|---|---|---|---|---|---|
| R-01 | Major | requirements.md > Non-functional requirements (NFR1〜NFR6) | FR1〜FR7・C1〜C6 の各項目はすべて末尾に `（出典: ...）` で `requirements-analysis-questions.md` の Q 番号か upstream artifact の節を明示しているが、NFR1〜NFR6 だけは出典タグが一切ない。特に NFR1（CI を現行 `timeout-minutes: 15` 内に収める）は Q&A のどの質問にも現れておらず、CI の実測実行時間から著者が独自に導出した制約に見える。inception フェーズガードレールの「Every requirement must trace back to an ideation artifact」「Do not introduce new requirements in inception without documenting their origin」に照らすと、この 6 件は要求整理ステージが独自に追加した非機能要求であり、人間が明示的に確認したものかどうかが本文から判断できない。FR4.1〜FR5.4（インストーラ・リリース機構）という比較的大きな新規実装の非機能側の縛り（NFR2 冪等性、NFR4 依存ゼロ、NFR5 再現性、NFR6 安全性）だけに、承認プロセスの痕跡が欠けている。 | NFR1〜NFR6 の各行末に、他の FR/C と同じ形式で出典（該当する Q 番号、または「エンジニアリング上の妥当な推定であり Q&A に明示的な確認はない」旨の注記）を付ける。Q&A に基づかないものは、人間が承認ゲートで気づけるよう明示する。 | New |
| R-02 | Minor | requirements.md > FR7（FR7.1） | FR7.1 は「受け入れ基準にはしない」と明記しながら Functional Requirements の章（FR）に置かれており、他の FR 項目（完了の必須条件）と並置されると、後続ステージが誤って必須要件として扱うおそれがある。合否基準自体は明確（記録が存在する）なので実装不能ではないが、区分の一貫性に欠ける。 | FR7 を独立した「記録専用タスク」や `Open questions` 寄りの節に移すか、章タイトルに「非ゲーティング」である旨を明記する。 | New |
| R-03 | Minor | requirements.md > Constraints C5 | C5「品質の上限は deep-spec-analysis との同等。参照先にない仕組み（例: CHANGELOG ファイル、npm 配布、GitHub Release アセット）は導入しない」は、Q6 で列挙された A〜D 以外の新規仕組みが後続の設計・実装段階で提案された場合の判定基準を示していない。列挙された禁止例（3 つ）は具体的だが、それ以外の境界事例（例えば CI バッジ追加、GitHub Discussions 有効化など）は「参照先にあるかどうか」を都度確認する運用になり、判断がぶれる余地がある。 | 「deep-spec-analysis の対応するファイル・仕組みが存在する場合のみ真似る」という判定手順を一文加えるか、設計ステージで比較表を作る旨を Open questions に追記する。 | New |

### Summary

要求（FR1〜FR7、C1〜C6、A1〜A3）はいずれも Q&A の回答か upstream の既存構造把握（business-overview.md／architecture.md／code-structure.md）に明示的に紐づいており、実地確認（root README・LICENSE・mise.toml・renovate.json の不在、grilling/ に `tools/` がないこと、contributions が 28 断片、CI の `timeout-minutes: 15` と bun 1.3.13）とも一致する。FR1.2／C6 で意図の成功指標 2 を Q2 の自由記述回答に基づき明示的に上書きしている点も、Consolidated Summary で人間が確認済みであり透明に扱われている。唯一の実質的な欠落は非機能要求（NFR1〜NFR6）に出典タグが一切ないことで、他の要求と同じ厳密さの出典明記を欠く（R-01）。Critical な欠落はなく、Major は 1 件のみで人間が承認ゲートで容易に埋められる範囲のため READY とする。
