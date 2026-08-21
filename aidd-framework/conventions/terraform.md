# Terraform / Terragrunt 規約

Terraform / Terragrunt + GitOps を使うプロジェクトに適用せよ。

---

## 1. IaC 横展開（全環境同時適用）

### MANDATORY

**アプリリソースまたはインフラモジュールを追加する場合、全環境に同時に追加せよ。1 環境だけに追加して他環境への適用を後回しにするな。**

| 操作 | 全環境への適用 |
|------|-------------|
| GitOps アプリリソース追加（`gitops/apps/<env>/` 等） | stg / prod（またはプロジェクト定義の全環境）に同時追加 |
| Terragrunt モジュール追加（`infra/envs/<env>/` 等） | dev / stg / prod（またはプロジェクト定義の全環境）に同時追加 |

環境ディレクトリの命名はプロジェクトによって異なる。プロジェクトのディレクトリ構造を確認して適用せよ。

**例外**: 段階的ロールアウトが業務要件として明示されている場合のみ許容する。PR に理由を明記し、残り環境への適用 Issue を即時作成せよ。

---

## 2. Terraform validation 必須

### MANDATORY: 新規モジュールの必須変数には `validation` ブロックを定義せよ

```hcl
# DO NOT: 空文字デフォルトで必須チェックを回避するな
variable "cluster_name" {
  type    = string
  default = ""
}

# DO: validation ブロックで明示的に検証せよ
variable "cluster_name" {
  type        = string
  description = "EKS クラスター名"
  validation {
    condition     = length(var.cluster_name) > 0
    error_message = "cluster_name は空文字にできません。"
  }
}
```

**適用範囲**: 新規モジュールの必須変数のみ。既存モジュール修正時は対象外（別途リファクタリング Issue を作成せよ）。

---

## 3. GitOps / Kubernetes 直接操作禁止

**全ての変更は Git を通じてコードで管理せよ。**

### DO NOT（検証目的を除く）

| コマンド | 禁止理由 |
|---------|---------|
| `kubectl apply / delete / patch / edit` | Git に記録されない変更が発生する |
| `helm upgrade / install / uninstall`（CI/CD 外） | GitOps の自動同期と競合する |
| `kubectl exec` 等による実行時設定変更 | 状態がコードに反映されない |

### 許可される例外

| 操作 | 用途 |
|------|------|
| `kubectl get / describe / logs / port-forward` | 読み取り専用 |
| `kubectl diff` / `helm template` / `helm lint` / `helm dry-run` | 検証目的 |
| 緊急インシデント対応 | 事後に**必ず**コードへ反映 + Issue 起票が必要 |

### 変更フロー（この順で行え）

```
Git（単一の真実の源）
  ↓ PR → レビュー → マージ
インフラ層（Terraform+Terragrunt）: CI が terraform apply
k8s マニフェスト層（Helm Chart）:   Flux が自動同期
```

---

## 4. IaC 変更時の必須チェックリスト（毎回確認せよ）

- [ ] **全環境確認**: 追加・変更対象が全環境に存在するか確認し、欠けている環境があれば同一 PR に含めよ
- [ ] **validation 確認**: 新規モジュールの必須変数に `validation` ブロックが定義されているか確認せよ
- [ ] **ドリフト検出**: `terraform plan` の差分に意図しない変更が含まれていないか確認せよ
- [ ] **直接操作禁止**: k8s リソース変更は Helm Chart values または GitOps マニフェスト変更として提案せよ
- [ ] **緊急対応後**: 直接操作した場合はコードへの反映と Issue 起票を必ず行え

---

## 5. ロギング・監査

### MANDATORY

- Terraform の実行ログ（plan / apply）は CI/CD パイプラインで保存する
- `TF_LOG` は CI では `INFO` に設定し、デバッグ時のみ `DEBUG` に変更する
- `terraform apply` の出力（変更件数・リソース名）は Slack または監査ログに転送する

### DO NOT

- `TF_LOG=TRACE` を本番 CI で常時有効にする（認証情報がログに漏れる可能性がある）

---

## テスト戦略（ADR-029 準拠）

> **テスト戦略の原則:** [aidd-framework/conventions/test-strategy.md §インフラ成果物種別テスト戦略](./test-strategy.md) を参照
>
> **IaC セキュリティスキャナー:** trivy を推奨（tfsec 後継 — ADR-029）

### 静的解析ツール

| ツール | 用途 | バージョン |
|--------|------|----------|
| **tflint** | Terraform 構文エラー・型エラー・非推奨パラメータの検出 | v0.63.1 |
| **trivy** | IaC セキュリティ設定スキャン（tfsec 後継）| 最新版を使用・CI でバージョン pin 推奨 |

```bash
# Terraform 静的解析
tflint --init && tflint --recursive
trivy config ./path/to/terraform

# Terragrunt 向け（Terraform のラッパー）
terragrunt validate-all
terragrunt run-all plan --terragrunt-non-interactive
```

### テストフレームワーク

**terraform test（Terraform 1.6+）:**

| command | 内容 | インフラ作成 |
|---------|------|------------|
| `plan`（ユニット相当）| 設定値・論理検証。mock_provider（v1.7+）で高速実行 | なし |
| `apply`（統合相当）| 実リソース作成・API 契約検証 | **あり（専用テスト環境必須）** |

```hcl
# tests/main.tftest.hcl
run "unit_test" {
  command = plan
  assert { condition = ... }
}

run "integration_test" {
  command = apply  # 専用テスト環境で実行
}
```

**terratest v1.0.0（複雑な統合・E2E 向け）:**

- Go 1.26+ が必要
- 複数サービスをまたぐシナリオ・HTTP 疎通確認・SSH 接続に使用
- terraform test では賄えない複雑なシナリオ向け

```go
func TestInfraIntegration(t *testing.T) {
    // terratest による統合・E2E テスト
    defer terraform.Destroy(t, terraformOptions)
    terraform.InitAndApply(t, terraformOptions)
    // ... HTTP・SSH での動作確認
}
```

### モックポリシー

[test-strategy.md §モック判断基準](./test-strategy.md) を参照。

- 静的解析: モック不要（plan のみ実行）
- ユニットテスト（command=plan）: mock_provider でクラウドAPI をモック可
- 統合テスト（command=apply）: 実クラウドリソースを作成（専用アカウント必須）

---

## LocalStack 統合テスト（mock_provider より高忠実度）

`mock_provider` はゼロコストで高速だが合成値のみ。実際の AWS API 動作を検証する場合は LocalStack + tflocal を使用する。

```bash
# tflocal CLI をインストール（推奨: pipx）
pipx install terraform-local

# 通常の terraform コマンドを tflocal に置き換えるだけ
tflocal init
tflocal apply   # エンドポイントを自動で localhost:4566 へ向ける
tflocal destroy
```

| 手法 | 速度 | AWS API 再現度 | コスト |
|------|------|---------------|--------|
| mock_provider | 秒未満 | 最低（合成値）| ゼロ |
| LocalStack + tflocal | 秒〜分 | 高（AWS API 模倣）| ゼロ（OSS）|
| 実 AWS 環境 | 分 | 最高 | 発生 |

**使い分け:**

- ロジック・設定値の検証のみ → `terraform test`（command=plan + mock_provider）
- 実際のリソース作成動作の確認 → LocalStack + tflocal（専用 AWS アカウント不要）
- 本番相当の結合テスト → 実 AWS 環境（専用テストアカウント必須）

---

## ドリフト検出（drift check）

コードと実際のインフラ状態の乖離（設定ドリフト）を `terraform plan -refresh-only` で検出する。

```bash
# ドリフトのみ検出（state ファイルは変更しない）
terraform plan -refresh-only -out=drift-check.binary

# 差分の確認
terraform show -json drift-check.binary | jq '.resource_changes[] | select(.change.actions != ["no-op"])'
```

**ドリフト検出のタイミング:**

| タイミング | 方法 |
|----------|------|
| CI/PR 時 | `terraform plan -refresh-only` を実行し差分をコメント投稿 |
| 定期実行 | スケジュール CI で refresh-only plan を実行してアラート |
| 受け入れ確認後 | `aidd-acceptance-infra` が drift check 結果を Verification Evidence に記録 |

**ドリフト対応方針:**

| 状況 | 対応 |
|------|------|
| 意図しない手動変更 | `terraform apply` で IaC の状態に戻す |
| 有益な変更（セキュリティパッチ等）| IaC コードにバックポートして state を更新 |
| 外部自動化による変更（AutoScaling 等）| `lifecycle { ignore_changes = [...] }` で管理対象外を明示 |

**注意:** `terraform apply` は AI スコープ外。apply は必ず人間が判断・実行する（FRAMEWORK.md Tier 3 準拠）。
