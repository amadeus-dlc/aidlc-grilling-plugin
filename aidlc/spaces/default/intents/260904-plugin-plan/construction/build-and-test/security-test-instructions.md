# セキュリティテスト手順 — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

セキュリティエンジニアの視点で、この作業が触るセキュリティ境界と、その検証を挙げる。入力: `../code-generation/code-summary.md`（インストーラの実装判断）、`../code-generation/code-generation-plan.md`、構成決定 ADR-001 の Security implications、要求 NFR6。

## 攻撃面

| 境界 | 何が入ってくるか | 何を守るか |
|---|---|---|
| インストーラのソース取得（`--tag` / `--ref` / latest） | GitHub の公開ソースアーカイブ（tar.gz） | 展開先の外へ書かない。リンク経由で既存ファイルを上書きしない |
| インストーラの書き込み（`--project`） | 使い捨て install や利用者のプロジェクト | `--project` の外へ書かない。symlink を追わない |
| インストーラの引数 | コマンドライン | 不正な組み合わせ（選択子の併用、`--update` + 選択子、存在しないディレクトリ）を拒否 |
| 認証情報 | 扱わない | GitHub の公開 API だけを使う。トークンや鍵をコードに置かない |
| フォルダドロップ経路（Kiro / Kiro IDE / Cursor） | 利用者が指した投影 | store の信頼ゲートが無いので、README で「実行してよいビルドにだけ向ける」と注意（ADR-001） |
| リリース（`release.ts`） | git push | `main`・clean・タグ未存在の事前検査。CI が `--check-tag` でタグと manifest の一致を検査 |
| 依存 | devDependencies 3 つ（`@types/bun`、`typescript`、`@anthropic-ai/claude-agent-sdk`） | 実行時依存ゼロ（NFR4）。Renovate が更新 PR を出す |

## 検証

| 検査 | コマンド | 期待 |
|---|---|---|
| tar.gz のパストラバーサルとリンクの拒否（NFR6） | `cd grilling && bun test tests/installer.test.ts` | 該当テストが pass（`..` を含むパス、symlink / hardlink エントリで失敗する） |
| `--project` の外へ書かない | 同上（e2e は mkdtemp の中だけを変更） | `--dry-run` で全ファイルの sha256 が不変 |
| 引数の検証 | 同上 | 選択子の併用、`--update` + 選択子、manifest 名の不一致が拒否される |
| 認証情報のハードコード | `grep -rn -E "(api[_-]?key|secret|token|password)" grilling/scripts/` | 該当なし（User-Agent 文字列などの無害な一致を除く） |
| 実行時依存ゼロ（NFR4） | `grilling/package.json` の `dependencies` が無いこと、`install.ts` / `release.ts` の import が `node:*` のみ | `grep -n "^import" grilling/scripts/install.ts grilling/scripts/release.ts` |
| リリースの事前検査 | `cd grilling && bun test tests/release.test.ts` | ブランチ・clean・タグの検査が pass |
| CI のタグ検査 | `.github/workflows/ci.yml` に `startsWith(github.ref, 'refs/tags/')` 条件の `--check-tag` ステップ | 存在する |

## SAST / 依存スキャン

- 参照先 deep-spec-analysis も専用の SAST は導入していない（品質の上限は参照先との同等、C5）。`bunx tsc --noEmit` と bun のテストが静的検査に当たる
- 依存の脆弱性は Renovate の更新 PR（`renovate.json`、月曜 9 時前）と GitHub の Dependabot アラート（リポジトリ設定）で拾う。この作業で新しい規則は足さない

## 合否

- 上表の検査がすべて期待どおり
- `code-summary.md` の「参照先からの差分」がセキュリティ境界を弱めていない（選択子の併用を失敗にした変更は、黙って解決する参照先より厳しい方向）
