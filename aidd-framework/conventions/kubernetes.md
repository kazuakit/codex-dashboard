# Kubernetes Kustomization テスト規約

> **テスト戦略の原則:** [aidd-framework/conventions/test-strategy.md §インフラ成果物種別テスト戦略](./test-strategy.md) を参照

Kubernetes Kustomization を使ったマニフェスト管理の検証フロー。

---

## テストツール選定

| ツール | バージョン | 用途 |
|--------|----------|------|
| **kustomize** | v5.8.0 | Kustomization のビルド・オーバーレイ合成 |
| **kubeconform** | v0.8.0 | Kubernetes マニフェストのスキーマ検証（kubeval の後継）|
| **conftest** | 最新版 | OPA/Rego ポリシーによるカスタムルール検証 |
| **trivy** | 最新版 | コンテナイメージ + IaC セキュリティスキャン統合（ADR-029）|
| **kind** | v0.32.0 | ローカル Kubernetes クラスタ（PR 時の統合テスト）|

---

## 検証フロー

### PR 時の推奨順序

```bash
# 1. ビルド検証
kustomize build ./overlays/production > /tmp/manifests.yaml

# 2. スキーマ検証（CRD 含む）
kubeconform \
  -kubernetes-version 1.33.0 \
  -schema-location default \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -ignore-missing-schemas \
  -output json \
  /tmp/manifests.yaml

# 3. ポリシーテスト
conftest test --policy ./policies /tmp/manifests.yaml

# 4. セキュリティスキャン（trivy — ADR-029）
trivy config /tmp/manifests.yaml

# 5. ローカルクラスタ適用（PR の統合確認）
kind create cluster --name test-cluster
kubectl apply --dry-run=server -f /tmp/manifests.yaml
# 実際の適用は人間が判断・実行（Tier 3）
```

### kubeconform の CRD 検証設定

`-schema-location` に CRDs-catalog（datreeio）を指定することで、Flux・cert-manager 等の CRD リソースも検証可能:

```bash
kubeconform \
  -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
  -ignore-missing-schemas \
  ./manifests/
```

- `-ignore-missing-schemas`: CRDs-catalog に未登録のスキーマをスキップ（エラーにしない）
- `-schema-location` は複数指定可能（デフォルト + CRDs-catalog を組み合わせる）

---

## ローカルクラスタ（kind）セットアップ例

```bash
# クラスタ作成
kind create cluster --name test-cluster --config ./kind-config.yaml

# マニフェスト適用（ローカルクラスタへの適用は Tier 3 ではないが、本番クラスタへの apply は人間が実行）
kubectl apply -f ./manifests/
# 注意: 本番クラスタへの apply は AI スコープ外（Tier 3 — 人間が判断・実行）

# テスト実行後のクリーンアップ
kind delete cluster --name test-cluster
```

**apply は AI のスコープ外:** 実クラスタへの適用は Tier 3 として人間が判断・実行する（FRAMEWORK.md Tier 3 準拠）。

---

## モックポリシー

[test-strategy.md §モック判断基準](./test-strategy.md) を参照。

- ビルド検証・スキーマ検証・ポリシーテスト: クラスター接続不要（ローカル実行）
- ローカルクラスタ適用: kind/k3d で実コンテナを使用
- 本番クラスタへの apply: 人間が実行（AI スコープ外）
