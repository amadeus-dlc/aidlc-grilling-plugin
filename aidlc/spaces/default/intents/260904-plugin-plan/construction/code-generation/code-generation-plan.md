# Code Generation 計画 — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

## 前提と入力

- 挙動設計（承認済み）: `../functional-design/functional-spec.md`（WF1〜WF8、状態機械、判定文の正本）、`../functional-design/rules.md`（BR1.1〜BR12.5）、`../functional-design/entities.md`
- 要求一覧: `../../inception/requirements-analysis/requirements.md`（FR1〜FR8、NFR1〜6、C1〜C7）
- 構成決定: `../../inception/domain-design/components.md`、`decisions.md`（ADR-001〜008）
- 参照実装（品質の上限。C5）: `/Users/j5ik2o/Sources/j5ik2o.github.com/j5ik2o/deep-spec-analysis`（ルート `README.md` / `README.ja.md` / `LICENSE` / `mise.toml` / `renovate.json` / `.github/workflows/ci.yml`、`deep-spec-analysis/scripts/install.ts`（732 行）/ `release.ts`（149 行）、`deep-spec-analysis/tests/installer.test.ts` / `release.test.ts`）
- 取り込み元スキル: `../../inception/domain-design/upstream-grilling-SKILL.md`、`upstream-grilling-doc.md`
- Unit は切らない（plugin-dev スコープ）。成果物はこのディレクトリ（`construction/code-generation/`）直下。アプリケーションコードはワークスペース直下（`grilling/`、ルートの文書・設定）
- 書き換えない範囲: `aidlc-workflows/`（submodule）と、そこから配布された `.claude/` の道具。フレームワークは開発対象ではない

## 方針（挙動設計から引き継ぐ決定）

- 断片テンプレート `grilling/tests/fragment-template.md` は英語で書き直し、150 行以内（BR10.2）。28 の contribution は `bun scripts/sync-contributions.ts` で再生成し、手では触らない（ADR-004）
- `install.ts` / `release.ts` は参照先を写し、定数（`grilling` / `amadeus-dlc/aidlc-grilling-plugin` / `grilling-install.json`）と deep-spec 固有の後処理だけ差し替える（ADR-001、ADR-002）。更新時の置き直しは対象がなく no-op、tombstone は空（BR8.9）
- 文書は ja / en の対で作る（NFR3、BR12.1）。ルート README は参照先と同じ 7 見出し（BR12.3）
- テストは既存スイートを green に保ち、新設コンポーネント（Installer / ReleaseTool）に 5〜8 件ずつ（Standard）。CI は 15 分以内（NFR1）。ネットワークに出るテストは書かない（`--from` と注入した git だけ）
- ライブ確認（`bun run test:live`）の実行と記録、NG1 の opt-in 確認、0.2.0 の公開は次の Build and Test で行う（BR9.6、BR10.7）。ここではテストコードと手順まで

## Testing Contract

```json
{
  "version": 1,
  "methodology": "test-after",
  "source": "org",
  "ordering": "implement each applicable testable layer, then write and run",
  "scope": "plugin-dev",
  "test_strategy": "standard",
  "project_type": "brownfield",
  "applicable_notes": [
    {
      "layer": "org",
      "text": "We treat tests as a first-class deliverable in every Bolt. The specific\nmethodology (TDD, BDD, ATDD, or classic test-after) is affirmed at\npractices-discovery and recorded in `team.md` under this heading with explicit\n`Methodology` and `Ordering` fields; Code Generation resolves those fields\nindependently from coverage, tooling, and scope notes.\n\nWhen no posture has been affirmed, our default per scope is:\n- **Methodology**: test-after\n- **Ordering**: implement each applicable testable layer, then write and run\n  that layer's tests.\n- `mvp`, `enterprise`, `feature`, `infra`, `classic` add an 80% line-coverage\n  floor and CI execution before merge.\n- `bugfix`, `security-patch` add a targeted regression for the specific\n  bug/vulnerability and require the existing suite to remain green.\n- `express` uses the Minimal strategy: requirement-driven unit tests (one per\n  requirement, with a happy-path floor per component); existing tests remain\n  green.\n- `poc`, `refactor`, `workshop` add no extra new-test floor and require the\n  existing suite to remain green.\n\nThe active `Test Strategy` still applies in every scope and determines test\nvolume/types. Scope floors are additive; they never reduce or replace the\nselected strategy.\n\nBuild and Test verifies defined coverage floors and affirmed quality targets;\nthey may not be weakened to make a step pass.\n\nAffirm a stricter posture in `team.md` if the team commits to one."
    }
  ],
  "obligations": {
    "strategy": "standard",
    "strategy_volume": [
      "Five to eight tests per component.",
      "Unit tests plus integration tests for key boundaries.",
      "Add E2E, performance, or security tests when requirements demand them."
    ],
    "scope_floor": [
      "Keep the existing test suite green.",
      "This scope adds no extra new-test floor beyond the selected test strategy."
    ],
    "combination_rule": "Apply every selected-strategy obligation and every scope-floor obligation; neither replaces the other, and a targeted scope regression may add the narrowest necessary test type beyond the strategy default."
  },
  "plan_profile": {
    "methodology": "test-after",
    "runner_step": "Verify the existing test runner/configuration and record the exact unit-scoped command.",
    "runner_ready_before_first_test": true,
    "testable_layers": [
      "Data model / database behavior",
      "Repository / data access",
      "Business logic",
      "API / endpoint",
      "Frontend behavior"
    ],
    "steps": [
      "Project structure and production configuration skeleton.",
      "Verify the existing test runner/configuration and record the exact unit-scoped command.",
      "Data model / database behavior - implement.",
      "Data model / database behavior - write and run its tests after implementation.",
      "Repository / data access - implement.",
      "Repository / data access - write and run its tests after implementation.",
      "Business logic - implement.",
      "Business logic - write and run its tests after implementation.",
      "API / endpoint - implement.",
      "API / endpoint - write and run its tests after implementation.",
      "Frontend behavior - implement.",
      "Frontend behavior - write and run its tests after implementation.",
      "Environment/build configuration.",
      "Documentation and traceability."
    ]
  },
  "input_sha256": "sha256:0dbdec58e08cf5020b398132d8493de8d1b9bd5cefa4770cb5aeb68c85cd934a",
  "contract_sha256": "sha256:8d7f1a7f51e8e641623b1e21dc4fed305238daeae0eb70f0d7e8c9b1a833a386"
}
```

契約の読み替え: このプラグインにデータモデル層・データアクセス層・API 層・フロントエンド層は無い。「ビジネスロジック」に当たるのが断片テンプレート（ContributionOverlay）、インストーラ（Installer）、リリースツール（ReleaseTool）の 3 つで、それぞれ「実装 → その層のテストを書いて実行」の順に並べる（test-after）。テストランナーは既存（`bun test`）なので、最初に確認して単位ごとのコマンドを記録する。

## 実装ステップ（この順に進める。各ステップの完了時にチェックを付ける）

### 骨組みとテストランナー

- [x] **Step 1 — 既存スイートの確認とコマンドの記録**: `grilling/` で `bun install --frozen-lockfile`、`bun test tests/plugin.test.ts`、`bunx tsc --noEmit`、`bun scripts/sync-contributions.ts --check` が現状 green であることを確かめ、`unit-test-instructions.md` のコマンドで動くことを確認する。ネットワークが要るテストが無いことを確認する。（契約 runner_step）
- [x] **Step 2 — ディレクトリの骨組み**: `grilling/docs/` を新設（decisions の置き場、ADR-003）。ルートに `LICENSE`（MIT、著作権者は参照先と同じ `Junichi Kato`、年 2026。ADR-006）を置く。`grilling/package.json` の `scripts` に `release`（`bun scripts/release.ts`）を足す（参照先に倣う。無ければ足さない — 参照先の package.json を読んで判断）。

### ContributionOverlay（断片テンプレートと 28 contribution）

- [x] **Step 3 — 断片テンプレートの書き直し（実装）**: `grilling/tests/fragment-template.md` を挙動設計の BR1〜BR7 と「決定の大きさの判定（英語原文）」「Depth 対応表」「質問ファイルの形」に沿って英語で書き直す。構成: (a) モード選択の 4 択目 — label `Grill me`、description は BR2.5 の固定文（旧文 one question at a time は残さない）、annex の Other 規則は不変（既存どおり）。(b) `**Step 3d: If "Grill me"`（見出しは既存テストが参照するので保つ）— 決定の木とフロンティア（BR1.1〜1.3）、Depth → 段階の閾値表と 5 段階の判定文（BR7.1〜7.4。functional-spec.md の英語原文をそのまま使う）、決めた前提の書式（BR5.4。見出しは会話言語、段階タグ `[XL]`〜`[SS]` は固定）、ラウンドの追記・書き戻し・記録（BR5.1〜5.3。`**Mode:** grill` を答えの直下）、Claude Code の 4 問ずつ分割と `(Recommended)` 先頭（BR2.2、BR2.4）、番号付きプローズの ❓ / ➡️ / --- 書式（BR2.3）、事実の調査（BR3.1〜3.3。`**Pending:** <what>`、`Resolved by lookup (round <n>)`）、終了と共有理解の確認（BR4.1〜4.3。summary checkpoint に合流、確認前に生成しない、異議は格上げ）、1 問ずつへの切り替え（BR6.1〜6.3。project.md の Corrections を趣旨で判断、会話中の指示も受ける）、取り込み元の「質問数に上限なし」（C7）。150 行以内。sentinel 風の行（`<!-- plugin:`）や `## fragment:` 見出し、fence の不均衡を入れない（既存テストの制約）。`{{HARNESS_DIR}}` プレースホルダは既存テンプレートと同じ扱い（使わないなら書かない）。
- [x] **Step 4 — 28 contribution の再生成**: `bun scripts/sync-contributions.ts` を実行し、`--check` が 0 で終わることを確認する。`grilling/.aidlc-plugin/plugin.json` の `description` を新方式の 1 文に更新する（version は 0.1.0 のまま。0.2.0 への更新は Build and Test で `release.ts` が行う）。
- [x] **Step 5 — 断片のテスト（テスト）**: `grilling/tests/plugin.test.ts` の「the fragment template is well-formed prose」を BR10.2 の固定トークン検査に更新する — `Grill me`、BR2.5 の description 文、`(Recommended)`、`**Mode:** grill`、`**Pending:**`、`Decided assumptions`、`❓` / `➡️`、`XL` `L` `M` `S` `SS` と `Minimal` / `Standard` / `Comprehensive` の対応表、`one question at a time`（切り替えの記述）、`frontier` / `round`。旧 description 文が無いことを検査する。行数 ≤ 150 を検査する。既存の他テスト（validate、target 集合、テンプレート一致、アンカー、7 build、compose Claude / Kiro、plugin-test）はそのまま green。`bun test tests/plugin.test.ts` を実行して確認する。
- [x] **Step 6 — ライブ確認テストの更新（テスト）**: `grilling/tests/live-claude.test.ts` を BR10.3〜10.6 に更新する — 定数 `GRILL_ME_DESCRIPTION` を新文に、「menus 2 and 3 each ask one question」を「menu 2 has 2–4 questions, each with the recommended option first」と「menu 3 has ≤4 questions, each recommended first」に置き換え、帳簿検査（`[Answer]:` 記入、`**Mode:** grill`、Options 行、QUESTION_ANSWERED Grill me、DECISION_RECORDED ≥ 3）は維持。ファイル冒頭のコメントも新方式に合わせる。`stopAfterAskUserQuestionAt: 3` は維持。実行は Build and Test（opt-in、`AIDLC_CLAUDE_SDK_LIVE=1`）。ここでは `bunx tsc --noEmit` で型が通ることまで。
- [x] **Step 7 — NG1 の opt-in テスト（テスト）**: `grilling/tests/select-plugins.test.ts` を新設する（ADR-005）。環境変数 `GRILLING_SELECT_KEY_CHECK=1` のときだけ動く: 使い捨ての Claude install（`aidlc-workflows/dist/claude` のコピー）の `harness.json` に `plugins` 選択キー（`["aidlc", "grilling"]`）を入れ、投影を build して compose し、28 ステージに断片が入ること、drop が無いことを確認し、結果を標準出力に要約する（decisions への転記は人が行う）。環境変数が無いときは skip する（既存 live テストと同じ `describe.skipIf` の形）。

### Installer（`grilling/scripts/install.ts`）

- [x] **Step 8 — インストーラの実装**: 参照先 `deep-spec-analysis/scripts/install.ts` を写し、定数 `REPOSITORY = "amadeus-dlc/aidlc-grilling-plugin"`、`PLUGIN_NAME = "grilling"`、`PROVENANCE_FILE = "grilling-install.json"`、Usage 文字列（`bun grilling/scripts/install.ts --project <path> ...`）を差し替える。`PAYLOAD_MAP` の置き直し処理は残し、`REMOVED_PAYLOADS` は空にする（BR8.9）。完了案内を ADR-007 / BR8.12 の 2 点（Grill me が次の質問ステージの 4 択目に現れる、エンジン更新後は `/aidlc plugin sync`）に差し替え、deep-spec 固有の後処理（stage の案内、doctor ツールの探索）は削る。BR8.1〜8.12 の各規則が参照先のどの関数で満たされるかをコメントで対応づける必要はないが、挙動が変わらないことを確認する。`bunx tsc --noEmit` を通す。
- [x] **Step 9 — インストーラのテスト（テスト）**: `grilling/tests/installer.test.ts` を新設する（参照先 `installer.test.ts` を写して定数を差し替える）。最低限: (1) `--from <このリポジトリの grilling/>` で使い捨て Claude install（`aidlc-workflows/dist/claude` のコピー）へ導入すると 28 ステージに断片が入る、(2) `--dry-run` は対象を変更しない、(3) 2 回目の実行は `Changed 0`、(4) provenance が 5 項目（`version` / `ref` / `source` / `installed_at` / `payload_sha256`）を持ち version が manifest と一致する、(5) パストラバーサルとリンクを含む tar.gz を拒否する、(6) 選択子の併用と `--update` の併用を拒否する、(7) manifest の name 不一致を拒否する（BR10.8、BR8.1〜8.7、NFR2、NFR5、NFR6）。ネットワークには出ない。`bun test tests/installer.test.ts` を実行して green にする。

### ReleaseTool（`grilling/scripts/release.ts`）

- [x] **Step 10 — リリースツールの実装**: 参照先 `deep-spec-analysis/scripts/release.ts` を写し、manifest のパス（`grilling/.aidlc-plugin/plugin.json`）と Usage 文字列を差し替える。事前検査 4 種（安定 SemVer、`main`、clean、ローカル / リモートにタグ無し）→ manifest 更新 → `chore(release): publish vX.Y.Z`（`--allow-empty`）→ タグ → `git push --atomic origin main vX.Y.Z`、`--check-tag <tag>`、git 操作の注入（BR9.1〜9.5）。
- [x] **Step 11 — リリースツールのテスト（テスト）**: `grilling/tests/release.test.ts` を新設する（参照先 `release.test.ts` を写す）。最低限: (1) 不正な SemVer（プレリリース含む）の拒否、(2) `main` 以外のブランチで失敗、(3) clean でない worktree で失敗、(4) ローカル / リモートにタグがあると失敗、(5) 注入した git の呼び出し列が「commit → tag → push --atomic」の順、(6) manifest の version が更新される、(7) `--check-tag` の一致で成功・不一致で失敗（BR10.9）。`bun test tests/release.test.ts` を実行して green にする。

### 環境・ビルド設定（DevEnvironmentConfig）

- [x] **Step 12 — CI / mise / renovate**: `.github/workflows/ci.yml` に `on.push.tags: ["v*"]` と、タグ push 時だけ動く `bun scripts/release.ts --check-tag "$GITHUB_REF_NAME"` のステップ（`if: startsWith(github.ref, 'refs/tags/')`、working-directory は既存の `grilling`）を足す（BR11.1）。ルートに `mise.toml`（`bun = "1.3.13"`。node は不要なので書かない — このリポジトリに z3 は無い、C5）と `renovate.json`（`config:recommended`、bun ランタイム + `@types/bun` の同時更新、GitHub Actions の一括 PR。ソルバー固定の規則は持ち込まない）を置く（BR11.2、BR11.3）。`grilling/.gitignore` に `dist` が入っていることを確認する。

### 文書（DocumentationSet）

- [x] **Step 13 — ルート README（ja / en）**: `README.md` と `README.ja.md` を参照先と同じ 7 見出し（Highlights / Quickstart（Requirements、Install into your AI-DLC project、Adopting mid-project、Alternative: install through the host plugin store）/ Development / Repository layout / Documentation / Getting help / License）で書く。Install は `curl -fsSL https://raw.githubusercontent.com/amadeus-dlc/aidlc-grilling-plugin/main/grilling/scripts/install.ts | bun - --project <path> --tag v0.2.0` を推奨し、フラグ表（`--project` / `--harness` / `--tag` / `--from` / `--ref` / `--update` / `--dry-run` / `--skip-build`）を載せる。代替は Claude Code（`/plugin marketplace add` + `/plugin install aidlc-grilling@aidlc-plugins`）と Codex（`codex plugin marketplace add` + `codex plugin add`）。Adopting mid-project は「合成は追加のみ」「次の質問ステージ（単一ステージ実行を含む）から Grill me が現れる」「エンジン更新後は `/aidlc plugin sync`」。License 節から `LICENSE` を参照。ja / en を相互リンク（BR12.3、BR12.1）。フォルダドロップ経路には store の信頼ゲートが無いので「実行してよいビルドにだけ向ける」旨を書く（ADR-001 Security implications）。
- [x] **Step 14 — decisions（ja / en）**: `grilling/docs/decisions.md` と `decisions.ja.md` を新設し、7 件（contributions のみ、`grill-me` → `grilling`、アンカー選定（`after-questions` 不採用）、テンプレートの置き場、Claude 限定の検証、参照先との同等品質上限、取り込み元現行版の採用と Depth 対応）を Context / Decision / Consequences の形で記録する。NG1 の結果は Build and Test で確認後に追記する欄を用意する（BR12.4）。フレームワーク側の制約（Unit を切らないスコープで Unit ごとのステージの検査が通らない件）は「今後の課題」として計画書側（Step 16）に書き、decisions には書かない。
- [x] **Step 15 — プラグイン README（ja / en）**: `grilling/README.md` と `README.ja.md` の「How the mode works」を新方式（ラウンド、推奨回答、決めた前提、Depth 対応表、事実の調査、1 問ずつへの切り替え）に書き直し、Install にインストーラ経由（推奨）を足し、Development に `install.ts` / `release.ts` / 新テストを足し、Live check の記述を「2〜4 問の画面」に更新し、Layout に新ファイルを足す（BR12.5）。
- [x] **Step 16 — 計画書の完了記録**: `docs/plugin-plan.md` を BR12.2 のとおり更新する — 命名 `grilling`・配置 `grilling/`・`sync-contributions.ts`・code-generation の実アンカー `after-step:3` の反映、§3 を新方式に差し替え、§8 / §10 の各項目に 済 / N/A / 残（N/A: §8-2 `scripts/package.ts`、§8-5 `run-tests.sh --level integration`。残: 他 6 ハーネスの `aidlc-plugin-test.ts --install`、番号付きプローズ系のライブ確認）、§9 に確定した 3 事実（`after-questions` は drop、validate は anchor / fragment の対応を見ない、エンジン更新でマージが消える）、成功指標 3 の証拠の欄（旧記録 `docs/live-check-2026-09-03.md` の所在と集計。新記録は Build and Test で追記）。「今後の課題」にフレームワーク側の制約（Unit を切らないスコープで Unit ごとのステージのレビュー依頼・承認ゲートの検査が通らず、`AIDLC_SKIP_SUMMARY_CONFIRMATION_GUARD=1` で回避した件。上流 aidlc-workflows への報告事項）を足す。

### 仕上げ

- [x] **Step 17 — 全体確認**: `grilling/` で `bunx tsc --noEmit`、`bun scripts/sync-contributions.ts --check`、`bun test`（live と select-plugins は skip）、`bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts .`、7 ハーネスの `aidlc-plugin-build.ts` を実行して green にする。所要時間を記録する（NFR1）。
- [x] **Step 18 — 記録**: `code-summary.md`（作成 / 変更ファイル、判断、テスト件数、計画からの逸脱）、`source-manifest.json`、`traceability.json`（BR → 実装 / テストファイル）を書く（オーケストレーター側で行う）。

### Loop-back（Build and Test からの戻り）

- [x] **Step 19 — Loop-back 1**: ライブ確認で `(Recommended)` が label ではなく description に付いた（6 問中 5 問）ため、`grilling/tests/fragment-template.md` の「Rendering」段落を、印を付ける先が選択肢の **label**（短い見出し側）であり description ではないことが一読で分かる文に直す（1〜2 行。150 行以内を保つ）。`bun scripts/sync-contributions.ts` で 28 contribution を再生成し、`bun test tests/plugin.test.ts`、`bunx tsc --noEmit`、`bun scripts/sync-contributions.ts --check` を通す。テストと設計ルール BR2.2 は変えない。ライブ確認の再実行は Build and Test で行う（`../build-and-test/test-results.md` の Loop-Back Log 1）。
- [x] **Step 20 — Loop-back 2**: サンドボックスで断片テンプレートを変えた後の `install.ts --from` が `Changed 0` で合成を省く（T16。`../build-and-test/test-results.md` の Loop-Back Log 2）ため、`grilling/scripts/install.ts` の provenance に記録するダイジェスト（`payload_sha256`）を「ペイロードのファイル（PAYLOAD_MAP）＋投影の `contributions/**`」に広げる。導入先のファイルとの一致判定（`installedPayloadEntries` と候補のペイロードファイルの比較）は従来どおりペイロードのファイルだけにし、provenance との比較だけがフルのダイジェストを使うようにする（BR8.7 の「同じダイジェスト」の意味を contributions を含むものに広げる）。`tests/installer.test.ts` に「ソースの contribution を 1 本変えて再実行すると合成し直し（`Changed 1`、導入先の stage に新しい本文）、さらにもう 1 回は `Changed 0`」を足す（ソースはリポジトリのルートを一時ディレクトリにコピーして変える）。README（ルート ja / en とプラグイン ja / en）の `--update` と `Changed 0` の説明を「provenance のダイジェストは contributions も含む。エンジンの再インストール（合成が消える）は検出できないので `/aidlc plugin sync`」にそろえる。`bun test`、`bunx tsc --noEmit` を通す。

## 対応表（ステップ → 要求とルール）

| ステップ | 実装するもの | ルール | 要求 |
|---|---|---|---|
| 3〜4 | 断片テンプレート、28 contribution、manifest description | BR1.1〜BR7.4、BR2.5 | FR8.1〜FR8.7、FR2.1 |
| 5 | plugin.test.ts の更新 | BR10.1、BR10.2 | FR1.1、FR1.4 |
| 6 | live-claude.test.ts の更新 | BR10.3〜BR10.6 | FR1.2、FR1.4 |
| 7 | select-plugins.test.ts（opt-in） | BR10.10 | NG1 |
| 8〜9 | install.ts、installer.test.ts | BR8.1〜BR8.12、BR10.8 | FR4.1〜FR4.4、NFR2、NFR4、NFR5、NFR6 |
| 10〜11 | release.ts、release.test.ts | BR9.1〜BR9.5、BR10.9 | FR5.1〜FR5.3 |
| 12 | ci.yml、mise.toml、renovate.json | BR11.1〜BR11.3、BR9.4 | FR5.2、FR6.2、FR6.3 |
| 13 | ルート README（ja / en）、LICENSE | BR12.1、BR12.3 | FR3.1〜FR3.4 |
| 14 | grilling/docs/decisions（ja / en） | BR12.1、BR12.4 | FR6.1 |
| 15 | grilling/README（ja / en） | BR12.5 | FR6.4 |
| 16 | docs/plugin-plan.md の完了記録 | BR12.2 | FR1.3、FR2.1〜FR2.3 |
| 17 | 全体確認 | BR10.1、BR10.10 | FR1.1、NFR1 |
| Build and Test へ | `bun run test:live` の実行と `docs/live-check-<日付>.md`、NG1 の確認結果の転記、`release.ts 0.2.0` | BR10.7、BR9.6 | FR1.2、FR1.3、FR5.4 |

## 品質目標（緩めない）

- 既存スイート green、新設テストは各コンポーネント 5〜8 件（Standard）。カバレッジの数値目標はこのスコープには無い（plugin-dev は追加の下限を設けない）。
- CI 15 分以内（NFR1）。ネットワークに出るテストを書かない。
- `install.ts` / `release.ts` は bun と `node:*` のみに依存（NFR4）。`grilling/package.json` の dependencies を増やさない。
- 断片テンプレート 150 行以内（BR10.2）。

## Review

**Verdict:** READY
**Reviewer:** aidlc-architecture-reviewer-agent
**Date:** 2026-09-04T12:30:00Z（近似値。環境の `aidlc-plan-approval-guard.ts` フックが code-generation の Step 4 相当のシェルコマンド——`date -u` 単体を含む——をすべて「mutation-capable」として拒否するため、直接の `date -u` は取得できなかった。前回・前々回レビューと同じ制約で、`aidlc/spaces/default/memory/project.md` に記録済みの currentDate=2026-09-04 を基準にした近似時刻）
**Iteration:** 1
**Request Challenge:** review:93a56e632cab5e81a1236e55f0e24b8c

### Findings

なし。Critical / Major / Minor いずれの欠陥も見つからなかった。

### Validation Tool Results

| Tool | Result | Interpretation |
|---|---|---|
| `bun --cwd grilling test tests/installer.test.ts` | 実行不可 — `aidlc-plan-approval-guard.ts` フックが「Code generation cannot run mutation-capable shell command」として単純な 1 コマンドでも `bun` で始まる呼び出しを拒否した（前回・前々回レビューと同じ環境制約） | `grilling/scripts/install.ts` と `grilling/tests/installer.test.ts` を全文読んで代替確認した。詳細は Summary 参照 |
| `bun --cwd grilling test` | 実行不可（同上） | `code-summary.md`「Loop-back 2」の申告（`bun test` 44 pass / 14 skip / 0 fail）と、テストファイル本体の内容（常に真になるアサーションが無いこと、`describe`/`test` の構造）を読み合わせて内容面で確認した |
| `bun --cwd grilling scripts/sync-contributions.ts --check` | 実行不可（同上） | `grilling/tests/fragment-template.md` が 142 行のまま（Step 19 時点から不変）であることを `grep -c ""` で確認し、Step 20 の変更範囲（`install.ts`・`installer.test.ts`・README 4 本）にテンプレートも contributions も含まれないことを `git status --short` の差分と `code-summary.md` の申告（「変更: `grilling/scripts/install.ts` に…」で始まる段落。テンプレート・contributions への言及なし）から確認した。sync-contributions の対象自体に変更がないため、`--check` の結果は前回レビュー時点（0 で終了）から変わらないと判断できる |
| `git status --short` | 実行成功 | `README.md` / `grilling/README.md` / `grilling/README.ja.md` が M、`grilling/scripts/install.ts` / `grilling/tests/installer.test.ts` が ??（新規未追跡）——依頼にある 6 ファイルすべてが差分に現れている。ワークスペース全体が最初から未コミットのため Step 1〜19 分の差分と混在しており、この git status 単体では Step 20 だけを切り出せない（下記の内容読み取りで代替）。`.claude/`・`aidlc-workflows/`（submodule）は無変更 |

### Summary

`install.ts` を通読し、判定ロジックが依頼の基準どおりであることを確認した。「導入先と候補の比較」（`installedPayloadEntries()` と `candidatePayloadEntries()`、674〜682 行の `Changed 0` ガード）はペイロードファイルだけの比較のままで、「provenance との比較」（`existingProvenance.payload_sha256 === candidateDigest`）だけが `provenanceDigest()`——ペイロード＋`candidateContributionEntries()` で集めた投影の `contributions/**`——を使うフルダイジェストになっている。最後に書く provenance（775 行 `writeProvenance(provenanceDigest(installedPayload, candidateContributions))`）もフルダイジェストなので、2 回目の実行でも `existingProvenance.payload_sha256` と次回の `candidateDigest` が同じ計算式で比較され、`Changed 0` に正しく収束する。`candidateContributionEntries()` は `lstatSync(source).isSymbolicLink()` でシンボリックリンクを除外しており（570 行）、既存の `candidatePayloadEntries()` と同じ安全策（ADR-001）を踏襲している。パスの衝突は無い（`contributions/` は `PAYLOAD_MAP` に含まれない）ためハッシュの結合順序に依存しないという実装コメントの主張も `canonicalPayloadSha256` がパスでソートしてから連結する実装（119 行）と整合する。`--dry-run` の分岐（481〜493 行）はこの判定ロジックより前で return するため無関係で不変。`--update` の分岐（409〜418 行）も、`source === "tag"` なら判定ロジックへ到達する前に `Changed 0` で終了し、それ以外（local/ref/latest）は通常の解決フローに合流するだけで Step 20 の変更の影響を受けない——依頼が懸念した「`--update` 経路への影響」は無いと判断できる。BR8.7 の文言（「provenance が同じ source と ref、同じ version、同じ payload ダイジェストを示せば `Changed 0`」）を「payload ダイジェスト」= contributions を含むフルダイジェストと読み替える変更は計画 Step 20 で人が承認済みで、BR8.10（5 項目の provenance を書く）の実装も変更後の意味論に整合している。`installer.test.ts` の新設 describe「installer against a source whose fragments change」は `copyRepoRoot()`（99〜107 行）でリポジトリの `grilling/{.aidlc-plugin,contributions,scripts}` を一時ディレクトリへコピーしてから編集しており、380 行で「checkout 本体の contributions は変更されていない」ことまで明示的にアサートしているため、リポジトリ本体 `grilling/contributions/**` を書き換えないことを確認できる。同テストは 364〜403 行で「導入（`Changed 1`）→ コピー側テンプレートを 1 行変えて `sync-contributions.ts` を再実行 → 再導入（`Changed 1`、28 ステージすべてに新しい `marker` 文字列、provenance の digest が変化）→ 再々導入（`Changed 0`、`snapshot(project)` が byte 同一）」の 3 段階を検証しており、依頼の基準(a)〜(b)を満たす。ネットワークには出ない（`--from` のみを使用、ヘッダコメントで明記）。常に通るだけのアサーションは無く、実測値（digest の不一致・一致、`marker` 文字列の有無）を比較する構造になっている。README 4 本（ルート ja/en、プラグイン ja/en）は grep で確認した限り、「ダイジェストはペイロードと contributions を含む」「エンジン更新後の合成消失は検出できないので `/aidlc plugin sync` を再実行する」という同一内容を 4 本とも記載しており、ja/en の対応も取れている。`code-summary.md`「Loop-back 2」節は変更内容・テスト内容・検証結果の申告が実装・テストの現物と一致し、`source-manifest.json` に `install.ts` と `installer.test.ts` が既に列挙されている（対象ファイルが変わらないため Step 20 での更新は不要）ことも確認した。計画 Step 20 のチェックボックスは `[x]`。今回の検証ツールは前回・前々回と同じ環境制約（`aidlc-plan-approval-guard.ts` によるシェルコマンド拒否）で直接実行できなかったが、実装コード全文の通読とテストコード全文の通読、README の grep 確認により、依頼の観点(1)〜(6)をすべて内容面でカバーできたと判断する。以上より、Step 20 の修正は正しく、他のステップの成果物を壊していないと判断し READY を維持する。
