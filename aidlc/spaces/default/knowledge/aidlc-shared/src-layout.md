# `src/` の構成の型（deep-spec-analysis の実装から）

姉妹プラグイン [aidlc-deep-spec-analysis-plugin](https://github.com/amadeus-dlc/aidlc-deep-spec-analysis-plugin) の `deep-spec-analysis/src/`（2026-09-03 時点）を読んで整理した、`grilling/src/` を DDD のマルチパッケージ構成で組むときの型。規則の正本は同リポジトリの `tests/architecture/rules.ts` と `docs/decisions.ja.md`（「DDD 移行 PR0〜PR9」「src/・tools 配布分離の裁定」）。モデリングの型そのものは [domain-modeling.md](domain-modeling.md)。

## 1. 物理構成: コンテキスト × 層 = 1 パッケージ

- `src/<context>/<layer>/` が bun workspace の 1 メンバー。deep-spec は 6 コンテキスト（kernel / requirements / design / refinement / refcheck / doctor）× 層（infrastructure / domain / usecase / adapter。全部の層を持つのは kernel だけ）で 17 層。
- 各 `package.json` は `name: @<scope>/<context>-<layer>`、`private: true`、`type: module`、`exports: { ".": "./index.ts" }` だけ。深い import は解決できない。
- `dependencies` には実際に import している層だけを `workspace:*` で宣言する。root `package.json` の `workspaces: ["src/*/*", "src/entries", "tests"]` と `bunfig.toml` の `[install] linker = "isolated"` により、未宣言の層は実行時にも `tsc` でも解決できない——依存方向を構造で強制する。
- `tests/` も workspace メンバー（`@<scope>/tests`）にする。root の `dependencies` に層を置くと、未宣言の層からの import が root の `node_modules` へ上位探索で解決してしまい、境界検出が丸ごと無効になる（deep-spec の実測）。
- `src/entries/` は合成ルート（deep-spec ではセンサー 9 本 + doctor 1 本）。`@<scope>/entries` として自分が結線する層だけを依存宣言し、契約スキーマ JSON は `entries/data/` に置く（entry から見た `data/` の相対位置を出荷物と揃えるため）。
- 各層の `index.ts` は facade で、**明示列挙のみ（`export *` 禁止）**。型は `export { type X }` で列挙する。

## 2. 依存方向

- 層内: `infrastructure ← domain ← usecase ← adapter`（`ALLOWED_LAYER_TARGETS`）。adapter は全層を、usecase は domain と infrastructure を、domain は infrastructure だけを、infrastructure は自分だけを見る。
- コンテキスト間: 同一コンテキスト内と kernel への依存は常に可。それ以外は `SANCTIONED_CROSS_CONTEXT` に列挙した辺だけ（deep-spec は 4 辺）。**表に辺を足すのは裁定であって便宜ではない**。
- 層またぎ・コンテキストまたぎの import はすべて bare specifier（`@<scope>/<ctx>-<layer>`）。相対 import は同一パッケージ内だけで、`../` でパッケージ境界を越える相対 import は違反（`no-cross-package-relative-imports`）。

## 3. 各層に置くもの

| 層 | 住人 | deep-spec の例 |
|---|---|---|
| kernel/infrastructure | `Result<T, E>`・`ok`・`err`・`unreachable`（閉じた変種の網羅性の証人。domain 層で唯一許される throw） | `result.ts` |
| kernel/usecase | 共有ポート語彙。`RepositoryError` は not-found / io-failed / corrupt の 3 変種に閉じ、材料だけを運ぶ（文言は emitter の責務）。`Clock` ポート | `port/repository-error.ts` |
| kernel/domain | 全コンテキストが話す語彙のドメインプリミティブ（`ArtifactPath`・`ContentHash`・`TargetId`・`FindingKind`・`UnitName` …）と、string キーの Map / Set を包む表現プリミティブ `KeyedIndex` / `KeySet`（string キーの索引を持つのはこの 2 ファイルだけ） | 26 ファイル |
| kernel/adapter | 共有 I/O ヘルパ（`parseFlags`・`writeFileAtomically` …） | |
| `<ctx>/domain` | エンティティ・値オブジェクト・ファーストクラスコレクション・ドメインイベントとドメインエラー（`Result` で返す）。フィールドは `#`、コンストラクタは private、門は `of`（検証つき）と `reconstitute`（逐語）の 2 つ。getter は I/O 境界が読むものだけ | [domain-modeling.md](domain-modeling.md) |
| `<ctx>/usecase` | ユースケース class（`execute(input): Outcome`）。`port/` にリポジトリ・クライアントの interface。結果は閉じたユニオン（例: `{ kind: "not-applicable" } \| { kind: "verdict"; pass; errors }`）。usecase と entry は published language を直接扱わない | `ValidateIrUseCase` |
| `<ctx>/adapter` | ポートの Impl（fs・子プロセス・パーサ・シリアライザ）。JSON / YAML / markdown といった形式の知識はここにだけ置く | `RequirementsSourceRepositoryImpl` |
| entries | フラグ解釈・スキーマパスの解決・Impl の結線・verdict 行の描画だけ。検査ロジックは持たず、フレームワークの `aidlc-lib` にも依存しない（プラグインのツールは自分の delta だけで動く） | `aidlc-sensor-deep-spec-ir-valid.ts` |

## 4. 出荷: `tools/` は生成物、`src/` が唯一の編集対象

- `scripts/build-tools.ts` が `src/entries/*.ts` を entry ごとに 1 本ずつ `bun build --target=bun --sourcemap=none`（minify なし・code splitting なし）で束ね、`tools/<entry>.ts` と `tools/data/` を生成する。中身は bundle 済み JavaScript だが、上流のセンサーディスパッチャが manifest の `command` から「`.ts` で終わるトークン」を探すため、出荷物のファイル名は `.ts` のまま。
- `--check` が drift guard（CI で実行）。同一ソース・同一 bun 版なら生成物は byte 同一で、絶対パスや時刻を埋め込まない。
- `sensors/<id>.md` の `command: bun {{HARNESS_DIR}}/tools/<entry>.ts`。`tools/` はフラットに置き、`tools/data/` と同階層にする（entry が `import.meta.url` 相対で `data/` と兄弟 entry を解決するため）。

## 5. アーキテクチャゲート（`tests/architecture/rules.ts`、19 規則）

- 依存方向: `layer-direction`・`only-sanctioned-imports`・`no-cross-package-relative-imports`
- ドメインの形: `no-data-models-in-domain`（プロパティを持つ公開 interface / object 型はすべてデータモデル。メソッドが添えてあっても免除しない）・`domain-fields-are-private`（`#` 以外のフィールド）・`published-language-layers`（免除表 `PUBLISHED_LANGUAGE` の名前を許可層の外で使わない。免除は表の項目だけで、表に足すのは裁定）
- 境界: `process-only-in-entries`（`process.*` / `import.meta` は entry だけ）、`export *` 禁止、get アクセサ・TS enum・非 null assertion の禁止、`no-test-payloads`（`src/` と `tools/` にテストや fixture を置かない）
- 各規則は inline の red example で検出力を証明してから実ツリーを走査する
- カバレッジ床は `bunfig.toml` の 0.9（行・関数とも、domain 層のみ。adapter / usecase は契約テストで検証し、per-file 閾値の対象にしない）

## 6. grilling への当てはめ（仮説）

grilling は現時点では contributions のみで実行コードを持たない。`src/` を作るなら候補は (a) contribution 生成器（テンプレート → 28 本。今は `scripts/sync-contributions.ts`）、(b) Grill me の帳簿を検査するセンサー（質問ファイルの `[Answer]:` と `**Mode:** grill`、派生質問の先行追記）、(c) compose 済みフラグメントの doctor 検査（エンジン更新後の欠落検出）、(d) ライブ確認ハーネス。何を置くかは intent の requirements-analysis で決める。scope 名は `@grilling/<ctx>-<layer>` が自然。
