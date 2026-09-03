# Grill me プラグイン 計画案

## 1. ゴール

AI-DLC v2 の質問モード選択(Guide me / I'll edit the file / Chat)に **Grill me** を追加する。

- 本体(`core/`、`harness/`)は一切変更しない。
- Claude Code、Kiro CLI、Kiro IDE、Codex、Cursor、opencode、Copilot の全7ハーネスで動く。
- 配布は AIDLC プラグイン機構(`plugins/<name>/` → `dist/plugins/<name>/<harness>/`)を使う。

## 2. 方式

**contributions のみのプラグイン `grill-me`。** 新ステージ、agent、scope、sensor は持たない。

モード選択の定義文は `core/aidlc-common/protocols/stage-protocol.md` §3 Step 2 にあり、プラグインはプロトコルを差し込み対象にできない(contribution の target はコアステージのスラッグ限定)。そこで、質問ファイルを持つコアステージ28個それぞれに contribution を置き、fragment で次を差し込む。

1. 「モード選択を出すときは、プロトコルの3択に加えて4番目の選択肢 **Grill me** を出せ」
2. 「Grill me が選ばれたときの手順(Step 3d 相当)」

fragment はハーネス中立の英文で書き、描画は各ハーネスの `question-rendering.md` に任せる。オーケストレーターは質問を組み立てるときにプロトコルとステージ本文の両方を読むので、ステージ側の追記で4択目が出る。

## 3. Grill me モードの仕様(fragment の中身)

### 3.1 選択肢

| 項目 | 値 |
|---|---|
| label | `Grill me` |
| description | `Interview me one question at a time with a recommended answer; drill into every branch until we share the same understanding` |
| 位置 | Guide me / I'll edit the file / Chat の次(4番目) |

番号付きプローズのハーネス(Kiro、Codex fallback、Cursor、opencode、Copilot)では Grill me が4行目、Other が5行目になる。これは annex の pre-send invariant(最終行が Other、Other は1つ、番号は非Other数+1)を満たす。annex の canonical 例は「Other が4」と書いているので、fragment に「Grill me を足したら Other は5に繰り下げる」と明記する。

Claude Code の AskUserQuestion は上限4選択肢 + 組み込み Other なので、ちょうど収まる。

### 3.2 手順(Step 3d: If "Grill me")

Guide me のバッチサイズ1版 + 推奨回答 + 依存順の分岐深掘り、という位置づけ。帳簿は Guide me と完全に同じにする。

- 質問ファイルの質問を依存関係順に並べ、**1問ずつ** structured question として出す。各問に推奨回答とその理由を添える。複数問を同時に出さない。
- 事実(既存コード、過去ステージの成果物、設定)は環境を調べて自分で埋め、ユーザーに聞かない。決定だけをユーザーに委ねる。
- 回答を受けたら即座に `[Answer]:` に書き戻す(`**Mode:** grill`)。`aidlc-log.ts decision` / `answer` で監査記録を取り、毎回 `date -u` で新しいタイムスタンプを取る。
- 回答から派生した深掘り質問は、**ターンを終える前に**質問ファイルへ空 `[Answer]:` 付きで追記してから提示する(forwarding-loop の Stop フックが「人待ち」と判定できるようにするため)。
- 全問が埋まったら Step 3a と同じ流れに合流する。consolidated summary → `aidlc-review-brief.ts summary` → Looks correct / Request changes の確認。
- 途中でのモード切替は既存仕様どおり許可。
- Depth 別の質問数の目安は既存の表に従う。フォローアップは常に許可(既存ルール)。

### 3.3 やらないこと

- `/grilling` スキルへの依存。エミッタは `skills/` を投影しないし、他人の環境にそのスキルはない。手順は fragment にインラインで書く。
- Chat モードの置き換え。Grill me は質問ファイル駆動で毎問の帳簿を取る点が Chat と違う。

## 4. ファイル構成

```
plugins/grill-me/
  .aidlc-plugin/plugin.json      # contributes: { "overlays": "contributions/" } のみ
  README.md                      # 目的、インストール、有効化、upgrade 後の plugin sync
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
  tests/
    fragment-template.md         # 28ファイル共通の fragment 本文(唯一の原本)
    plugin.test.ts               # 下記 §6 のテスト
```

- `plugin.json` の `name` は `grill-me`(小文字ケバブ、`aidlc-` 接頭辞禁止)。ホスト側パッケージ ID は自動で `aidlc-grill-me` になる。
- `adds:` は空でよい(produces / consumes / sensors なし)。fragment のみ。
- 28ファイルの fragment 本文は同一。`tests/fragment-template.md` を原本にし、テストで一致を検証する(`tests/` は install にコピーされない)。

## 5. アンカー対応表

`after-questions` は未実装(compose が "unknown anchor" で drop する)ので使わない。質問生成ステップの直後、または回答収集ステップの直前に置く。

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
| construction | code-generation | `end-of-steps`(要確認) | 質問は例外扱い。実装時にステップ番号を確認して差し替える |
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

各ファイルは `(plugin, anchor, order)` が一意なら衝突しない。order は全部 `100` で統一。

## 6. テスト(`plugins/grill-me/tests/plugin.test.ts`)

1. `validatePluginContent(PLUGIN_ROOT)` が空配列を返す(共通バリデータ)。
2. contribution の target 集合 == `core/aidlc-common/stages/**` のうち `-questions.md` を扱うステージ集合(28件)。取りこぼしと余りを両方検出する。
3. 各 contribution の fragment 本文が `tests/fragment-template.md` と一致する。
4. 各 anchor が対象ステージの実在する `### Step N` 見出しを指している(`end-of-steps` は `## Steps` の存在を確認)。
5. fragment 本文に sentinel 風の行(`<!-- /plugin:` など)が含まれない。
6. `dist/plugins/grill-me/<harness>/` が7ハーネス分存在し、contributions が投影されている。

test-pro と同様に integration tier に自動で拾われる。

## 7. ビルド・インストール・有効化

```bash
# ビルド(リポジトリ内の場合。dist/plugins/grill-me/<harness>/ はコミット対象、drift guard あり)
bun scripts/package.ts
bun scripts/package.ts --check

# 単体ビルド(リポジトリ外の場合)
bun <tools-dir>/aidlc-plugin-validate.ts plugins/grill-me
bun <tools-dir>/aidlc-plugin-build.ts plugins/grill-me claude   # 7ハーネス分繰り返す
```

| ハーネス | インストール |
|---|---|
| Claude Code | `/plugin marketplace add <repo>/dist/plugins/grill-me/claude` → `/plugin install aidlc-grill-me@aidlc-plugins`。次セッションの SessionStart で compose |
| Codex | `codex plugin marketplace add <repo>/dist/plugins/grill-me/codex` → `codex plugin add aidlc-grill-me@aidlc-plugins`(hook trust を1回承認) |
| Kiro CLI | 投影ディレクトリをフォルダドロップ → `AIDLC_PLUGIN_ROOT=… AIDLC_PROJECT_DIR=… AIDLC_HARNESS_DIR=.kiro aidlc plugin sync`(`aidlc` がなければ `bun $PLUGIN_ROOT/hooks/compose.ts`) |
| Kiro IDE / Cursor / opencode / Copilot | フォルダドロップ → SessionStart hook で compose(なければ `/aidlc plugin sync`) |

- contribution は **有効なプラグインにしかマージされない**。`/aidlc plugin list` で確認し、選択が絞られている環境では `/aidlc plugin select aidlc,grill-me`。選択なし(`plugins` キーなし)なら全プラグイン有効。
- エンジン再インストール・アップグレード後はマージが消えるので `/aidlc plugin sync` を再実行する(README に明記)。
- `/aidlc --doctor` の「Composed plugin surface」で状態を確認できる。

## 8. 検証手順

1. `bun core/tools/aidlc-plugin-validate.ts plugins/grill-me`
2. `bun scripts/package.ts && bun scripts/package.ts --check`
3. `bun core/tools/aidlc-plugin-test.ts plugins/grill-me --install <使い捨て install> --harness <name>` を7ハーネス分。compose drop ゼロ、2回目 compose で差分ゼロ(冪等)を確認。
4. `bun test plugins/grill-me/tests/plugin.test.ts`
5. `bash tests/run-tests.sh --level integration`
6. ライブ確認(最低2ハーネス)
   - Claude Code: ワークフローを開始して intent-capture まで進め、AskUserQuestion に4択(+Other)が出ることを確認。Grill me を選び、1問ずつ推奨回答付きで出ること、質問ファイルと audit shard が毎問更新されること、最後に summary 確認が出ることを確認。
   - Kiro CLI または Codex(番号付きプローズ): 5行目が Other になっていること、それ以外は同上。

## 9. リスク・制約

| リスク | 対処 |
|---|---|
| プロンプトレベルの追加であり、プロトコル本文は3択のまま | fragment に「プロトコルの3択に加えて」と明記し、矛盾ではなく追加として読ませる。ライブ確認で各ハーネスの挙動を見る |
| 番号付きプローズ annex の canonical 例が「Other は4」 | fragment で「Grill me を足したら Other は5」と明示。pre-send invariant には適合する |
| Claude の AskUserQuestion は4選択肢が上限 | Grill me でちょうど埋まる。5番目のモードは今後追加できない |
| 28ファイルがほぼ同一で drift しやすい | 原本 `tests/fragment-template.md` との一致テスト |
| `**Mode:** grill` を検証するツールがあるか | `core/tools`、`core/hooks` に Mode 値を検証するコードはない(grep 済み)。安全 |
| エンジン upgrade でマージが消える | 既知の仕様。README と doctor で案内 |
| code-generation のアンカー位置が未確定 | 実装時にステージ本文を読んで確定。暫定 `end-of-steps` |
| リポジトリに置くなら user-visible PR 扱い | `core/tools/aidlc-version.ts`、README バッジ、CHANGELOG のバンプが必要(t68)。自分のリポジトリで持つなら不要。標準ツールは checkout なしで動く |

## 10. 作業手順

1. `plugins/grill-me/` を手で作る(`aidlc-plugin-create.ts` はダミーステージを作るので、contributions のみなら手書きの方が早い)。
2. `tests/fragment-template.md` に §3 の内容を英文で書く(コアの散文は英語)。
3. §5 の表どおりに28個の contribution を生成する(frontmatter の target / anchor だけ差し替え)。
4. `tests/plugin.test.ts` を書く。
5. §8 の 1〜5 を通す。
6. Claude Code と Kiro CLI(または Codex)でライブ確認。
7. README を書く。リポジトリに入れるなら version / CHANGELOG をバンプする。

規模感: fragment 本文 40行前後、contribution 28ファイル、テスト1本、README 1本。
