# Grill me プラグイン 計画案

## 状態: 完了記録（2026-09-04）

この計画は 2026-09-03 に `grilling` 0.1.0 として実装され、2026-09-04 の AI-DLC ワークフロー（intent `260904-plugin-plan`、スコープ plugin-dev）で残項目の検証・文書・配布物の整備と、取り込み元スキル現行版（ラウンド方式）への更新を行った（0.2.0）。本書は計画の本文を残したまま、計画と実装の差分と各項目の完了状況を書き足した完了記録である。以下、各項目の末尾に付ける印は次の 3 値。

- **済** — 実施済み。証拠の所在を添える
- **N/A** — このリポジトリでは意味を持たない（計画がフレームワーク repo 内での配置を前提にしていた項目）
- **残** — 今後の課題（§12 に列挙）

### 計画からの差分

| 項目 | 計画 | 実装 | 備考 |
|---|---|---|---|
| プラグイン名 | `grill-me` | `grilling` | ホスト側パッケージ ID は `aidlc-grilling`。取り込み元スキルの名に合わせた |
| 配置 | フレームワーク checkout 内の `plugins/grill-me/` | 独立リポジトリ直下の `grilling/`（`aidlc-workflows` は submodule） | 姉妹プラグイン deep-spec-analysis と同じ構成 |
| 28 ファイルの生成 | 手で生成し、テストで原本との一致を検査 | `grilling/scripts/sync-contributions.ts` がテンプレートとアンカー表から生成。`--check` が drift を検出（CI とテストで実行） | 計画にない追加 |
| code-generation のアンカー | `end-of-steps`（要確認） | `after-step:3`（Step 3: Plan Approval。質問ファイルはここで作られる） | 実装時にステージ本文を読んで確定 |
| Grill me の方式 | 1 問ずつ（§3 の旧版） | ラウンド方式＋決定の大きさ（XL / L / M / S / SS）と Depth の対応（§3 の新版、0.2.0） | 取り込み元スキルの現行版に合わせた |
| 検証範囲 | 7 ハーネスの合成検証、ライブ確認 2 ハーネス | Claude Code に限定（要求整理の Q1・Q2 で人が決定） | 残りは今後の課題（§12） |
| 配布物・文書 | README 1 本 | ルート README（ja / en）、`LICENSE`（MIT）、`grilling/scripts/install.ts`、`grilling/scripts/release.ts`、`grilling/docs/decisions.md`（ja / en）、`mise.toml`、`renovate.json`、CI のタグ検査 | deep-spec-analysis との同等を上限とする（それに無いものは作らない） |

関連する記録: 決定の理由は [`grilling/docs/decisions.ja.md`](../grilling/docs/decisions.ja.md)、プラグインの現在の仕様は [`grilling/README.ja.md`](../grilling/README.ja.md)、ライブ確認は [`live-check-2026-09-03.md`](live-check-2026-09-03.md)（旧方式）と [`live-check-2026-09-04.md`](live-check-2026-09-04.md)（新方式）。

## 1. ゴール

AI-DLC v2 の質問モード選択(Guide me / I'll edit the file / Chat)に **Grill me** を追加する。

- 本体(`core/`、`harness/`)は一切変更しない。 — **済**（contributions のみ。`aidlc-workflows` は submodule として読むだけ）
- Claude Code、Kiro CLI、Kiro IDE、Codex、Cursor、opencode、Copilot の全7ハーネスで動く。 — **済**（投影の build は 7 ハーネス、CI で毎回）／**残**（Claude Code 以外の実機確認。§12）
- 配布は AIDLC プラグイン機構(`plugins/<name>/` → `dist/plugins/<name>/<harness>/`)を使う。 — **済**（独立リポジトリの `grilling/` → `grilling/dist/<harness>/`。§4・§7）

## 2. 方式

**contributions のみのプラグイン `grilling`（計画時の名は `grill-me`）。** 新ステージ、agent、scope、sensor は持たない。 — **済**

モード選択の定義文は `core/aidlc-common/protocols/stage-protocol.md` §3 Step 2 にあり、プラグインはプロトコルを差し込み対象にできない(contribution の target はコアステージのスラッグ限定)。そこで、質問ファイルを持つコアステージ28個それぞれに contribution を置き、fragment で次を差し込む。

1. 「モード選択を出すときは、プロトコルの3択に加えて4番目の選択肢 **Grill me** を出せ」
2. 「Grill me が選ばれたときの手順(Step 3d 相当)」

fragment はハーネス中立の英文で書き、描画は各ハーネスの `question-rendering.md` に任せる。オーケストレーターは質問を組み立てるときにプロトコルとステージ本文の両方を読むので、ステージ側の追記で4択目が出る。 — **済**（`docs/live-check-2026-09-03.md` §1 で 4 択目の描画を確認）

## 3. Grill me モードの仕様(fragment の中身)

0.2.0 で取り込み元スキル（Matt Pocock の `grilling`、GitHub `mattpocock/skills` の `main`、2026-09-04 取得）の現行版に合わせて差し替えた。0.1.0 の「1 問ずつ」方式は、§3.2 末尾の切り替えとして残る。正本は `grilling/tests/fragment-template.md`（英語、139 行）。

### 3.1 選択肢

| 項目 | 値 |
|---|---|
| label | `Grill me` |
| description | `Interview me in rounds of independent questions, each with a recommended answer; drill into every branch until we share the same understanding` |
| 位置 | Guide me / I'll edit the file / Chat の次(4番目) |

番号付きプローズのハーネス(Kiro、Codex fallback、Cursor、opencode、Copilot)では Grill me が4行目、Other が5行目になる。これは annex の pre-send invariant(最終行が Other、Other は1つ、番号は非Other数+1)を満たす。fragment は annex の Other 規則と番号付け invariant をそのまま適用すると書き、行番号は書き直さない（annex の管轄。PR #2 の指摘で本体参照化した。`docs/live-check-2026-09-03.md` 参照）。

Claude Code の AskUserQuestion は上限4選択肢 + 組み込み Other なので、ちょうど収まる。 — **済**

### 3.2 手順(Step 3d: If "Grill me")

Guide me を「決定の木の上の面接」として走らせる、という位置づけ。annex どおりの描画、§3 の decision / answer の記録ペア、正本としての質問ファイルは Guide me と同一で、違うのは次の点。 — **済**（fragment に記述。トークンは `grilling/tests/plugin.test.ts` が検査）

- **決定の木とフロンティア。** 質問ファイルの下書きを決定の木に写し、各決定に前提と大きさを付ける。前提がすべて決まった決定（フロンティア）を 1 ラウンドでまとめて出す。同じラウンドの質問は互いに独立でなければならず、まだ答えの出ていない質問に依存する質問は次のラウンドに回す。答えを受けるたびに木を更新し、フロンティアを計算し直す。質問数に上限は設けず、決定の大きさで絞る。
- **決定の大きさと Depth。** 各決定を「あとで変えると他に何が変わるか」「戻すのにどれだけかかるか」の 2 つの問いかけで XL / L / M / S / SS に分ける（XL: 解の形を変える、L: 構成要素の責務や契約を変える、M: 構成要素の中で利用者に見える挙動、S: 既定値や名前などの局所の選択、SS: 利用者に見えない選択。迷ったら大きい方）。`aidlc-state.md` の Depth が人に聞く最小の段階を決める — Minimal は XL・L、Standard は M まで、Comprehensive は S まで。SS は常にエージェントが決める。
- **決めた前提。** 閾値未満の決定は推奨回答で決め、そのラウンドの質問の直後に会話言語の見出し（英語なら `### Decided assumptions (round <n>)`）を置いて `- [<段階>] <決定> — <理由>` と 1 件 1 行で書く。黙って決めない。
- **帳簿。** ラウンドは提示前に質問ファイルへ追記する（ラウンドの見出し、通し番号つきの各質問、題、文脈 1 行、選択肢——最後は `X. Other (please specify)`——推奨と理由、空の `[Answer]:`）。答えは受け取り次第 `[Answer]:` に書き戻し、直下の独立行に `**Mode:** grill` を置く。画面ごとに §3 の decision / answer を新しいタイムスタンプで記録する。
- **描画。** Claude Code では推奨選択肢を先頭に置いて `(Recommended)` を付ける（画面だけ。ファイルの並びと文字は変えない）。1 画面 4 問までなので、5 問以上のラウンドは 4 問ずつ画面を分け、画面ごとに書き戻して記録する。番号付きプローズのハーネスでは取り込み元の書式（`❓ **Q<n>** - **<題>**: 本文と選択肢` / `➡️ 推奨回答と理由`、質問の間は `---`）で 1 ラウンドを 1 メッセージに出し、選択肢の並びは変えない。人は `1 A, 2 B` のように番号で答える。
- **事実は聞かずに調べる。** ファイルの中身、設定、前のステージの成果物、参照実装は、サブエージェントを呼べるハーネスではサブエージェントに、呼べなければ自分で調べる。調査中はその結果に依存する決定だけを待たせ、残りのフロンティアは先に出す。調査待ちの質問は空の `[Answer]:` と `**Pending:** <調べていること>` を付けて先に追記し、調査で決まれば `[Answer]: Resolved by lookup (round <n>)` と書いて決めた前提に移す。
- **終了は共有理解の確認から。** フロンティアが空になったら Step 3a に合流する。consolidated summary は回答の全件と決めた前提の全件（ラウンド順）を並べ（ここで一括確認する）、`aidlc-review-brief.ts summary` → Looks correct / Request changes の確認に進む。確認前に成果物を生成しない。Request changes で決めた前提に異議が出れば次のラウンドの質問に格上げし、回答済みの質問への異議はその枝を開き直す。
- **1 問ずつへの切り替え。** `aidlc/spaces/<space>/memory/project.md` の `## Corrections` に「Grill me は 1 問ずつ聞く」旨の行があれば（言語を問わず趣旨で判断）、または面接中に人がそう頼めば、各画面を 1 問にする。フロンティア・帳簿・決めた前提は変えない。
- 途中でのモード切替は既存仕様どおり許可。フォローアップは常に許可(既存ルール)。

### 3.3 やらないこと

- `/grilling` スキルへの依存。エミッタは `skills/` を投影しないし、他人の環境にそのスキルはない。手順は fragment にインラインで書く。 — **済**
- Chat モードの置き換え。Grill me は質問ファイル駆動で毎画面の帳簿を取る点が Chat と違う。 — **済**
- `knowledge/` などの追加ファイルで仕様を配る。0.2.0 で増えた規則もすべて fragment の中に書く（contributions のみを維持）。 — **済**

## 4. ファイル構成

計画時は `plugins/grill-me/`（フレームワーク checkout 内）としていたが、実装は独立リポジトリ直下の `grilling/` である。現在の構成:

```
grilling/
  .aidlc-plugin/plugin.json      # contributes: { "overlays": "contributions/" } のみ
  README.md / README.ja.md       # 目的、モードの動き、インストール、アップグレード後の plugin sync、アンカー、制約
  docs/decisions.md / .ja.md     # 設計判断と選択キー環境の確認
  contributions/
    ideation/      approval-handoff.md feasibility.md intent-capture.md market-research.md
                   rough-mockups.md scope-definition.md team-formation.md
    inception/     contract-design.md delivery-planning.md domain-design.md practices-discovery.md
                   refined-mockups.md requirements-analysis.md units-generation.md user-stories.md
    construction/  ci-pipeline.md code-generation.md functional-design.md infrastructure-design.md
                   nfr-design.md nfr-requirements.md
    operation/     deployment-execution.md deployment-pipeline.md environment-provisioning.md
                   feedback-optimization.md incident-response.md observability-setup.md
                   performance-validation.md
  scripts/
    sync-contributions.ts        # テンプレートとアンカー表から 28 本を生成。--check で drift 検出
    install.ts                   # 1 コマンドのインストーラ
    release.ts                   # 版の更新 + タグ + atomic push。CI 用の --check-tag
  tests/
    fragment-template.md         # 28ファイル共通の fragment 本文(唯一の原本)
    plugin.test.ts               # 下記 §6 のテスト
    installer.test.ts / release.test.ts / live-claude.test.ts(opt-in) / select-plugins.test.ts(opt-in)
    harness/sdk-drive.ts         # Agent SDK 経由のライブ確認のドライバ
```

- `plugin.json` の `name` は `grilling`(小文字ケバブ、`aidlc-` 接頭辞禁止)。ホスト側パッケージ ID は自動で `aidlc-grilling` になる。 — **済**
- `adds:` は空でよい(produces / consumes / sensors なし)。fragment のみ。 — **済**
- 28ファイルの fragment 本文は同一。`tests/fragment-template.md` を原本にし、テストで一致を検証する(`tests/` は install にコピーされない)。 — **済**（加えて `scripts/sync-contributions.ts` が生成と `--check` を担う）

## 5. アンカー対応表

`after-questions` は未実装(compose が "unknown anchor" で drop する)ので使わない。質問生成ステップの直後、または回答収集ステップの直前に置く。表の正本は `grilling/scripts/sync-contributions.ts` の `TARGETS`。 — **済**（各アンカーの実在は `tests/plugin.test.ts` が検査）

| phase | slug | anchor | 根拠となる見出し |
|---|---|---|---|
| ideation | approval-handoff | `after-step:2` | Step 2: Generate Approval Questions |
| ideation | feasibility | `after-step:2` | Step 2: Generate Clarifying Questions |
| ideation | intent-capture | `after-step:2` | Step 2: Generate Clarifying Questions |
| ideation | market-research | `after-step:2` | Step 2: Generate Clarifying Questions |
| ideation | rough-mockups | `after-step:2` | Step 2: Generate Clarifying Questions |
| ideation | scope-definition | `after-step:2` | Step 2: Generate Clarifying Questions |
| ideation | team-formation | `after-step:2` | Step 2: Generate Clarifying Questions |
| inception | contract-design | `before-step:3` | Step 3: Collect and Analyze Answers |
| inception | delivery-planning | `after-step:2` | Step 2: Generate Clarifying Questions |
| inception | domain-design | `before-step:3` | Step 3: Collect and Analyze Answers |
| inception | practices-discovery | `after-step:4` | Step 4: Interview (Always) |
| inception | refined-mockups | `after-step:2` | Step 2: Generate Clarifying Questions |
| inception | requirements-analysis | `after-step:6` | Step 6: Generate Clarifying Questions |
| inception | units-generation | `before-step:3` | Step 3: Collect and Analyze Answers |
| inception | user-stories | `before-step:5` | Step 5: Collect Answers |
| construction | ci-pipeline | `after-step:2` | Step 2: Generate Clarifying Questions |
| construction | code-generation | `after-step:3` | Step 3: Plan Approval（質問ファイルはここで作られる。計画時の暫定値 `end-of-steps` を実装時に確定） |
| construction | functional-design | `before-step:3` | Step 3: Collect and Analyze Answers |
| construction | infrastructure-design | `before-step:3` | Step 3: Collect and Analyze Answers |
| construction | nfr-design | `before-step:3` | Step 3: Collect and Analyze Answers |
| construction | nfr-requirements | `before-step:4` | Step 4: Collect and Analyze Answers |
| operation | deployment-execution | `after-step:2` | Step 2: Pre-Deployment Checks |
| operation | deployment-pipeline | `after-step:2` | Step 2: Generate Clarifying Questions |
| operation | environment-provisioning | `after-step:2` | Step 2: Generate Clarifying Questions |
| operation | feedback-optimization | `after-step:2` | Step 2: Generate Questions |
| operation | incident-response | `after-step:2` | Step 2: Generate Clarifying Questions |
| operation | observability-setup | `after-step:2` | Step 2: Generate Clarifying Questions |
| operation | performance-validation | `after-step:2` | Step 2: Generate Clarifying Questions |

各ファイルは `(plugin, anchor, order)` が一意なら衝突しない。order は全部 `100` で統一。 — **済**

## 6. テスト(`grilling/tests/plugin.test.ts`)

1. `validatePluginContent(PLUGIN_ROOT)` が空配列を返す(共通バリデータ)。 — **済**（`aidlc-plugin-validate.ts` を実行して VALID を検査）
2. contribution の target 集合 == `core/aidlc-common/stages/**` のうち `-questions.md` を扱うステージ集合(28件)。取りこぼしと余りを両方検出する。 — **済**
3. 各 contribution の fragment 本文が `tests/fragment-template.md` と一致する。 — **済**（`sync-contributions.ts --check` の判定とも一致することを検査）
4. 各 anchor が対象ステージの実在する `### Step N` 見出しを指している。 — **済**（`end-of-steps` は使わなくなったので `## Steps` の確認は不要）
5. fragment 本文に sentinel 風の行(`<!-- /plugin:` など)が含まれない。 — **済**（加えて 0.2.0 の固定トークン、Depth の対応表、150 行以内を検査）
6. 7ハーネス分の投影が存在し、contributions が投影されている。 — **済**（一時ディレクトリへ build して検査。`dist/` はコミットしない）

計画にない追加: Claude・Kiro の install への実 compose（位置・drop ゼロ・冪等）、Claude の `aidlc-plugin-test.ts --install` ゲート、`installer.test.ts`（10 件）、`release.test.ts`（8 件）、`live-claude.test.ts`（opt-in）、`select-plugins.test.ts`（opt-in）。内訳は [`grilling/tests/README.ja.md`](../grilling/tests/README.ja.md)。

「test-pro と同様に integration tier に自動で拾われる」はフレームワーク repo 内の話なので **N/A**。代わりに `.github/workflows/ci.yml` が `bun test` を回す。

## 7. ビルド・インストール・有効化

計画時の `scripts/package.ts` と `dist/plugins/grill-me/<harness>/` はフレームワーク repo 内の仕組みなので使わない（**N/A**）。現在の手順:

```bash
# 推奨: インストーラ（タグ固定。詳細はルート README）
VERSION=v0.2.0
curl -fsSL "https://raw.githubusercontent.com/amadeus-dlc/aidlc-grilling-plugin/${VERSION}/grilling/scripts/install.ts" |
  bun - --project <your-aidlc-project> --tag "${VERSION}"

# 手動ビルド（grilling/ で。ツールチェーンは submodule から）
bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts .
bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . claude   # 7ハーネス分繰り返す → dist/<harness>/
```

| ハーネス | インストール |
|---|---|
| Claude Code | `/plugin marketplace add <repo>/grilling/dist/claude` → `/plugin install aidlc-grilling@aidlc-plugins`。次セッションの SessionStart で compose |
| Codex | `codex plugin marketplace add <repo>/grilling/dist/codex` → `codex plugin add aidlc-grilling@aidlc-plugins`(hook trust を1回承認) |
| Kiro CLI | 投影ディレクトリをフォルダドロップ → `AIDLC_PLUGIN_ROOT=… AIDLC_PROJECT_DIR=… AIDLC_HARNESS_DIR=.kiro aidlc plugin sync`(`aidlc` がなければ `bun $PLUGIN_ROOT/hooks/compose.ts`) |
| Kiro IDE / Cursor / opencode / Copilot | フォルダドロップ → SessionStart hook で compose(なければ `/aidlc plugin sync`) |

- contribution は **有効なプラグインにしかマージされない**。`/aidlc plugin list` で確認し、選択が絞られている環境では `/aidlc plugin select aidlc,grilling`。選択なし(`plugins` キーなし)なら全プラグイン有効。 — **済**（選択キーがある環境での実測は `grilling/docs/decisions.ja.md` の NG1 節）
- エンジン再インストール・アップグレード後はマージが消えるので `/aidlc plugin sync` を再実行する(README に明記)。 — **済**（ルート README とプラグイン README の両方。インストーラの完了案内にも表示）
- `/aidlc --doctor` の「Composed plugin surface」で状態を確認できる。 — **済**（README に記載。選択キー環境での doctor 表示の実測は未実施）

## 8. 検証手順

1. `bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts .` — **済**（CI とテストで毎回）
2. `bun scripts/package.ts && bun scripts/package.ts --check` — **N/A**（フレームワーク repo 内専用。代わりに `sync-contributions.ts --check` と 7 ハーネスの build を CI で回す）
3. `aidlc-plugin-test.ts --install <使い捨て install> --harness <name>` を7ハーネス分。compose drop ゼロ、2回目 compose で差分ゼロ(冪等)を確認。 — **済**（Claude: `tests/plugin.test.ts` の同梱ゲート。Claude・Kiro: 実 compose のテスト）／**残**（Claude 以外の 6 ハーネスの `--install`。§12）
4. `bun test tests/plugin.test.ts` — **済**（`bun test` 全体を CI で実行）
5. `bash tests/run-tests.sh --level integration` — **N/A**（フレームワーク repo 内専用）
6. ライブ確認(最低2ハーネス)
   - Claude Code: ワークフローを開始して intent-capture まで進め、AskUserQuestion に4択(+Other)が出ることを確認。Grill me を選び、推奨回答付きで出ること、質問ファイルと audit shard が毎画面更新されること、最後に summary 確認が出ることを確認。 — **済**（旧方式: `docs/live-check-2026-09-03.md`。headless 実行と Agent SDK 経由の `bun run test:live`。新方式: `docs/live-check-2026-09-04.md`。Build and Test で `bun run test:live` を 2 回実走し、2 回目で 5 pass / 0 fail）
   - Kiro CLI または Codex(番号付きプローズ): 5行目が Other になっていること、それ以外は同上。 — **残**（§12。番号付きプローズの描画自体は Claude Code の print モードで確認済み）

## 9. リスク・制約

既存構造の把握（`aidlc/spaces/default/codekb/aidlc-workflows/`）と実装で確定した事実で更新した。

| リスク | 対処 |
|---|---|
| プロンプトレベルの追加であり、プロトコル本文は3択のまま | fragment に「プロトコルの3択に加えて」と明記し、矛盾ではなく追加として読ませる。Claude Code のライブ確認で 4 択目が出ることを確認済み |
| 番号付きプローズ annex の canonical 例が「Other は4」 | fragment は annex の Other 規則と番号付け invariant をそのまま適用すると書く（行番号は書き直さない）。print モードの記録で Other が 5 行目になることを確認済み |
| Claude の AskUserQuestion は4選択肢が上限 | Grill me でちょうど埋まる。5番目のモードは今後追加できない。1 画面 4 問の上限は、5 問以上のラウンドを 4 問ずつ分けることで折り合わせた |
| 28ファイルがほぼ同一で drift しやすい | 原本 `tests/fragment-template.md` から `sync-contributions.ts` で生成し、`--check` を CI とテストで回す |
| `**Mode:** grill` を検証するツールがあるか | `core/tools`、`core/hooks` に Mode 値を検証するコードはない(grep 済み)。安全。0.2.0 で増えた `**Pending:**` と段階タグも同じ |
| **確定した事実**: `after-questions` アンカーは compose で drop される | compose フック（`scripts/plugin-hooks-template/compose.ts`）の `locateAnchor` に分岐がなく、"unknown anchor" として drop 記録に落ちる。使わず、ステージごとの `after-step:N` / `before-step:N` にした（§5） |
| **確定した事実**: validate は anchor / fragment の対応を検査しない | `aidlc-plugin-validate.ts` は対象ステージにそのステップがあるかを見ないので、誤ったアンカーは validate を通り compose で初めて落ちる。compose 層のテスト（Claude・Kiro への実 compose で位置・drop ゼロ・冪等を検査）が必須で、`tests/plugin.test.ts` にある |
| **確定した事実**: エンジン更新でマージが消える | 更新は compose 済みステージ本文を素のものに上書きする。`/aidlc plugin sync` の再実行が必要で、README とインストーラの完了案内に明記。インストーラの `--update` はこれを代行しない（grilling はペイロードファイルを持たないため、来歴が同じなら `Changed 0` で終わる） |
| code-generation のアンカー位置が未確定 | 確定: `after-step:3`（Step 3: Plan Approval） |
| リポジトリに置くなら user-visible PR 扱い | **N/A**。自分のリポジトリに置いたので `aidlc-version.ts`・README バッジ・CHANGELOG のバンプは不要。版は `grilling/.aidlc-plugin/plugin.json` と `release.ts` で管理する |

## 10. 作業手順

1. `grilling/` を手で作る(`aidlc-plugin-create.ts` はダミーステージを作るので、contributions のみなら手書きの方が早い)。 — **済**
2. `tests/fragment-template.md` に §3 の内容を英文で書く(コアの散文は英語)。 — **済**（0.2.0 で新方式に書き直し。139 行）
3. §5 の表どおりに28個の contribution を生成する(frontmatter の target / anchor だけ差し替え)。 — **済**（`scripts/sync-contributions.ts`）
4. `tests/plugin.test.ts` を書く。 — **済**
5. §8 の 1〜5 を通す。 — **済**（1・3（Claude）・4。2・5 は N/A）
6. Claude Code と Kiro CLI(または Codex)でライブ確認。 — **済**（Claude Code）／**残**（Kiro CLI または Codex。§12）
7. README を書く。リポジトリに入れるなら version / CHANGELOG をバンプする。 — **済**（プラグイン README ja / en、ルート README ja / en。CHANGELOG は参照先に無いので作らず、版は `release.ts` で上げる）

規模感: fragment 本文 40行前後、contribution 28ファイル、テスト1本、README 1本。 — 実績: fragment 本文 139 行（0.1.0 は 43 行）、contribution 28 ファイル、テスト 5 本（うち opt-in 2 本）、README 4 本（ja / en × ルート・プラグイン）、スクリプト 3 本。

## 11. 成功指標 3 の証拠（実プロジェクトで Grill me を 1 ステージ分使い切る）

意図の成功指標 3 は「実プロジェクトで Grill me を 1 ステージ分使い切り、質問ファイルと監査記録が毎問更新される」。要求整理の Q3 で、grilling-sandbox の既存記録で充足したとみなし、新方式のライブ確認の記録も証拠に加えると決めた。

**旧方式（0.1.0、1 問ずつ）の記録: [`docs/live-check-2026-09-03.md`](live-check-2026-09-03.md)**

- 対象: `grilling-sandbox/`（`aidlc-workflows/dist/claude` のコピーに compose 済み）。Claude Code の headless セッション（`claude -p`、モデル `claude-sonnet-5`）で `/aidlc --scope feature …` を走らせ、intent-capture の 1 ステージ分を Grill me で使い切った
- 集計（同記録の表より）: 質問数 8 / `**Mode:** grill` の数 8、`DECISION_RECORDED` 10（モード選択 1 + 質問 8 + summary 確認 1）、`QUESTION_ANSWERED` 9（モード選択 1 + 質問 8）、`ARTIFACT_UPDATED` 9、headless 実行の合計コスト $3.75（初回 $1.50 + 再開 10 回）
- 4 択目の描画（Other が 5 行目）、`[Answer]:` への書き戻しと `**Mode:** grill` の独立行、`## Consolidated Summary Confirmation` への合流を原文で記録
- 追記: Agent SDK 経由の `AskUserQuestion` 確認（`bun run test:live`）で、メニュー 1 が 4 択、メニュー 2・3 が各 1 問で先頭が `(Recommended)`。fragment の是正を経て 4 pass / 0 fail（251 秒、220 秒、287 秒の 3 回）

**新方式（0.2.0、ラウンド）の記録: [`docs/live-check-2026-09-04.md`](live-check-2026-09-04.md)**

- 対象: `aidlc-workflows/dist/claude` から作った使い捨て install（Agent SDK 経由の `bun run test:live`、モデル sonnet）。別途、リポジトリの隣の `grilling-sandbox` を作り直して `grilling/scripts/install.ts --from` で導入し、`aidlc-plugin-test.ts --install`（CLEAN、drop 0、idempotent）と `/aidlc --doctor`（50 項目合格、Composed plugin surface に 28 ステージ）を通した（人の指示「最終的にサンドボックスで検証」）
- 集計（同記録より）: 実走 2 回。1 回目（371 秒）は 1 ラウンド 6 問を 4 + 2 の 2 画面に分割、推奨が先頭、画面 2 の答えは画面 3 の前に書き戻し（`**Mode:** grill` 4 件）、`DECISION_RECORDED` 3 / `QUESTION_ANSWERED` 2 — ただし `(Recommended)` が 6 問中 5 問で label ではなく description に付き、テスト 2 件 fail。断片の描画規則を label と明示する文に直して 2 回目（340 秒）: 1 ラウンド 7 問を 4 + 3 に分割、7 問すべて先頭 label に `(Recommended)`、`**Mode:** grill` 4 件、`DECISION_RECORDED` 3 / `QUESTION_ANSWERED` 2、**5 pass / 0 fail**
- 同じ画面の質問どうしの独立性は人が読んで判断し、記録に書いた（依存する質問が同じ画面に出た例は無し）
- 検証の中身は [`grilling/tests/README.ja.md`](../grilling/tests/README.ja.md) の `live-claude.test.ts` の項

## 12. 今後の課題

Claude Code 以外のハーネスの検証（要求整理の Q1・Q2 で「一旦 Claude だけ」と決めたもの）:

1. Claude 以外 6 ハーネス（codex / copilot / cursor / kiro / kiro-ide / opencode）での `aidlc-plugin-test.ts --install <使い捨て install> --harness <name>`。投影の build と、Claude・Kiro への実 compose のテストは済んでいる
2. 番号付きプローズ系ハーネス（Kiro CLI または Codex）での実機ライブ確認。確認する点は、Other が 5 行目であること、1 ラウンドが ❓ / ➡️ / `---` の 1 メッセージで届くこと、番号で答えた結果が `[Answer]:` に書き戻されること。番号付きプローズの描画自体は Claude Code の print モード（`docs/live-check-2026-09-03.md`）で確認済み

フレームワーク側の制約（上流 aidlc-workflows v2.7.0 への報告事項。このリポジトリではフレームワークを書き換えない）:

3. **Unit を切らないスコープで Unit ごとのステージを回すと「確認済みの検査」が通らない。** plugin-dev のように Unit を切らないスコープでは、Unit ごとのステージ（functional-design、code-generation）の成果物がステージ直下（`construction/functional-design/` など）に置かれる。しかしレビュー依頼と承認ゲートの「確認済みの検査」（`checkSummaryConfirmationEvidence`）は `construction/<unit>/<stage>/` しか探さないため、質問ファイルの確認（Looks correct）が記録されていても見つけられず、依頼とゲートが拒否される。今回はレビュー依頼と承認ゲートのコマンドに限り `AIDLC_SKIP_SUMMARY_CONFIRMATION_GUARD=1` を付けて回避した（人の許可あり。`aidlc/spaces/default/memory/project.md` の Corrections に記録）。同じ原因で、traceability センサーも Unit を導けずに advisory で失敗した（[awslabs/aidlc-workflows#1011](https://github.com/awslabs/aidlc-workflows/issues/1011)。レビューアが BR の参照先を手で確かめた）。**対処（計画完了後）**: plugin-dev スコープに `units-generation` を EXECUTE として加えた。Unit を 1 つ以上切れば、Unit ごとのステージの成果物は `construction/<unit>/<stage>/` に置かれ、「確認済みの検査」（[awslabs/aidlc-workflows#1020](https://github.com/awslabs/aidlc-workflows/issues/1020)）も traceability センサーも本来の経路で動くので、次の intent からは環境変数での回避が要らない。理由は `.claude/scopes/aidlc-plugin-dev.md` に、上流の追跡は姉妹プラグインの [amadeus-dlc/aidlc-deep-spec-analysis-plugin#138](https://github.com/amadeus-dlc/aidlc-deep-spec-analysis-plugin/issues/138) に記録。上流の修正が入ったら SKIP に戻すかを見直す
4. **code-generation の Plan Approval ガードは、ステージ定義が求めるチェックボックス更新で承認が失効する。** ガード（`aidlc-plan-approval-guard`）は計画ファイルの bytes を承認の指紋に含める一方、ステージ定義の Step 4 は完了したステップのチェックボックスを更新するよう求める。チェックを付けた瞬間に指紋が変わって承認が失効し、以後のワークスペースへの書き込みがすべて拒否される。今回は Step 1〜7 のチェックで一度失効し、`next` で directive を出し直して人に再承認してもらった（監査に `PLAN_APPROVAL_BLOCKED` 3 件）。以後の依頼では計画ファイルを触らず、完了ステップは返答で受け取ることにした

Build and Test のサンドボックス検証で見つけて直したもの（上流への報告ではなく、このリポジトリで修正済み）:

5. **contributions のみのプラグインでは、インストーラの「変更なし」判定に contributions を含める必要がある。** 参照先 deep-spec-analysis を写した `install.ts` は provenance の `payload_sha256` をペイロードのファイル（sensors / tools など）だけから計算していたため、grilling では断片テンプレートを変えても `Changed 0` で合成を省いた。ダイジェストを「投影のペイロードファイル＋ `contributions/**`」に広げ、テストとサンドボックスで「断片を変えて再実行すると合成し直し、その次は `Changed 0`」を確認した（`docs/live-check-2026-09-04.md`）。エンジンの再インストールで合成が消えた場合は検出できないので `/aidlc plugin sync` を再実行する（README に明記）
6. **ライブ確認 1 回目で `(Recommended)` が label ではなく description に付いた。** 断片の描画規則を「印は選択肢の label に付ける」と一読で分かる文に直し、2 回目で 7 問すべて label に印が付いた

記録のみの項目: 選択キー環境（`harness.json` の `plugins`）での compose は肯定的な結果（28 / 28 ステージ、drop 0。`grilling/docs/decisions.ja.md` の NG1 節）。同環境での `/aidlc --doctor` の「Composed plugin surface」表示は未実測。
