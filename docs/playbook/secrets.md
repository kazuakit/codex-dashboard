# シークレット管理方針

## ローカル開発

- Phase 1には必須のアプリケーション環境変数およびシークレットはない。
- `.env` を作成する必要が生じた場合は `.env.example` に変数名と用途だけを追加し、実値は記入しない。
- `pnpm cert:local` が作成する `.certs/localhost-key.pem` とmkcertのローカルCA秘密鍵はシークレットとして扱い、共有・コミットしない。

## CI/CD

- CIはGitHub Actionsで実行し、Phase 1ではシークレットを必要としない。
- 将来GitHub Actions Secretsを追加する場合は、変数名を `.env.example` に記録し、実値をリポジトリ・ログ・Issue・コミットメッセージへ含めない。

## 本番環境

- Phase 1は開発用のlocalhost HTTPSだけを対象とし、本番環境を持たない。
- 配布・本番相当のローカル実行を導入する場合は、TLS終端方式とシークレット保管先をADRで決定してから設定する。

## 禁止事項

- シークレット値、mkcertのローカルCA秘密鍵、証明書の秘密鍵をコードやコミットメッセージに含めない。
- `.env`、`.certs/`、`.codegraph/`をコミットしない。
