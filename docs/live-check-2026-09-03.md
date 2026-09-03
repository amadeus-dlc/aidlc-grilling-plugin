# ライブ確認記録 — Grill me モード（2026-09-03）

計画書 [plugin-plan.md](plugin-plan.md) §8.6 のライブ確認を、Claude Code の headless セッションで実施した記録。プラグインは PR #2 でマージされた `grilling` 0.1.0。

## 方法

- **対象 install**: `grilling-sandbox/`（`aidlc-workflows/dist/claude` のコピーに `grilling/dist/claude` を `hooks/compose.ts` で compose 済み。28 ステージにフラグメントが入っていることは `bun test` と `aidlc-plugin-test.ts` で確認済み）
- **モデル / 認証**: sandbox の `.claude/settings.local.json` で出荷既定の Bedrock を無効化し `model: sonnet`（deep-spec-analysis の E2E 検証と同じ override）。実際に使われたモデルは `claude-sonnet-5`
- **起動**: Claude Code セッション内から起動するため `CLAUDECODE` などのネスト検出用環境変数を外し、`claude -p` で `/aidlc --scope feature <説明>` を実行。以後は同じセッションを `claude -p --resume <session-id> "<回答>"` で 1 ターンずつ進めた
- **print モードの制約**: `AskUserQuestion` ツールが使えないため、オーケストレーターは質問を番号付きプローズで描画した。番号付きプローズは Kiro / Cursor / opencode / Copilot / Codex フォールバックと同じ描画なので、その経路の確認を兼ねる

```sh
cd grilling-sandbox
env -u CLAUDECODE -u CLAUDE_CODE_ENTRYPOINT -u CLAUDE_CODE_SESSION_ID -u CLAUDE_CODE_CHILD_SESSION \
    -u CLAUDE_CODE_MESSAGING_SOCKET -u CLAUDE_CODE_MESSAGING_TOKEN -u CLAUDE_PID -u CLAUDE_CODE_EXECPATH \
  claude -p '/aidlc --scope feature Build a small command-line tool that prints a personalised greeting for a given name' \
    --output-format stream-json --verbose --dangerously-skip-permissions --max-turns 80 --max-budget-usd 8
# 以後: claude -p --resume <session-id> "Grill me" / "1" ... を繰り返す
```

## 結果

### 1. モード選択に 4 択目が出る

intent-capture が 8 問の質問ファイルを書いた直後、モード選択は次のとおり描画された（原文ママ）。

```
1. **Guide me** — Walk through each question interactively here
2. **I'll edit the file** — I'll fill in the answers in the file directly
3. **Chat** — Discuss freely, I'll extract decisions from our conversation
4. **Grill me** — Interview me one question at a time with a recommended answer; drill into every branch until we share the same understanding
5. **Other** (please specify)
```

提示前の監査記録も 4 択で残っている。

```
**Event**: DECISION_RECORDED
**Stage**: intent-capture
**Options**: Guide me,I'll edit the file,Chat,Grill me
```

### 2. Grill me を選ぶと 1 問ずつ、推奨回答付きで出る

`Grill me` の回答は `QUESTION_ANSWERED`（Details: `Grill me`）として記録された。最初の質問はファイル上の Q8（スコープ確認）で、「他の質問の枠組みを決めるので先に聞く」と依存順の理由を添えて 1 問だけ提示された。推奨選択肢が先頭で "(Recommended)" と理由が付く。

```
**Question 1 of 8 (Q8 in the file — asking this one first since it shapes how I frame the rest):**
...
1. **Confirm `feature` scope** (Recommended) — reasoning: you explicitly started the workflow with `--scope feature`, ...
2. Actually simpler — I just want a working script with minimal process
3. Not yet defined
4. Other (please specify)
```

### 3. 回答ごとに書き戻しと監査記録が行われる

`1` と答えると、質問ファイルの Q8 に回答が書き戻され `**Mode:** grill` が付いた。監査には `ARTIFACT_UPDATED` → `QUESTION_ANSWERED`（Details: `Confirm feature scope`）→ 次の質問の `DECISION_RECORDED` が、それぞれ異なるタイムスタンプで並んだ。

```
[Answer]: A. Confirm `feature` — I want the fuller process (requirements, design, tests, etc.) even for this small tool
**Mode:** grill
```

### 4. 全問回答後に summary 確認へ合流する

推奨回答を選び続けて 8 問を終えると、質問ファイルに `## Consolidated Summary Confirmation` が空の `[Answer]:` 付きで追記され、次の確認が提示された。

```
Does this all look correct before I generate the artifact?

1. **Looks correct** — generate the artifact from these answers
2. **Request changes** — revise one or more answers before generation
```

### 集計

| 項目 | 値 |
|---|---|
| 質問数 / `**Mode:** grill` の数 | 8 / 8 |
| `DECISION_RECORDED` | 10（モード選択 1 + 質問 8 + summary 確認 1） |
| `QUESTION_ANSWERED` | 9（モード選択 1 + 質問 8） |
| `ARTIFACT_UPDATED` | 9 |
| headless 実行の合計コスト | $3.75（初回 $1.50 + 再開 10 回） |

## 追記: Agent SDK 経由の `AskUserQuestion` 確認（同日）

print モードで未確認だった Claude Code 固有のツール描画を、aidlc-workflows のテストハーネス `tests/harness/sdk-drive.ts`（Claude Agent SDK 0.3.158 の `canUseTool` で `AskUserQuestion` を捕捉して回答する）を `grilling/tests/harness/` にコピーして確認した。改変は 3 点のみ（提供元の表記、`dist/claude` の解決先を submodule に、ネスト検出用環境変数の除去）。テストは `grilling/tests/live-claude.test.ts`（`AIDLC_CLAUDE_SDK_LIVE=1` で opt-in、`bun run test:live`）。使い捨ての install に compose し、`/aidlc --scope feature …` を Sonnet で走らせ、3 つ目のメニューまで進めて止める。

### 捕捉した `AskUserQuestion`（1 回目、原文ママ）

メニュー 1 — header `Questions`。4 選択肢がちょうど埋まり、Other はツール組み込みのもの。

```
1. Guide me — Walk through each question interactively here
2. I'll edit the file — I'll fill in the answers in the file directly
3. Chat — Discuss freely — I'll extract decisions from our conversation
4. Grill me — Interview me one question at a time with a recommended answer; drill into every branch until we share the same understanding
answered: "Grill me"
```

メニュー 2 — header `Q1 — Use case`。1 問だけ、推奨が先頭。

```
1. A. A learning or demo project (Recommended) — Practising CLI development or showcasing the concept — the most natural fit ...
2. B. A personal or team utility — ...
3. C. A component of a larger application — ...
4. D. A shared tool for distribution or deployment — ...
```

メニュー 3 — header `Q2 — Users`。同じく 1 問、先頭が `(Recommended)`。監査には `QUESTION_ANSWERED`（Details: `Grill me`）→ `DECISION_RECORDED` → `HUMAN_TURN` → `ARTIFACT_UPDATED` → `QUESTION_ANSWERED` → `DECISION_RECORDED` が別タイムスタンプで並んだ。

### 見つかった欠陥と是正

1 回目の実行では、回答の書き戻しが `[Answer]: A. A learning or demo project **Mode:** grill` と**回答値と同じ行**に印を置いた（先の headless 実行では独立行だった）。フラグメントの「`[Answer]:` タグに `**Mode:** grill` 付きで書く」が配置を決めていなかったため。フラグメントを「タグ直下の独立行に置き、回答値の中には書かない」と明示して 28 本を再生成した。ライブテスト側は印の存在を検証し、行の配置はモデル生成の書式として固定しない。

### 再実行

明示後のフラグメントで再実行した結果、ライブテストは 4 件すべて成功（`4 pass / 0 fail`、251 秒）。メニュー 1 は同じ 4 択、メニュー 2・3 は各 1 問で先頭が `(Recommended)`。書き戻しは印が独立行になった。

```
[Answer]: A. A learning exercise or personal project — the goal is to practice building a CLI tool
**Mode:** grill
```

## 追記: フラグメントの本体参照化（同日、CodeRabbit 指摘への対応）

PR #2 の CodeRabbit レビューは、フラグメントが `aidlc-log.ts decision --decision "…"` のようにコマンド形を書いている箇所を CWE-78（ユーザー入力のシェル埋め込み）として指摘した。オーナーの指摘どおり、質問の表示方法は各ハーネスの question-rendering annex、記録方法は stage-protocol §3 が決めることで、プラグインが固有に定めるものではない。フラグメントから **コマンド形と行番号の記述をすべて外し**、「annex どおりに描画する」「§3 の decision/answer ペアで記録する」という参照に置き換えた。残るのは 4 択目の定義と Step 3d の手順（1 ターン 1 問・依存順・推奨先頭・事実は自分で調べる・書き戻し・派生質問の先行追記・Step 3a への合流）だけ。

- 参照化した直後のライブテスト: 1 pass / 3 fail。4 択は維持されたが、推奨選択肢が先頭に来ず（D に "(Recommended)" を付けたまま A〜D 順）、書き戻し前に次の質問へ進んだ
- Step 3d の 2 項目を命令形に明確化（「構造化質問では推奨を**先頭**に置き "(Recommended)" を付ける。並べ替えは提示のみで、ファイルの順序と記号は保つ」「次の質問を出す前に書き戻す」）して再実行: **4 pass / 0 fail**（220 秒）。表示・記録のルールは本体参照のまま

## 追記: ライブテストのハーネス側の欠陥（同日）

本体参照化後の再実行を重ねる中で、フラグメントと無関係にライブテストが落ちる回があった（2 pass / 2 fail: 「3 メニューに到達」「回答の書き戻し」）。トレースを見ると、モデルは質問ファイルの A〜E をそのまま 5 択で `AskUserQuestion` に渡し、入力検証（選択肢は 4 つまで）に弾かれてから 4 択で再試行していた。コピーした上流ドライバは、この**弾かれた呼び出しも** `stopAfterAskUserQuestionAt` の数に入れていたため、2 つ目の回答直後・書き戻し前に停止していた。ドライバの停止条件を「`canUseTool` で捕捉したメニューの数」に改め（ドライバへの 4 点目の改変。`permissionOptions.toolUseID` を停止 id にする）、再実行は **4 pass / 0 fail**（287 秒）。

5 択で呼んで弾かれる挙動は、5 つ以上の選択肢を複数の構造化質問に分けるというコアプロトコル §3a の規則をモデルが守っていないもので、このプラグインの管轄外。ただし観察として記録しておく。

## 未確認（今後）

- Kiro CLI / Codex での実行（番号付きプローズの描画自体は本記録で確認済み）
- 派生質問（分岐）を空の `[Answer]:` 付きで先に追記する挙動。今回の回答では分岐が発生しなかった
