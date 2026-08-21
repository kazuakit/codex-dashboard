# Flux（GitOps）テスト規約

> **テスト戦略の原則:** [aidd-framework/conventions/test-strategy.md §インフラ成果物種別テスト戦略](./test-strategy.md) を参照

Flux v2 を使った GitOps マニフェスト変更時の検証フロー。

---

## テストツール選定

| ツール | バージョン | 用途 |
|--------|----------|------|
| **kubeconform** | v0.8.0 | Kubernetes マニフェストのスキーマ検証（kubeval の後継）|
| **conftest** | 最新版 | OPA/Rego ポリシーによるカスタムルール検証 |
| **flux build kustomization --dry-run** | Flux v2.7 | クラスター接続不要のビルド確認 |
| **flux diff kustomization** | Flux v2.7 | ドリフト検出（CI での差分確認）|

---

## 検証フロー

### PR 時の推奨順序

```bash
# 1. ビルド確認（クラスター接続不要）
flux build kustomization my-app \
  --path ./path/to/local/manifests \
  --kustomization-file ./my-app.yaml \
  --dry-run

# 2. スキーマ検証
kustomize build ./overlays/production | \
  kubeconform \
    -kubernetes-version 1.33.0 \
    -schema-location default \
    -schema-location 'https://raw.githubusercontent.com/datreeio/CRDs-catalog/main/{{.Group}}/{{.ResourceKind}}_{{.ResourceAPIVersion}}.json' \
    -ignore-missing-schemas \
    -

# 3. ポリシーテスト
conftest test --policy ./policies ./manifests/

# 4. ドリフト検出（stage/prod 相当の環境）
flux diff kustomization my-app \
  --path ./path/to/local/manifests
```

### flux diff の終了コード

| 終了コード | 意味 | CI 判定 |
|----------|------|---------|
| exit 0 | 差分なし（ローカルとクラスタが一致）| PASS |
| exit 1 | 差分あり（変更が検出された）| 差分内容を確認してから適用を人間が判断 |
| exit 2 以上 | エラー（接続失敗・権限不足等）| FAIL |

**reconciliation は AI のスコープ外:** テストクラスタへの `flux reconcile` 実行は Tier 3 として人間が判断・実行する（FRAMEWORK.md Tier 3 準拠）。

---

## モックポリシー

[test-strategy.md §モック判断基準](./test-strategy.md) を参照。

- スキーマ検証・ポリシーテスト: クラスター接続不要（ローカル実行）
- flux diff: stage/prod 相当のクラスターへの接続が必要
- reconciliation: 人間が実行（AI スコープ外）
