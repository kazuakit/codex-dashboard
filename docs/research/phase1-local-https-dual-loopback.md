# リサーチ: Phase 1 のローカル HTTPS とデュアル loopback 実行方式

| 項目 | 内容 |
|---|---|
| 調査日 | 2026-08-25 |
| 調査目的 | Charter の両 loopback、TLS 1.2 以上、単一 OS プロセスを満たす ADR の選択肢を確認する。 |
| リサーチ種別 | 仕様調査 |
| 依頼元 | `/aidd-create-adr`（`/aidd-setup-architecture` から呼び出し） |

## 調査結果

### 事実

- Next.js 16.3.2 の `next dev` は `--hostname` で単一 host を受け、既定値は
  `0.0.0.0` である。開発用のカスタム証明書指定は experimental であり、development
  専用である。
- 同版の Next.js source は開発サーバーを child process として起動し、単一の
  `hostname` へ listen する。よって `next dev` は Charter の「単一 OS プロセス」および
  `127.0.0.1` と `::1` の同時 bind を満たさない。
- Next.js は、統合ルーターで要件を満たせない場合に custom server で
  `next({ dev })`、`app.prepare()`、`app.getRequestHandler()` を使う方式を公式に示す。
  custom server は standalone output と併用できないが、Phase 1 は開発実行だけが対象で
  ある。
- Node.js 26.7.0 は `https.createServer()` と `server.listen({ host, port,
  ipv6Only })` を提供する。`host: "127.0.0.1"` と `host: "::1"` の2つの HTTPS
  listener は、同じ Node.js process と request handler に接続できる。`::` は IPv4にも
  listen し得るため使わない。
- Node.js は TLS options の `minVersion: "TLSv1.2"` をサポートする。
- mkcert は `localhost 127.0.0.1 ::1` を SAN に含む証明書を発行でき、`mkcert -install`
  は macOS の system root store へローカル CA を登録する。CA private key は共有・
  コミットしてはならない。
- Next.js の custom server における複数 listener の HMR は公式に保証されていない。
  実装時は `https://127.0.0.1:3443` と `https://[::1]:3443` の双方を実機で検証する。

### 比較表

| 選択肢 | 両 loopback | 単一 OS プロセス | Charter との整合 | 判定 |
|---|---|---|---|---|
| `next dev --experimental-https` を継続 | 不可（単一 host） | 不可（開発 child process） | 不整合 | 棄却 |
| Node.js custom HTTPS server + Next request handler | 可 | 可 | 整合 | ADR の推奨候補 |
| `next dev` を2プロセス起動 | 可 | 不可 | 不整合 | 棄却 |
| TLS reverse proxyを別プロセスで追加 | 可 | 不可 | 不整合 | 棄却 |

### 推薦

Phase 1 は Node.js custom HTTPS server を1 processとして起動し、同一 Next.js request
handler を `127.0.0.1:3443` と `[::1]:3443` の2 listener に接続する。2 listenerには
共通の TLS options と `minVersion: "TLSv1.2"` を指定する。証明書の SAN・期限・
macOS trust store を起動前に検査し、失敗時は listener と状態収集を開始せず非0で終了する。

### リスク・注意点

- Next.js custom server の複数 listener HMR は公式保証外である。両 URL の開発時動作を
  受け入れ条件に含め、HMR に支障がある場合の許容範囲を ADR で明示する。
- 証明書がブラウザで信頼されるかはサーバーだけでは完全に観測できない。実行前検査は
  macOS trust store、証明書期限、SAN と、両 URL への TLS 検証付き接続で確認する。
- custom server は Next.js compiler/bundle の対象外である。Phase 1 は配布・本番実行の
  対象外だが、将来追加する場合は別の ADR で評価する。

## ソース

- [Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next) — 参照日: 2026-08-25
- [Next.js custom server](https://nextjs.org/docs/app/guides/custom-server) — 参照日: 2026-08-25
- [Next.js 16.3.2 next-dev source](https://github.com/vercel/next.js/blob/v16.3.2/packages/next/src/cli/next-dev.ts) — 参照日: 2026-08-25
- [Next.js 16.3.2 server startup source](https://github.com/vercel/next.js/blob/v16.3.2/packages/next/src/server/lib/start-server.ts) — 参照日: 2026-08-25
- [Node.js net API v26.7.0](https://nodejs.org/docs/v26.7.0/api/net.html) — 参照日: 2026-08-25
- [Node.js HTTPS API v26.7.0](https://nodejs.org/docs/v26.7.0/api/https.html) — 参照日: 2026-08-25
- [Node.js TLS API v26.7.0](https://nodejs.org/docs/v26.7.0/api/tls.html#tlsdefault_min_version) — 参照日: 2026-08-25
- [mkcert](https://github.com/FiloSottile/mkcert) — 参照日: 2026-08-25
