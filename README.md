# codex-dashboard

[![CI](https://github.com/kazuakit/codex-dashboard/actions/workflows/ci.yml/badge.svg)](https://github.com/kazuakit/codex-dashboard/actions/workflows/ci.yml)

MacBook 上で並行稼働する Codex セッションの状態を、1つのローカル画面で把握するダッシュボードです。

## 概要

Phase 1 では、同一 MacBook 上の Codex セッションを最大10件まで対象に、実行中・入力待ち・完了・取得不能の状態を5秒ごとに表示します。

状態データ、ログ本文、作業内容を外部送信・永続化しません。リモート監視や複数 Mac の統合は対象外です。

## 技術スタック

- Node.js 26.7.0 / pnpm 11.22.0 / mise
- TypeScript 7、Next.js App Router 16、React 19
- Zod、Vitest、Playwright、Biome
- GitHub Actions による CI
- `mkcert` による localhost HTTPS 証明書

## セットアップ

macOS、[mise](https://mise.jdx.dev/)、`mkcert` をあらかじめインストールしてください。

```sh
git clone https://github.com/kazuakit/codex-dashboard.git
cd codex-dashboard
mise install
mise exec -- pnpm install --frozen-lockfile
```

ローカル HTTPS 用の証明書を作成します。証明書と秘密鍵はコミット・共有しません。

```sh
mkcert -install
mkdir -p .certs
mise exec -- pnpm cert:local
```

`.env.example` には Phase 1 で必要なアプリケーション環境変数がありません。必要になった場合だけ、次のコマンドで作成してください。

```sh
cp .env.example .env
```

## 開発

```sh
mise exec -- pnpm dev
```

現行の開発サーバーは `https://127.0.0.1:3443` で起動します。

> [!IMPORTANT]
> 現在の `pnpm dev` は `next dev` を用いる基盤確認用の実装です。ADR-001 で決定した、単一 OS process・`127.0.0.1` と `::1` のデュアル loopback listener・証明書 preflight を備えた custom HTTPS server は、今後の Feature 実装で導入します。したがって現時点では `https://[::1]:3443` を含む Phase 1 のランタイム受け入れ条件を満たしません。

## 品質確認

```sh
mise exec -- pnpm verify
```

個別には `pnpm lint`、`pnpm typecheck`、`pnpm test:unit`、`pnpm build` を実行できます。CI でも同じ品質確認を実行します。

## ドキュメント

- [プロジェクト憲章](docs/PROJECT-CHARTER.md)
- [アーキテクチャ基盤](docs/architecture/baseline.md)
- [ADR-001: ローカル HTTPS とデュアル loopback 実行方式](docs/architecture/adr/ADR-001-local-https-dual-loopback-runtime.md)
- [シークレット管理方針](docs/playbook/secrets.md)
- [Continuous delivery](docs/playbook/cd.md)
