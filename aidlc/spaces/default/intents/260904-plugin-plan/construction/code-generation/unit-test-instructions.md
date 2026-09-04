# テスト手順 — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

## テストの枠組み

- ランナー: `bun test`（bun 1.3.13。`grilling/package.json` の devDependencies に `@types/bun`、`typescript`、`@anthropic-ai/claude-agent-sdk` を固定。`bun install --frozen-lockfile` で入れる）
- 型検査: `bunx tsc --noEmit`（`grilling/tsconfig.json`）
- 前提: submodule `aidlc-workflows` が checkout されていること（validate / build / compose の道具と、compose テストの元になる `dist/<harness>` を供給する）。別の場所にあるなら `AIDLC_WORKFLOWS_CHECKOUT` で指す
- すべてのコマンドは `grilling/` で実行する（CI の `working-directory` と同じ）

## この作業のテストを動かすコマンド（単位ごと）

最初の実装に入る前に、既存のスイートが動くことを確かめる（契約の runner_step）:

```bash
cd grilling
bun install --frozen-lockfile
bun test tests/plugin.test.ts
bunx tsc --noEmit
bun scripts/sync-contributions.ts --check
```

各コンポーネントのテスト（実装の後に書いて実行する。test-after）:

| コンポーネント | テストファイル | コマンド | 件数の目安（Standard） |
|---|---|---|---|
| ContributionOverlay（断片・contribution・投影・compose） | `tests/plugin.test.ts`（既存を更新） | `bun test tests/plugin.test.ts` | 既存 12 件 + トークン検査の更新（合計 12〜14 件） |
| VerificationSuite（ライブ確認、Claude のみ） | `tests/live-claude.test.ts`（既存を更新） | 型のみ: `bunx tsc --noEmit`。実走は Build and Test で `AIDLC_CLAUDE_SDK_LIVE=1 bun test tests/live-claude.test.ts`（= `bun run test:live`） | 4 件（画面 1 / 画面 2 / 画面 3 以降 / 帳簿） |
| VerificationSuite（NG1 選択キー環境、opt-in） | `tests/select-plugins.test.ts`（新設） | `GRILLING_SELECT_KEY_CHECK=1 bun test tests/select-plugins.test.ts`（既定は skip） | 2〜3 件 |
| Installer | `tests/installer.test.ts`（新設） | `bun test tests/installer.test.ts` | 5〜8 件 |
| ReleaseTool | `tests/release.test.ts`（新設） | `bun test tests/release.test.ts` | 5〜8 件 |

全体（CI と同じ順）:

```bash
cd grilling
bunx tsc --noEmit
bun scripts/sync-contributions.ts --check
bun test
bun ../aidlc-workflows/core/tools/aidlc-plugin-validate.ts .
for h in claude codex copilot cursor kiro kiro-ide opencode; do bun ../aidlc-workflows/core/tools/aidlc-plugin-build.ts . "$h"; done
```

`bun test` は live と select-plugins を環境変数が無い限り skip する。

## 目標

- 既存スイートを green に保つ（plugin-dev スコープの下限）。新設コンポーネントは 5〜8 件（Standard）。カバレッジの数値目標は設けない
- CI 全体で 15 分以内（NFR1）。現状の compose テスト（Claude / Kiro）と plugin-test を含めて数分
- ネットワークに出るテストを書かない（GitHub のアーカイブ取得はテストしない。`--from` のローカル経路で代替）

## モック・スタブの方針

- **Installer**: 使い捨てプロジェクトは `aidlc-workflows/dist/claude` を `mkdtemp` にコピーして作る（既存 `plugin.test.ts` の `installFixture` と同じ）。ソースは `--from <このリポジトリの grilling/>` で与える。アーカイブ展開の安全性は、テスト内で `tar` コマンドまたは手書きの tar.gz（`..` を含むパス、symlink エントリ）を作って `extract` 相当の関数に渡す（参照先 `installer.test.ts` の "rejects path traversal and archive links" を写す）。`--tag` / `--ref` / latest の取得はテストしない
- **ReleaseTool**: git 操作は `GitRunner` 型の関数として注入し、テストでは呼ばれたコマンド列を記録する偽の runner を渡す（参照先 `release.test.ts` を写す）。manifest は `mkdtemp` にコピーした `plugin.json` を使う
- **ライブ確認**: Claude Agent SDK の `canUseTool` で AskUserQuestion を受ける既存の `tests/harness/sdk-drive.ts` を使う。答えは「画面 1 は Grill me、以後は先頭の選択肢」（既存の answerScript）。モデルは `GRILLING_LIVE_MODEL`（既定 sonnet）
- **select-plugins（NG1）**: `harness.json` に `plugins: ["aidlc", "grilling"]` を書いた使い捨て install に対して build → compose し、28 ステージの sentinel と `.drops` の不在を数える

## テストデータ

- 断片の固定トークン（`Grill me`、description の 1 文、`(Recommended)`、`**Mode:** grill`、`**Pending:**`、`Decided assumptions`、`❓` / `➡️`、XL〜SS と Depth の表）はテスト内の定数として持ち、`tests/fragment-template.md` と突き合わせる
- 一時ディレクトリは各 describe の `beforeAll` で作り `afterAll` で消す（`AIDLC_KEEP_TEMP=1` で残す既存の慣習に合わせる）
- git を実際に触るテストは書かない（release は注入、installer は git を使わない）
