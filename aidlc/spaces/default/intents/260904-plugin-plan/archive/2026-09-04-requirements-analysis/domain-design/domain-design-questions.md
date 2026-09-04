# Domain Design — 質問

要求一覧（requirements.md）の FR1〜FR7 を実現する構成要素は、参照先 deep-spec-analysis を写すと次の 5 つになります: インストーラ（`scripts/install.ts`）、リリースツール（`scripts/release.ts` ＋ CI のタグ検査）、文書一式（ルート README・LICENSE・計画書の完了記録・decisions）、開発環境設定（`mise.toml`・`renovate.json`）、検証スイート（既存テスト＋インストーラ／リリースのテスト＋選択キー環境の確認）。既存の contributions（28 断片・テンプレート・sync スクリプト）は変更しません。以下は境界と責務に関する判断です。事実（参照先の行数・フラグ・テスト構成）は調べて埋めてあります。

各質問の `[Answer]:` に選択肢の文字（例: `A`）を記入してください。当てはまらない場合は `X` を選び、内容を書き添えてください。

## Q1. インストーラはどう作りますか？

参照先の `install.ts` は 732 行で、ソース取得（`--tag` / `--ref` / `--from` / latest）、tar.gz 展開（パストラバーサル・リンク拒否）、ハーネス投影の build、store 系は `dist/` から compose・storeless 系はフォルダドロップ、`aidlc plugin sync` または `hooks/compose.ts` の実行、provenance 記録、`--update`、`--dry-run` を備え、テスト 162 行で選択順序・アーカイブ安全性・ダイジェストを検証しています。プラグイン名・リポジトリ名・provenance ファイル名は定数 3 つに集約されています。

A. 参照先を写し、定数（`grilling` / `amadeus-dlc/aidlc-grilling-plugin` / `grilling-install.json`）と deep-spec 固有の後処理（stage の案内・doctor ツールの探索）だけを差し替える。ファイルは参照先と同じく `install.ts` と `release.ts` の 2 本に分ける
B. 必要最小限の独自実装にする（`--from` / `--tag` / `--dry-run` のみ、`--ref` / `--update` / latest 解決は省く）
C. 参照先と共通のライブラリに切り出して両プラグインで共有する
D. Not yet defined（まだ決めていない）
E. Not applicable（インストーラは作らない — 要求 FR4 を取り下げる）
X. Other (please specify)

[Answer]: A（一旦Aで。後々リファクタリングしよう）

## Q2. インストール完了時の案内はどうしますか？

参照先は compose 後に「stage が Inception に入った」旨と doctor の所在を表示します。grilling には stage も doctor もありません。

A. 「次の質問ステージのモード選択に Grill me が 4 択目として現れる」ことと、エンジン更新後は `/aidlc plugin sync` を再実行することを表示する
B. compose の結果（変更ファイル数・drop の有無）だけを表示し、案内文は出さない
C. A に加えて、compose 済みステージ数（28）を検証して表示する
D. Not yet defined（まだ決めていない）
E. Not applicable（案内は README に任せる）
X. Other (please specify)

[Answer]: A

## Q3. リリースツールの責務はどこまでですか？

参照先の `release.ts` は 149 行で、事前検査（安定 SemVer、`main` ブランチ、clean な worktree、ローカル／リモートにタグ未存在）→ manifest 更新 → 英語のコミット → タグ → `main` とタグの atomic push、および CI 用の `--check-tag` を持ち、テスト 153 行で git 操作を注入して検証しています。

A. 参照先と同じ（push まで自動、`--check-tag` あり）
B. タグ作成までにして push は手動にする
C. `--check-tag` だけ用意し、バージョン更新・タグは手動にする
D. Not yet defined（まだ決めていない）
E. Not applicable（リリースツールは作らない — 要求 FR5 を取り下げる）
X. Other (please specify)

[Answer]: A

## Q4. 文書はどこに置きますか？

参照先はルート `docs/`（usage・architecture、ja/en）と `deep-spec-analysis/docs/`（decisions・handoffs）を分けています。grilling はルート `docs/` に `plugin-plan.md` と `live-check-2026-09-03.md` があります。

A. 参照先と同じ配置 — ルート `docs/` は現状維持（計画書はそこで完了記録化）、`grilling/docs/decisions.md` と `decisions.ja.md` を新設
B. すべてルート `docs/` に集約する（decisions もルートに置く）
C. すべて `grilling/docs/` に移す（計画書とライブ確認記録も移動）
D. Not yet defined（まだ決めていない）
E. Not applicable（decisions は作らない）
X. Other (please specify)

[Answer]: A

## Q5. 選択キー環境の確認（FR7、記録のみ）はどう実装しますか？

A. `grilling/tests/` に opt-in のテスト（環境変数で有効化）として置き、使い捨て install の `harness.json` に `plugins` キーを入れて compose と doctor を確認し、結果を decisions に転記する
B. コードは書かず、手動で 1 回確認して decisions に結果を書く
C. 既存の compose テストに `plugins` キーありの派生ケースを常時実行で足す（記録だけでなく回帰も見る）
D. Not yet defined（まだ決めていない）
E. Not applicable（確認しない — 要求 FR7 を取り下げる）
X. Other (please specify)

[Answer]: A

## Q6. LICENSE の種別は何にしますか？

参照先は MIT License（著作権者 Junichi Kato、2026）です。

A. MIT License（参照先と同じ、著作権者も同じ）
B. Apache-2.0
C. 上流 aidlc-workflows と同じ MIT-0
D. Not yet defined（まだ決めていない）
E. Not applicable（LICENSE は置かない — 要求 FR3.4 を取り下げる）
X. Other (please specify)

[Answer]: A
