# 型別スキル追加ガイド

> このドキュメントは新しい開発型（ui / cli / infra / batch / agent 等）のスキル群を追加するときに従う標準構造を定義する。
> Epic #1590・ADR-032 に基づく。

---

## 概要

1つの開発型に対して4つのスキルで構成される「型別スキルセット」を作成し、`aidd-epic-design` の capability テーブルに登録する。

---

## スキル名規則

| 役割 | スキル名 | 配置先 |
|------|---------|--------|
| Layer 1 オーケストレーター | `aidd-feature-[type]` | `skills/aidd-feature-[type]/SKILL.md` |
| Layer 2 設計フェーズ | `aidd-feature-design-[type]` | `skills/aidd-feature-design-[type]/SKILL.md` |
| Layer 2 実装フェーズ | `aidd-impl-[type]` | `skills/aidd-impl-[type]/SKILL.md` |
| Layer 2 受け入れ確認フェーズ | `aidd-acceptance-[type]` | `skills/aidd-acceptance-[type]/SKILL.md` |

`[type]` は `api / ui / cli / infra / batch / agent` のいずれか（小文字）。

---

## テンプレート（api 型を参照）

`skills/aidd-feature-api/SKILL.md` が最初に実装された型別スキルであり、他型追加時のテンプレートとして使用する。

```
skills/aidd-feature-api/SKILL.md        ← Layer 1 テンプレート
skills/aidd-feature-design-api/SKILL.md ← Layer 2 設計テンプレート
skills/aidd-impl-api/SKILL.md          ← Layer 2 実装テンプレート
skills/aidd-acceptance-api/SKILL.md    ← Layer 2 受け入れテンプレート
```

---

## 型別スキルのインターフェース仕様

各スキルは以下のインターフェースセクションを必ず持つこと（`task lint:skill-structure` が検証する）。

### aidd-feature-[type]（Layer 1）

- **前提条件**: Feature Issue 存在・開発型が宣言済み・design.md 存在
- **capability**: aidd-feature-design-[type]・aidd-impl-[type]・aidd-acceptance-[type]
- **入力**: Feature Issue 番号
- **出力**: 型に応じた specs/ 追記・実装コード・検証証跡
- **後続スキル**: 次 Feature の型別スキル または `/aidd-review epic`

### aidd-feature-design-[type]（Layer 2 設計）

- **前提条件**: Feature Stories/AC 存在・specs/ ファイル存在（型に応じた仕様ファイル）
- **capability**: `aidd-architect`（Sub2 レビュー）
- **入力**: Feature Issue 番号・Stories/AC
- **出力**: 型に応じた specs/ ファイル（openapi.yaml / screens/ / cli/spec.md / terraform/ 等）
- **後続スキル**: 親 aidd-feature-[type] に戻る

### aidd-impl-[type]（Layer 2 実装）

- **前提条件**: Feature Issue 存在・design.md 存在・設計フェーズ完了
- **capability**: Layer 3 共通サブスキル（下記参照）
- **入力**: Feature Issue 番号
- **出力**: テストコード（e2e/integration/unit）・実装コード
- **後続スキル**: 親 aidd-feature-[type] に戻る

### aidd-acceptance-[type]（Layer 2 受け入れ）

- **前提条件**: 実装フェーズ完了・dev/テスト環境が起動中
- **capability**: なし（型に応じたツールを直接実行）
- **入力**: Feature Issue 番号
- **出力**: Feature Issue の Verification Evidence セクション
- **後続スキル**: 親 aidd-feature-[type] に戻る

---

## 共通サブスキルの利用方法

以下の Layer 3 共通サブスキルは型に関係なく同一の手順で呼び出される（BR-SPIPE-04）。

| 共通サブスキル | 呼び出し元 | 用途 |
|-------------|-----------|------|
| `aidd-impl-e2e` | `aidd-impl-[type]` | E2E テスト生成（Outside-In 第1層）|
| `aidd-impl-integration` | `aidd-impl-[type]` | 統合テスト生成（Outside-In 第2層）|
| `aidd-impl-unit` | `aidd-impl-[type]` | ユニットテスト生成（Outside-In 第3層）|
| `aidd-impl-code` | `aidd-impl-[type]` | 実装・リファクタ（GREEN フェーズ）|
| `aidd-impl-quality` | `aidd-impl-[type]` | 静的品質検証（10チェック）|
| `aidd-impl-docs` | `aidd-impl-[type]` | ドキュメント drift 検出・更新提案 |

---

## capability テーブルへの登録

型別スキルを作成したら、`skills/aidd-epic-design/SKILL.md` の「型別スキルレジストリ（capability テーブル）」テーブルに行を追加する。

```markdown
| [type] | `aidd-feature-[type]` | [型の説明] |
```

例（infra 型を追加する場合）:

```markdown
| infra | `aidd-feature-infra` | IaC の設計→実装→受け入れ確認 |
```

---

## 新型追加の手順

1. テンプレート（api 型）の4スキルをコピーして `[type]` 部分を置換する
2. 型に特有の設計成果物・テスト戦略・受け入れ確認方法を各スキルに記述する（下記の型別差分表を参照）
3. `skills/aidd-epic-design/SKILL.md` の capability テーブルに登録する
4. `task check` で lint・frontmatter・structure が PASS することを確認する

---

## 型別差分表

| 型 | 設計成果物 | テスト戦略 | 受け入れ確認ツール |
|----|---------|---------|----------------|
| api | specs/openapi.yaml | HTTP E2E / Supertest / Vitest | curl / HTTP |
| ui | specs/screens/ | Playwright / Storybook | Playwright MCP |
| cli | specs/cli/spec.md | コマンド実行・出力照合 | bash 直接実行 |
| infra | HCL モジュール設計 | terraform test / Terratest | terraform plan diff / smoke test |
| batch | DAG / ジョブ設計書 | 入力→出力データ照合・冪等性 | バッチ直接実行・出力検証 |
| agent | AGENT.md / eval シナリオ | eval-as-spec | eval 実行（tool call 成功率・幻覚率）|
