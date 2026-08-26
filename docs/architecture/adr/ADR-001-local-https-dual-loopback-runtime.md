# ADR-001: Phase 1 のローカル HTTPS とデュアル loopback 実行方式

| 項目 | 内容 |
|---|---|
| ステータス | 承認済み |
| 日付 | 2026-08-25 |
| 決定者 | プロジェクトオーナー（PO/TL） |

## コンテキスト

Phase 1 は単一 MacBook 上で稼働するローカルダッシュボードである。Charter は、
`127.0.0.1` と `::1` だけで listen し、TLS 1.2 以上でブラウザと localhost API を
提供することを MUST とする。状態データは外部送信・永続化せず、単一 OS process の
モジュラーモノリス内で扱う。

現行の `next dev --experimental-https --hostname 127.0.0.1` は IPv4 のみを単一 host に
bind し、Next.js 16.3.2 の開発実行は child process を起動する。そのため、Charter の
デュアル loopback および単一 OS process 要件を満たさない。

HTTPS 起動成功後は30秒以内に状態または状態取得失敗を表示する。証明書 preflight または
listener 起動に失敗した場合は、UIを表示せずターミナルの非0終了で扱う。状態収集開始後の
1回あたり4秒上限は既決 NFR であり、本 ADR は変更しない。

## 決定事項

Phase 1 のローカル開発実行では、Node.js custom HTTPS server を単一 OS process として
起動する。

- `next({ dev: true })` の共通 request handler を使用する。
- 同一 process 内で2つの HTTPS listener を作成する。
  - `127.0.0.1:3443`
  - `[::1]:3443`。wildcard の `::` は使わず、IPv6 listener は `ipv6Only: true` とする。
- 2 listener には共通の TLS options と `minVersion: "TLSv1.2"` を指定する。
- `next dev` CLI、別 process の Next.js、TLS reverse proxy は起動しない。
- 次の4条件を listener 起動前にすべて検査する。
  1. leaf 証明書の SAN に `localhost`、`127.0.0.1`、`::1` がすべて含まれる。
  2. 現在時刻が証明書の有効期間内である。
  3. 証明書と秘密鍵が対になっている。
  4. 発行チェーンが macOS system trust store で信頼済みである。
- 任意の preflight が検証不能または失敗した場合、listener と状態収集を開始せず非0で終了する。
- 両 listener が listen に成功した時だけ状態収集を開始する。片方の bind または起動後の
  error が失敗した場合は、起動済み listener を close し、状態収集を開始せず非0で終了する。
- ブラウザ側の最終信頼確認は、`https://127.0.0.1:3443` と `https://[::1]:3443` の両方への
  TLS 検証付き接続を行う受け入れ確認で行う。
- 複数 listener における HMR は必須にしない。HTTPS、画面、状態取得 API が両 URL で
  動作することを必須とし、HMR が使えない listener では手動リロードを許容する。

## 根拠

- Node.js native HTTPS server は、2つの明示的な loopback address を同一 process 内で
  listen できる。
- custom server は、統合ルーターが要件を満たせない場合の Next.js 公式手段である。
- wildcard address や複数 process を使わないため、外部公開・メモリ分断・重複収集を防ぐ。
- preflight と原子的起動により、片方だけで公開された状態や、未信頼・期限切れ証明書での
  状態収集開始を防ぐ。
- Phase 1 は開発実行だけが対象であり、custom server が standalone output と併用できない
  制約は直ちに影響しない。

## 代替案

### 代替案 A: Node.js custom HTTPS server + 共通 Next.js handler（採用）

- メリット:
  - デュアル loopback、TLS 1.2 以上、単一 OS process を同時に満たす。
  - 2 listener が同じ process 内にあるため、状態収集とメモリ状態を共有できる。
  - 証明書 preflight と原子的起動を実行方式へ組み込める。
- デメリット:
  - 起動・証明書検査の保守が増える。
  - 複数 listener における HMR は Next.js 公式保証外である。
  - standalone output と併用できない。

### 代替案 B: `next dev --experimental-https` を継続する

- メリット:
  - 現在の開発コマンドを維持できる。
  - Next.js 標準の開発体験を利用できる。
- デメリット:
  - 単一 host だけに bind し、`::1` 要件を満たさない。
  - child process を起動するため、単一 OS process 要件を満たさない。
- 却下理由:
  - Charter を変更しないという決定と矛盾する。

### 代替案 C: IPv4/IPv6 ごとに `next dev` を2 processで起動する

- メリット:
  - 両 loopback address を listen できる。
- デメリット:
  - 単一 OS process、単一メモリ、収集周期の coalesce を満たさない。
- 却下理由:
  - Charter の単一 process 方針と矛盾する。

### 代替案 D: TLS reverse proxy を別 processで追加する

- メリット:
  - TLS 終端と dual bind を分離できる。
- デメリット:
  - 追加 process と通信経路を持ち、運用・障害点が増える。
- 却下理由:
  - Charter の単一 process 方針と矛盾する。

## 影響・トレードオフ

- 影響を受けるコンポーネント:
  - `pnpm dev` と custom server entry point
  - 証明書生成・preflight
  - 2つの HTTPS Server と共通 Next.js request handler
  - 状態収集開始ガード
  - 両 loopback と失敗系を確認する E2E・起動検証
  - `.certs/` の非追跡方針
- 影響を受ける Phase:
  - Phase 1 のローカル開発実行だけに適用する。
- Charter との関係:
  - §5 の loopback、TLS、再起動後の表示要件および §9 の単一 process 方針を実現する。
  - Charter の内容は変更しない。
- マスタドキュメントの更新:
  - `docs/PROJECT-CHARTER.md` §9 に ADR 参照を追記する。
  - `docs/architecture/baseline.md` にこの ADR を参照し、C4 Container 図と起動制約を反映する。
- トレードオフ:
  - 開発時 HMR の一部制限を許容する代わりに、外部公開を避けつつ dual loopback と単一 OS
    process を満たす。
  - `pnpm start`、配布、クラウド、本番デプロイへの適用は対象外とする。将来追加する場合は別
    ADR で再評価する。

## 参照

- `docs/research/phase1-local-https-dual-loopback.md`
- `docs/PROJECT-CHARTER.md` §5、§9
