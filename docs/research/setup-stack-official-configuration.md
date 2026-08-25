# リサーチ: 技術環境セットアップの公式設定

| 項目 | 内容 |
|------|------|
| 調査日 | 2026-08-24 |
| 調査目的 | codex-dashboard の TypeScript / Next.js ローカルHTTPS環境、品質ツール、CIを公式仕様に基づいて構成する。 |
| リサーチ種別 | 技術選定・仕様調査 |
| 依頼元 | `/aidd-setup-stack` |

## 調査結果

### 事実

- mise はプロジェクトの `mise.toml` の `[tools]` でツールとバージョンを固定できる。共有するバージョンは `mise.toml`、個人専用の設定は `mise.local.toml` に置く。
- pnpm は `package.json` の `packageManager` で固定する。pnpm 12はRCのため、安定版のpnpm 11系を使う。
- Biome のCI検査は非破壊の `biome check .` を用いる。Vitest のCI実行は監視なしの `vitest run` である。
- PlaywrightのCIではブラウザの依存関係を導入した上でテストし、失敗時もレポートをartifactとして保存する。
- lefthook は設定作成後に `lefthook install`、検証に `lefthook validate` を使う。
- mkcert のローカルCA秘密鍵は強い権限を持つため、共有・コミットしてはならない。localhost・127.0.0.1・::1をSANに含めた証明書を明示的に作成できる。
- Next.jsの `next dev --experimental-https` は開発専用であり、production用途のTLS終端には使えない。`next dev` の既定hostは `0.0.0.0` のため、localhost限定には明示的なhostname指定が必要である。
- GitHub Actionsでは、lockfile固定インストール、Node/pnpmセットアップ、lint・型検査・unit testを順に実行する。Playwrightを有効化する場合はブラウザ導入とレポート保存を追加する。

### バージョン固定値

`mise latest` により、次の値を確認した。

| ツール | 固定値 |
|---|---|
| Node.js | 26.7.0 |
| pnpm | 11.22.0 |
| lefthook | 2.1.11 |
| actionlint | 1.7.12 |
| markdownlint-cli2 | 0.23.2 |
| Taplo | 0.10.0 |

### 推薦

- `mise.toml` と `package.json` の双方でNode.jsとpnpmを固定する。
- `biome check .`、`tsc --noEmit`、`vitest run`をローカルフックおよびCIの基準とする。
- `mkcert`の証明書・秘密鍵は `.certs/` に置き、Git管理から除外する。
- Phase 1の実行方式が開発用 `next dev` だけでない場合は、ローカルHTTPSのTLS終端方式をADRで先に決定する。

### リスク・注意点

- Next.jsの開発用HTTPS機能を、配布・本番相当の実行方式に流用してはならない。
- UIKitのパッケージ名はプロジェクト内の記述が `@spikestudio-jp/uikit` と `@spikestudio/uikit` に分かれており、公式の導入元を確定するまで依存追加しない。
- `mkcert`のローカルCA秘密鍵、証明書、`.env`はGitへ含めない。

## ソース

- [mise Configuration](https://mise.jdx.dev/configuration.html) — 参照日: 2026-08-24
- [pnpm Continuous Integration](https://pnpm.io/continuous-integration) — 参照日: 2026-08-24
- [pnpm Installation](https://pnpm.io/installation) — 参照日: 2026-08-24
- [Biome Getting Started](https://biomejs.dev/guides/getting-started/) — 参照日: 2026-08-24
- [Vitest Guide](https://vitest.dev/guide/) — 参照日: 2026-08-24
- [Playwright CI](https://playwright.dev/docs/ci) — 参照日: 2026-08-24
- [lefthook Usage](https://lefthook.dev/usage/index.html) — 参照日: 2026-08-24
- [mkcert README](https://github.com/FiloSottile/mkcert) — 参照日: 2026-08-24
- [Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next) — 参照日: 2026-08-24
- [actions/setup-node](https://github.com/actions/setup-node) — 参照日: 2026-08-24
- [actionlint README](https://github.com/rhysd/actionlint) — 参照日: 2026-08-24
- [markdownlint-cli2 README](https://github.com/DavidAnson/markdownlint-cli2) — 参照日: 2026-08-24
- [Taplo npm installation](https://taplo.tamasfe.dev/cli/installation/npm.html) — 参照日: 2026-08-24
