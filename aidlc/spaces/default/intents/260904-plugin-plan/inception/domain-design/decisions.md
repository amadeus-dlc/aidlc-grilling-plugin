# 設計決定の記録（ADR） — Grill me プラグイン計画の完了と取り込み元スキル現行版の取り込み

各 ADR は Context / Decision / Consequences / Alternatives Rejected を持つ。出典は `domain-design-questions.md` の Q 番号と、要求一覧（`../requirements-analysis/requirements.md`）の ID。

## ADR-001: インストーラは参照先 deep-spec-analysis の install.ts を写す

- **Context** — FR4 は 1 コマンド導入（タグ / ブランチ / ローカルのソース選択、投影 build、compose、provenance、--update、--dry-run）を求める。参照先は同じ要件を 732 行の単一スクリプトと 162 行のテストで満たしており、品質の上限は参照先との同等（C5）と決まっている。プラグイン名・リポジトリ名・provenance ファイル名は定数 3 つに集約されている。
- **Decision** — 参照先の `scripts/install.ts` を写し、定数（`grilling` / `amadeus-dlc/aidlc-grilling-plugin` / `grilling-install.json`）と deep-spec 固有の後処理（stage の案内・doctor ツールの探索）だけを差し替える。ファイルは参照先と同じく `install.ts` と `release.ts` の 2 本に分ける。人は「一旦Aで。後々リファクタリングしよう」と付言した（Q1）。
- **Consequences** — 正: 参照先で検証済みの挙動（アーカイブ安全性、選択順序、冪等性）をそのまま得られ、「同等」の判定が容易。負: 2 リポジトリに同型のコードが並び、参照先の修正を追従する必要がある。中立: リファクタリングは後日の別作業。
- **Security implications** — Installer はリモートのソースアーカイブを取得・展開し、対象プロジェクトへ書き込むため、セキュリティ境界に触れる決定である。参照先が持つ 3 つの防御をそのまま引き継ぐ: (1) tar.gz 展開でパストラバーサルとリンク（symlink / hardlink）を拒否し、展開先の外へ書かない、(2) `--project` の外へは一切書き込まず、symlink を追わない、(3) 認証情報を扱わず、GitHub の公開アーカイブ API だけを使う（provenance にはダイジェストと選択子のみ記録）。これらは要求 NFR6（安全性）と NFR5（再現性）の実装であり、`installer.test.ts` の「rejects path traversal and archive links」に相当するテストで検証する（FR4.4）。フォルダドロップ経路には store のような信頼ゲートがないため、README で「実行してよいビルドにだけ向ける」と明記する（FR3.2）。
- **Alternatives Rejected** — (a) 必要最小限の独自実装（--from / --tag / --dry-run のみ）: 短いが、参照先との差が「同等」の判定を難しくし、README の表も変わる。(b) 参照先と共通のライブラリに切り出す: 2 リポジトリを跨ぐ配布経路が要り、今回の範囲（C5）を超える。(c) Installer と ReleaseTool を 1 本に統合: 参照先と構成が変わる。

## ADR-002: リリースツールは push まで自動化し、CI でタグを検査する

- **Context** — FR5 は `release.ts <version>` と CI の `--check-tag` を求める。参照先は事前検査（安定 SemVer、`main`、clean、タグ未存在）→ manifest 更新 → 英語コミット → タグ → atomic push を 149 行で実装し、git 操作を注入してテストしている。
- **Decision** — 参照先と同じ範囲（push まで自動、`--check-tag` あり）を写す（Q3）。CI はタグ push 時に `--check-tag $GITHUB_REF_NAME` を実行する（DevEnvironmentConfig が呼ぶ）。
- **Consequences** — 正: リリース手順が 1 コマンドになり、タグと manifest の不一致を CI が止める。負: push を自動化するため、事前検査が甘いと誤ったタグが公開される（参照先の 4 つの事前検査をそのまま持つことで緩和）。
- **Alternatives Rejected** — (a) タグ作成までで push は手動: 手順が増え、参照先と挙動が変わる。(b) `--check-tag` だけ用意: バージョン更新とタグを手で打つ運用になり、ミスの余地が残る。

## ADR-003: 文書はルート docs/ と grilling/docs/ に分ける

- **Context** — FR3（ルート README・LICENSE）、FR2（計画書の完了記録）、FR6.1（decisions）。参照先はルート `docs/`（usage・architecture）とプラグイン配下 `docs/`（decisions・handoffs）を分けている。grilling はルート `docs/` に `plugin-plan.md` と `live-check-2026-09-03.md` を持つ。
- **Decision** — 参照先と同じ配置にする（Q4）。ルート `docs/` は現状維持し、計画書はそこで完了記録化する。`grilling/docs/decisions.md` と `decisions.ja.md` を新設する。新方式のライブ確認記録はルート `docs/` に日付付きで置く（FR1.2）。
- **Consequences** — 正: 参照先と同じ場所に同じ種類の文書があり、利用者が迷わない。負: 計画書（ルート）と decisions（プラグイン配下）が別の場所にあるため、相互リンクを保つ必要がある。
- **Alternatives Rejected** — (a) すべてルート `docs/` に集約: 参照先と配置が変わる。(b) すべて `grilling/docs/` へ移す: 既存の計画書・ライブ確認記録の移動が要り、リンク切れの手当が増える。

## ADR-004: FR8 の定義は断片テンプレートの中に置き、contributions のみを維持する

- **Context** — FR8 で断片に入る内容が増える（決定の木とフロンティア、書式と画面分割、事実の調査、終了と共有理解の確認、帳簿、1 問ずつへの切り替え、決定の大きさ 5 段階と Depth の対応、決めた前提の書き方）。プラグインは contributions のみ（C1）で、`knowledge/` などは持たない。28 断片は単一テンプレートの描画で、`sync-contributions.ts --check` が一致を保証する。
- **Decision** — 定義はすべてテンプレート（`tests/fragment-template.md`）の中に書く。プラグインは contributions のみのまま、28 断片は同一テンプレートを保つ（Q7）。
- **Consequences** — 正: 配布物が 1 種類のまま、compose の drop リスクや manifest の変更がない。各ステージの断片が自己完結し、他ファイルの読み込みに依存しない。負: 断片が長くなり、28 ステージすべてに同じ長文が入る（Standard 深度の質問生成に対するプロンプト予算への影響は挙動設計で測る）。
- **Alternatives Rejected** — (a) `knowledge/` を足して定義を 1 ファイルに置く: manifest に `knowledge` を追加し C1 を緩める必要があり、compose の対象と doctor の扱いも変わる。(b) `aidlc/spaces/<space>/memory/project.md` に置く: 配布物に含まれず、利用者の環境ごとに手で写す必要がある。

## ADR-005: 選択キー環境の確認は opt-in テストとして置く

- **Context** — NG1（記録のみ）は、`harness.json` に `plugins` 選択キーがある環境で contributions のみのプラグインが有効化・検出されるかを確認し、結果を decisions に残すことを求める。受け入れ基準にはしない（Q5、要求整理の判断）。注: `domain-design-questions.md` の Q5 は要求の下書き時点の番号 `FR7` で書かれている。確認済み回答の記録は書き換えないため表記はそのままだが、確定稿の要求では `NG1`（Non-gating）に改番されており、本 ADR と `traceability.json` は `NG1` で扱う。
- **Decision** — `grilling/tests/` に環境変数で有効化する opt-in テストとして置き、使い捨て install の `harness.json` に `plugins` キーを入れて compose と doctor を確認し、結果を decisions に転記する（Q5）。
- **Consequences** — 正: 手順がコードとして残り、エンジン更新後に再実行できる。CI の所要時間には影響しない（opt-in）。負: 常時実行ではないため回帰は検出しない。
- **Alternatives Rejected** — (a) 手動で 1 回確認して decisions に書くだけ: 再現手順が残らない。(b) 既存 compose テストに常時実行の派生ケースを足す: 記録のみという要求の位置づけ（NG1）と合わず、CI 時間も伸びる。

## ADR-006: LICENSE は MIT

- **Context** — FR3.4 は LICENSE の設置を求め、A1 は参照先と揃えるとしていた。参照先は MIT License（著作権者 Junichi Kato、2026）。
- **Decision** — MIT License、著作権者も参照先と同じにする（Q6）。A1 は確定。
- **Consequences** — 正: 参照先と同じ条件で配布でき、利用者の判断が揃う。負: なし。
- **Alternatives Rejected** — (a) Apache-2.0: 特許条項が加わるが、参照先と異なる。(b) 上流 aidlc-workflows と同じ MIT-0: 帰属表示が不要になるが、参照先と異なる。

## ADR-007: インストール完了時に Grill me の現れ方と再合成の案内を表示する

- **Context** — 参照先の完了案内は deep-spec 固有（stage が Inception に入った旨、doctor の所在）。grilling には stage も doctor もなく、利用者が「入ったのか」を確かめる手がかりは次の質問ステージのモード選択だけ。エンジン更新で合成が消える（C4）。
- **Decision** — compose 後に「次の質問ステージのモード選択に Grill me が 4 択目として現れる」ことと「エンジン更新後は `/aidlc plugin sync` を再実行する」ことを表示する（Q2）。
- **Consequences** — 正: 利用者が導入直後に確認方法と再合成の手順を知る。負: なし。
- **Alternatives Rejected** — (a) compose の結果（変更ファイル数・drop の有無）だけ表示: 確認方法が分からない。(b) 合成済みステージ数（28）を検証して表示: 検証ロジックが増え、参照先の範囲を超える。

## ADR-008: 文書と設定を catalogue のコンポーネントとして載せる

- **Context** — 構成決定の catalogue は「書くコード」を対象とするが、この intent の成果物の多くは文書（README・LICENSE・完了記録・decisions・ライブ確認記録）と設定（mise・renovate・CI）である。FR2・FR3・FR6 の追跡先（traceability.json の target）が要る。
- **Decision** — `DocumentationSet` と `DevEnvironmentConfig` を論理的な構成要素として載せる。呼び出し関係は実コード（Installer / ReleaseTool / VerificationSuite）と、CI が ReleaseTool を呼ぶ 1 本に限り、DocumentationSet は `depends_on` を空にして Rationale で対象を説明する。
- **Consequences** — 正: FR1〜FR8 の全項目に追跡先が付く。負: catalogue に「呼び出されない」ノードが 1 つ入る。制約: `DocumentationSet` と `DevEnvironmentConfig` は「書くコード」ではないため、挙動設計（Functional Design）では `CompletionRecord` / `DecisionRecord` / `LiveCheckRecord` にビジネスルールやライフサイクル（状態機械）を定義しない。これらは「どの文書にどの項目を書くか」の記述対象であり、ドメインエンティティとしては扱わない。
- **Alternatives Rejected** — (a) 文書と設定を catalogue に載せない: FR2・FR3・FR6 の追跡先が無く、traceability の検査が GAP になる。(b) VerificationSuite に折り込む: 文書の変更理由（利用者向け説明）と検査の変更理由が混ざる。
