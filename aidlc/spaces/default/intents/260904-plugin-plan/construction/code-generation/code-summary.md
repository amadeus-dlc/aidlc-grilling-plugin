# Code Generation の要約 — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

承認済み計画（`code-generation-plan.md`、18 ステップ）を、開発者役への 3 回の順次依頼（Step 1〜7、8〜12、13〜17）で実装した。Step 18（本ファイル・`source-manifest.json`・`traceability.json`）はオーケストレーターが書いた。設計の正本は `../functional-design/functional-spec.md` と `rules.md`。

## 作成・変更したファイル

### ContributionOverlay（断片と 28 contribution）

| ファイル | 変更 | 内容 |
|---|---|---|
| `grilling/tests/fragment-template.md` | 変更 | 新方式で英語に書き直し（139 行、上限 150）。4 択目の固定文、決定の木とフロンティア、決定の大きさ 5 段階（`functional-spec.md` の英語原文をそのまま）と Depth 表、決めた前提、帳簿、描画（4 問分割・❓➡️）、事実の調査（`**Pending:**`）、終了と共有理解の確認、1 問ずつへの切り替え |
| `grilling/contributions/<phase>/<slug>.md`（28 本） | 変更 | `bun scripts/sync-contributions.ts` で再生成（手編集なし） |
| `grilling/.aidlc-plugin/plugin.json` | 変更 | `description` を新方式の 1 文に。`version` は 0.1.0 のまま（Build and Test で `release.ts` が 0.2.0 に上げる） |

### Installer / ReleaseTool

| ファイル | 変更 | 内容 |
|---|---|---|
| `grilling/scripts/install.ts` | 新規（736 行） | 参照先 deep-spec-analysis の `install.ts` を写し、定数（`amadeus-dlc/aidlc-grilling-plugin` / `grilling` / `grilling-install.json`）、Usage、完了案内（ADR-007 の 2 点）を差し替え、deep-spec 固有の後処理（doctor の探索、stage の案内、センサー検査）を削除。`REMOVED_PAYLOADS` は空（BR8.9） |
| `grilling/scripts/release.ts` | 新規（164 行） | 参照先の `release.ts` を写し、manifest のパスと Usage を差し替え。事前検査 4 種、`--allow-empty` のコミット、タグ、`push --atomic`、`--check-tag`、`GitRunner` の注入 |

### VerificationSuite

| ファイル | 変更 | 内容 |
|---|---|---|
| `grilling/tests/plugin.test.ts` | 変更 | 「the fragment template is well-formed prose」を固定トークン検査（新 description・旧 description の不在・`(Recommended)`・`**Mode:** grill`・`**Pending:**`・`Decided assumptions`・段階タグ・❓➡️・Depth 表・150 行以内）に更新。他の 22 件は無変更 |
| `grilling/tests/live-claude.test.ts` | 変更 | 画面 2 は 2〜4 問・先頭が `(Recommended)`、画面 3 は 4 問以下・先頭が `(Recommended)` の 2 テストに分割。帳簿検査は維持。冒頭コメントを新方式に |
| `grilling/tests/installer.test.ts` | 新規（10 件） | 選択子の排他、タグ順、manifest 検証、tar.gz の安全性（パストラバーサル・リンク）、ダイジェスト、`--from` の e2e（28 ステージ・`--dry-run` 無変更・2 回目 `Changed 0`・provenance 5 項目） |
| `grilling/tests/release.test.ts` | 新規（8 件） | SemVer 検査、事前検査（ブランチ・clean・タグ）、変更の順序、manifest 更新、`--check-tag` |
| `grilling/tests/select-plugins.test.ts` | 新規（opt-in、5 件） | `GRILLING_SELECT_KEY_CHECK=1` で選択キー環境（NG1）を確認 |

### DevEnvironmentConfig

| ファイル | 変更 | 内容 |
|---|---|---|
| `.github/workflows/ci.yml` | 変更 | `on.push.tags: ["v*"]` と、タグ push 時の `release.ts --check-tag "$GITHUB_REF_NAME"` ステップ（依存インストール直後） |
| `mise.toml` | 新規 | `bun = "1.3.13"`（CI と一致） |
| `renovate.json` | 新規 | `config:recommended`、bun ランタイム + `@types/bun` の同時更新、GitHub Actions の一括 PR |

### DocumentationSet

| ファイル | 変更 | 内容 |
|---|---|---|
| `README.md` / `README.ja.md` | 変更 / 新規 | ルート README。参照先と同じ 7 見出し、インストーラのフラグ表、store 経由の代替、Adopting mid-project、フォルダドロップの注意、`LICENSE` 参照、相互リンク |
| `LICENSE` | 新規 | MIT（参照先と同じ著作権者・年） |
| `grilling/docs/decisions.md` / `decisions.ja.md` | 新規 | 7 件の決定（Context / Decision / Consequences）と NG1 の実測結果 |
| `grilling/README.md` / `README.ja.md` | 変更 | How the mode works を新方式（8 項目）に、Install / Upgrade / Live check / Development / Release / Layout / Limits を更新 |
| `grilling/tests/README.md` / `README.ja.md` | 変更 | 5 テストファイルの説明。「画面 2・3 は 1 問ずつ」の旧記述を置換 |
| `docs/plugin-plan.md` | 変更 | 完了記録化: 状態と差分表、§3 を新方式に、§5 の実アンカー、§6 / §8 / §10 に 済 / N/A / 残、§9 の確定 3 事実、§11 成功指標 3 の証拠、§12 今後の課題（他 6 ハーネス 2 件 + 上流への報告 2 件） |

## 主な判断

- **`--from` はリポジトリのルート**（`grilling/` を含む checkout）。参照先の `acquireLocal` と同じ意味で、`grilling/` 自体を渡すと拒否する。README はこの前提で書いた
- **選択子の併用は失敗**（参照先からの唯一の挙動差）。参照先は `--from > --ref > --tag` の優先順で黙って解決するが、BR8.2 が「同時に 1 つまで」と定めるため
- **`--project` は存在するディレクトリを要求**（BR8.1。参照先の `existsSync` に `isDirectory()` を足した）
- **compose 後の検証は core stage 1 本の sentinel の有無**だけを見る（参照先が「センサー 1 ファイルの存在」を見るのと同じ粒度。ADR-007 が退けた 28 ステージの計数はしない）
- **grilling は payload を持たない**ため `payload_sha256` は空列のダイジェストになり、2 回目は provenance 比較だけで `Changed 0`。エンジン更新で合成が消えても `--update` は `Changed 0` で終わるので、完了案内と README で `/aidlc plugin sync` の再実行を案内する
- **README の Install は `VERSION=v0.2.0` で raw URL もタグ固定**（参照先の「ブートストラップとソースを同じ不変タグから取る」意図に合わせた。S 級の局所判断）
- **NG1 は実測して肯定的**（選択キー `["aidlc","grilling"]` で 28/28・drop 0・キー保持。`["aidlc"]` だけだと 0/28 で advisory drop が `select-plugins aidlc,grilling` を案内）。`grilling/docs/decisions` に数値つきで記録
- **ラウンドと決めた前提の見出しは会話言語**、固定トークンは段階タグ・`**Mode:** grill`・`**Pending:**`・`(Recommended)`・`[Answer]:`・`X. Other (please specify)` に限定（project.md の Corrections どおり）

## テストの要約

| コマンド | 結果 |
|---|---|
| `bunx tsc --noEmit` | pass |
| `bun scripts/sync-contributions.ts --check` | pass（28 contributions match） |
| `bun test` | 43 pass / 14 skip / 0 fail（57 tests、5 files、1276 expect、約 3〜5 秒）。作業前の基線は 25 pass / 14 skip |
| `aidlc-plugin-validate.ts .` | Errors 0 / warnings 1（既知の advisory `compose-hook-absent`。作業前と同じ） |
| `aidlc-plugin-build.ts . <harness>` × 7 | すべて exit 0 |
| `GRILLING_SELECT_KEY_CHECK=1 bun test tests/select-plugins.test.ts` | 5 pass / 1 skip |
| CI 相当の列の合計 | 約 6 秒（NFR1 の 15 分に対して十分） |

件数: ContributionOverlay 23（既存）、Installer 10、ReleaseTool 8、ライブ確認 4（opt-in、実走は Build and Test）、選択キー 5（opt-in）。

## 計画からの逸脱

- **Installer のテストは 10 件**で Standard の上限 8 を 2 件超える。必須 7 シナリオに加え、参照先の「toolchain 欠落で対象に触れない」「ダイジェストの順序」を落とさなかったため（受け入れ）
- **計画のチェックボックス更新は最後に一括**で行った。承認ガードが計画ファイルの bytes を指紋に含めるため、Step 1〜7 のチェックで承認が一度失効し、directive を出し直して人に再承認してもらった（`memory.md` の Deviations、計画書 §12 の上流への報告事項）
- **Installer の e2e は `grilling/dist/claude`（gitignore 済み）に build を書く**（参照先と同じ挙動）

## Loop-back 1（Build and Test からの戻り、2026-09-04）

- **きっかけ**: ライブ確認（sonnet）で、ラウンド方式は規則どおり動いたが、`(Recommended)` が 6 問中 5 問で label ではなく description の末尾に付き、BR10.4 / BR10.5 の検査が 2 件 fail（`docs/live-check-2026-09-04.md`、`../build-and-test/test-results.md` の Loop-Back Log 1）。人が「Retry with fix」を選択
- **変更**: `grilling/tests/fragment-template.md` の Rendering 段落の冒頭 3 行を 6 行に置き換え（139 → 142 行）。印を付ける先が option の **label**（人が最初に読む短い見出し。例 `A. Command-line argument (Recommended)`）であり、description に付けるだけでは不十分だと明文化。他の段落は無変更。28 contribution を再生成
- **検証**: `sync-contributions.ts --check` 一致、`bun test tests/plugin.test.ts` 23 pass、`bunx tsc --noEmit` pass、142 行（≤ 150）。ライブ確認の再実行は Build and Test で行う
- **変えていないもの**: テスト（`live-claude.test.ts` の label 検査）、設計ルール BR2.2、README、他のコード。`source-manifest.json` と `traceability.json` は対象ファイルが同じため更新不要

## Loop-back 2（Build and Test からの戻り、2026-09-04）

- **きっかけ**: サンドボックスで断片テンプレートを変えた後の `install.ts --from` が `Changed 0` で合成を省いた（T16）。「変更なし」判定が provenance の `payload_sha256`（PAYLOAD_MAP のファイル）だけを比べ、contributions を数えていなかった。参照先を写した際に contributions のみの plugin の性質を見落としたもの。人が「Retry with fix」を選択
- **変更**: `grilling/scripts/install.ts` に投影の `contributions/**` を集める `candidateContributionEntries()` と、ペイロードのファイル＋contributions を連結して hash する `provenanceDigest()` を追加。判定を「導入先のペイロードファイル == 候補のペイロードファイル（従来どおりペイロード同士）」かつ「provenance の `payload_sha256` == 候補のフルダイジェスト（ペイロード＋contributions）」に変更。最後に書く provenance もフルダイジェスト。`--dry-run` は不変。コメント（ヘッダ、BR8.7、BR8.10）を実態に合わせた
- **テスト**: `tests/installer.test.ts` に describe「installer against a source whose fragments change」を 1 件追加（リポジトリの `grilling/{.aidlc-plugin,contributions,scripts}` と `tests/fragment-template.md` を一時ディレクトリにコピー → `--from` で導入 `Changed 1` → コピー側のテンプレートに 1 行足して `sync-contributions.ts` で再生成 → 再実行 `Changed 1` で 28 ステージに新しい本文、provenance のダイジェストが変わる → もう 1 回は `Changed 0` で byte 同一）。既存の provenance テストに「ダイジェストが空列のものではない」を追加。Installer のテストは 11 件
- **文書**: README 4 本（ルート ja / en、プラグイン ja / en）の provenance / `--update` / Upgrade の説明を「ダイジェストは投影のペイロードと contributions を含むので、断片が変われば再実行で合成し直す。エンジンの再インストールや更新で合成が消えた場合は provenance も候補も変わらないため検出できず、`/aidlc plugin sync` を再実行する」に統一
- **検証**: `bunx tsc --noEmit` pass、`bun test` 44 pass / 14 skip / 0 fail（43 → 44）、`sync-contributions.ts --check` 一致。サンドボックスで `install.ts --from` を 2 回実行し、1 回目 `Changed 1`（provenance が `sha256:e3b0c4…` から `sha256:ef5956…` に更新、断片が新しい文に）、2 回目 `Changed 0`
- **参照先との差**: 「変更なし」判定に contributions を含める点が参照先 deep-spec-analysis と異なる（参照先は payload があるので顕在化しない）。README に明記

## 残り（Build and Test へ）

- 使い捨て install `../grilling-sandbox` を `aidlc-workflows/dist/claude` から作り直し、`install.ts --from <repo-root>` で導入 → `aidlc-plugin-test.ts --install ../grilling-sandbox` → `bun run test:live`（Claude Code を実走）→ `docs/live-check-<日付>.md` に記録（同じ画面の質問の独立性を人が読んで判断）→ 同サンドボックスで `/aidlc --doctor` の「Composed plugin surface」を確認（人の指示「最終的にサンドボックスで検証」）
- `release.ts 0.2.0` で `v0.2.0` を公開し、タグ push で CI のタグ検査が動くことを確認（BR9.6）。README が例示する `v0.2.0` はそれまで存在しない
- `aidlc/` の記録（intents / codekb / memory）とワークスペースの変更をコミットする（人の判断）
