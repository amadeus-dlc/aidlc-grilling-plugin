# grilling テスト

[English](README.md) | 日本語

プラグインルートで `bun install && bun test` を実行します。テストは `plugin.test.ts` 1本で、隣の `aidlc-workflows` checkout（このリポジトリの submodule）からバリデータ・ビルダー・compose フック・コアステージの原文・ハーネスごとの `dist/` install を借ります。checkout が別の場所にあるときは `AIDLC_WORKFLOWS_CHECKOUT` で指定します。

- **Authored content** — `aidlc-plugin-validate.ts` が VALID であること。manifest が `overlays` だけを宣言していること。contribution のターゲットが「本文で `-questions.md` に言及するコアステージ」の集合と双方向に一致し、フェーズも合うこと。各 contribution がテンプレートをそのターゲット向けに描画したものと一致し、`sync-contributions.ts --check` も同じ判定を返すこと。各アンカーがコアステージ原文の実在する `### Step N` 見出しに解決すること。テンプレートが label・description・Step 3d を含み、sentinel 風の行や入れ子の fragment 見出しを含まず、フェンスが釣り合っていること
- **Harness projections** — 7ハーネスすべてで `aidlc-plugin-build.ts` が一時ディレクトリへ成功すること。各投影が28本の contribution をバイト同一で持ち、compose フックと `aidlc-grilling` という名前のホスト manifest を持ち、`stages/`・`agents/`・`scopes/`・`sensors/`・`tools/`・`knowledge/` を持たないこと
- **Compose** — Claude と Kiro について、checkout の `dist/<harness>` install のコピーへ、投影に同梱された本物の `hooks/compose.ts` で compose する。各ターゲットステージがアンカー位置に sentinel で区切られたブロックをちょうど1つ持つこと（指定ステップの直後で間に見出しが無い、または直前）。ブロックが `{{HARNESS_DIR}}` 置換済みのテンプレート本文を含むこと。`*.drops` ファイルが書かれていないこと。2回目の compose で全ステージがバイト同一のままであること
- **Shipped gate** — `aidlc-plugin-test.ts . --install <一時 Claude install> --harness claude` が 0 で終了すること（validate、build、compose、グラフ再コンパイル、冪等性、drop 走査）

`fragment-template.md` は手で編集する唯一のフラグメント本文です。`tests/` は install へ compose されないので、ここに置いています。
