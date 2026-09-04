# Code Generation — 質問

Construction では新しい質問は例外扱いです。挙動設計（Functional Design）までで決定は出そろっているため、このステージで人に聞くのは計画の承認だけです。

## Plan Approval

`code-generation-plan.md`（18 ステップ。埋め込みの Testing Contract は test-after / Standard / plugin-dev、`contract_sha256: sha256:8d7f1a7f51e8e641623b1e21dc4fed305238daeae0eb70f0d7e8c9b1a833a386`）と `unit-test-instructions.md`（単位ごとのコマンド、目標、モックの方針）を、この内容で承認しますか？

要点:

- 断片テンプレートを新方式（ラウンド・推奨回答・決めた前提・Depth 対応・事実の調査・1 問ずつへの切り替え）で英語に書き直し、28 contribution を再生成する（Step 3〜4）。テストを固定トークン検査と「画面 2 は 2〜4 問」に更新する（Step 5〜6）
- インストーラとリリースツールは参照先 deep-spec-analysis を写し、定数と後処理だけ差し替える（Step 8、10）。それぞれ 5〜8 件のテストを新設する（Step 9、11）
- CI にタグ検査、ルートに mise.toml / renovate.json / LICENSE、ルート README（ja / en）、decisions（ja / en）、プラグイン README の更新、計画書の完了記録（Step 12〜16）
- ライブ確認の実走、NG1 の確認結果の転記、0.2.0 の公開は次の Build and Test で行う

再承認（2 回目）: Step 1〜7 の完了で計画ファイルのチェックボックスが変わり、承認の指紋が失効したため取り直す。計画の内容そのものは変えていない。以後の依頼では計画ファイルを最後まで触らない。

[Approval Fingerprint]: sha256:f0e55dc2e67166a1ebed953629f75bc82a670662a0288c928cd3c8b9ce6e3a01

再承認（3 回目、Loop-back 1）: Build and Test のライブ確認で `(Recommended)` の置き場所が label ではなく description だったため、人が「Retry with fix」を選んで code-generation に戻った。計画に Step 19（断片の描画規則を label と明示する修正）を足した。他のステップは完了済みのまま。

再承認（4 回目、Loop-back 2）: サンドボックス検証で、断片を変えた後の `install.ts --from` が `Changed 0` で合成を省く欠陥が見つかり、人が「Retry with fix」を選んで code-generation に戻った。計画に Step 20（provenance のダイジェストに contributions を含める修正＋テスト＋README）を足した。他のステップは完了済みのまま。

- Approve Plan
- Request Changes

[Answer]: Approve Plan
