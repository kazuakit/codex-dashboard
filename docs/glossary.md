# 用語集

> プロジェクト固有のドメイン用語・技術用語の単一 SSOT。/aidd-glossary スキルが自律的にメンテナンスする。
> 直接編集も可能だが、/aidd-glossary 実行時に整合性チェックが入る。
>
> フレームワーク用語（Phase / Epic / Story / Feature / AC / Task / ゲート名 等）は
> `aidd-framework/FRAMEWORK.md` の「階層構造とゲート」を参照すること。glossary には転記しない。

| 用語 | 定義 | 出典・関連箇所 |
|------|------|------------|
| Codexセッション | MacBook上で実行される、個別のCodex CLI作業単位。 | `docs/PROJECT-CHARTER.md` §1、§2、§4、§9 |
| セッション状態 | Codexセッションを稼働中・入力待ち・終了済み・未知・取得失敗として表す状態。 | `docs/PROJECT-CHARTER.md` §2、§4、§5、§8 |
| 状態取得 | Codex CLIのローカルログおよびプロセス情報を読み取り、セッション状態を判定する処理。 | `docs/PROJECT-CHARTER.md` §6、§7、§9 |
| ローカルダッシュボード | 単一MacBookのlocalhost上で動作し、Codexセッション状態を一覧表示するWebアプリ。 | `docs/PROJECT-CHARTER.md` §1、§4、§9 |
