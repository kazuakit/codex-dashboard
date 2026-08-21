# テスト戦略

> **参照 ADR:** [ADR-027（モック判断基準）](../docs/architecture/adr/ADR-027-test-mock-policy.md) / [ADR-028（サブスキル3分割）](../docs/architecture/adr/ADR-028-impl-test-subskill-split.md)

フレームワーク共通のテスト戦略。プロジェクト固有の差分は `docs/project-conventions/overrides.md` に記載する。

---

## 共通

### テスト3層の定義

AIDD-FW パイプラインでは Outside-In TDD を採用し、テストを以下の3層で管理する。

| 層 | 対応スキル | 目的 | 実行環境 |
|----|-----------|------|---------|
| **E2E** | `/aidd-impl-e2e` | Story/AC の受け入れ検証。フルスタック起動で動作確認 | Testcontainers + 実アプリ |
| **integration** | `/aidd-impl-integration` | API 契約・DB 制約・外部サービス境界の検証 | Testcontainers（外部サービス）|
| **unit** | `/aidd-impl-unit` | 純粋ビジネスロジックの検証 | 全外部依存をインライン置き換え（stub/spy）|

Outside-In 実行順序: `e2e（RED）→ integration（RED）→ unit（RED）→ 実装（GREEN）→ リファクタ`

### モック判断基準

テスト層・依存種別ごとにモック可否を判断する（ADR-027 準拠）。

| 依存種別 | unit | integration | E2E |
|---------|------|-------------|-----|
| ローカル起動可能なサービス（DB・Redis・OSS 等）| モック可 | **Testcontainers 必須（モック禁止）** | Testcontainers 必須 |
| OpenAPI spec version-pin 済みの外部 SaaS | モック可 | spec から **contract mock** 生成 | contract mock |
| 上記以外の外部 HTTP | モック可 | **モック禁止**（Testcontainers 対応またはスコープ外）| モック禁止 |
| 時刻・乱数・メール等の副作用系 | モック可 | モック可 | モック可 |

#### 判断フロー

```
外部依存を使うテストを書くとき
  ↓
ローカルで Testcontainers 起動可能？
  YES → integration/E2E では実コンテナを使う（モック禁止）
  NO  →
    OpenAPI spec が存在し version-pin できる？
      YES → spec から contract mock を生成
      NO  → モック禁止。設計を見直すか TestContainers 対応サービスを採用する
```

#### contract mock の作成方法

```bash
# OpenAPI spec をリポジトリ管理（version-pin）
# specs/external/[service]-openapi-v[version].yaml に配置

# MSW で spec から mock を生成（TypeScript の例）
import { createOpenApiHttp } from 'openapi-msw'
import type { paths } from './generated/[service]-api'
const http = createOpenApiHttp<paths>({ baseUrl: 'https://api.example.com' })
```

### AI がテストを書く際の指示

NEVER: 「integration テストで `jest.mock()` / MSW で外部 HTTP をモックする」（ADR-027 違反）
NEVER: 「Testcontainers 起動可能なサービスをモックする」（ADR-027 違反）
ALWAYS: 統合テストでは Testcontainers を使う
ALWAYS: テスト名に `AC-F[N]-NN:` プレフィックスを含める（ADR-020 準拠）

---

## TypeScript

### ツール選定

| テスト層 | フレームワーク | コンテナ | 補助ツール |
|---------|-------------|---------|----------|
| **unit** | Vitest または Jest | 不要 | `vi.mock()` / `jest.mock()` |
| **integration** | Vitest / Jest + Supertest | **Testcontainers** | `@testcontainers/postgresql` 等 |
| **E2E** | Playwright（UI）/ Supertest（API）| **Testcontainers** | `@testcontainers/*` |

### セットアップ例（integration テスト）

```typescript
// AC-F[N]-01: Integration — [テスト内容]
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import supertest from 'supertest'

let container: StartedPostgreSqlContainer

beforeAll(async () => {
  container = await new PostgreSqlContainer().start()
  // ... DB 接続設定
})

afterAll(async () => {
  await container.stop()
})

test('AC-F[N]-01: Integration — [Given/When/Then の要約]', async () => {
  const res = await supertest(app).post('/endpoint').send({ ... })
  expect(res.status).toBe(201)
})
```

### セットアップ例（unit テスト）

```typescript
// AC-F[N]-02: Unit — [テスト内容]
import { vi } from 'vitest'

test('AC-F[N]-02: Unit — [Given/When/Then の要約]', () => {
  vi.mock('../external-service', () => ({ fetch: vi.fn().mockResolvedValue({ ... }) }))
  const result = businessLogic(input)
  expect(result).toEqual(expected)
})
```

### セットアップ例（E2E テスト）

```typescript
// AC-F[N]-03: E2E — [テスト内容]
import { chromium } from 'playwright'
import { GenericContainer } from 'testcontainers'

test('AC-F[N]-03: E2E — [Story シナリオ]', async () => {
  // フルスタック Testcontainers 起動後に Playwright でブラウザ操作
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto('http://localhost:3000')
  // ...
})
```

---

## Python

詳細は [`aidd-framework/conventions/python.md`](./python.md) を参照。

| テスト層 | ツール（概要）|
|---------|------------|
| unit | pytest 9.0.3 |
| integration | pytest + httpx 0.28.1 + testcontainers-python 4.14.2 |
| E2E | pytest-playwright |

---

## Go

詳細は [`aidd-framework/conventions/go.md`](./go.md) を参照。

| テスト層 | ツール（概要）|
|---------|------------|
| unit | testing 標準 + testify v1.11.1 |
| integration | testcontainers-go v0.42.0 |
| E2E | 未定（採用時に go.md を更新）|

---

## テスト生成フェーズ vs テスト実行フェーズ

AIDD-FW のテストプロセスは2つのフェーズに分かれる。

### テスト生成フェーズ

AI（`/aidd-impl` サブスキル群）が担当する。

- **生成物**: テストコード（unit/integration/e2e）・`specs/e2e/*.md`（シナリオ仕様書）
- **サブスキル**: `/aidd-impl-e2e`・`/aidd-impl-integration`・`/aidd-impl-unit`

### テスト実行フェーズ

ツール（CI・ローカル実行環境）が担当する。AI のスコープ外。

- **テストランナー**: pytest / vitest / cargo-nextest / go test 等
- **ツールが生成するもの（AI スコープ外）**: テスト結果レポート・カバレッジレポート・スクリーンショット差分レポート

NEVER: AI がテスト結果レポートやカバレッジレポートを生成しようとする（ツールの責務）。

---

## 成果物種別テスト戦略

何を作っているか（成果物の種別）に応じてテスト戦略を選択する。

### REST API

openapi.yaml を契約として扱い、API の境界・レスポンスを検証する。

| 層 | 検証内容 |
|----|---------|
| unit | ビジネスロジック（バリデーション・変換ロジック）|
| integration | Testcontainers で実 DB・実サービスを起動しエンドポイントの動作を検証。HTTPステータスコード・レスポンスボディを確認 |
| e2e | フルスタックで複数エンドポイントを跨ぐシナリオを検証 |

- openapi.yaml の `x-ac` アノテーションで AC と紐づける
- integration テストでは HTTP レイヤーのモックを禁止（ADR-027）

**RFC 7807 エラーレスポンス検証（FRAMEWORK.md 規約）:**

FRAMEWORK.md の規約によりエラーレスポンスは RFC 7807 準拠（`type`・`title`・`status` 必須・`Content-Type: application/problem+json`）。integration テストでは以下を検証する。

```typescript
// Supertest での RFC 7807 検証例
const res = await request(app).post('/api/resource').send(invalidData);
expect(res.status).toBe(422);
expect(res.headers['content-type']).toMatch(/application\/problem\+json/);
expect(res.body).toMatchObject({
  type: expect.any(String),    // URI 形式
  title: expect.any(String),   // 人間が読めるエラー名
  status: 422,                 // HTTP ステータスコードと一致
});
// 独自形式（{ "error": { "code": "..." } }）は禁止
```

### Web UI

コンポーネント・ユーザー操作・見た目の3観点でテストする。

| 観点 | ツール | 目的 |
|------|--------|------|
| コンポーネント | Storybook + play() | 独立したコンポーネントの振る舞いを検証 |
| E2E ブラウザ操作 | Playwright（テストコード）| ユーザーフロー全体を検証 |
| スクリーンショット検証 | `page.toHaveScreenshot()` | ビジュアルリグレッション検知 |

- E2E テストコードに `page.toHaveScreenshot()` を含める
- 動的領域（タイムスタンプ・ID 等）は `mask` オプションでマスクする
- CI 環境は Docker で統一してスクリーンショット差分を防ぐ

### CLI / Batch

標準入出力・終了コード・冪等性を検証する。

| 層 | 検証内容 |
|----|---------|
| unit | コマンド引数のパース・ビジネスロジック |
| integration | 実際のコマンドを実行して標準出力・標準エラー出力・終了コードを検証 |
| e2e | 一連のバッチ処理フロー。同一入力に対して同じ出力が得られること（冪等性）を確認 |

- プロセスの終了コード（0=成功・1以上=失敗）を明示的に検証する
- 冪等性テスト: 同じコマンドを複数回実行しても副作用が重複しないことを確認する

---

## テスト成果物の定義

### AI が生成するもの

| 成果物 | 生成するサブスキル | 配置先 |
|--------|-----------------|--------|
| ユニットテストコード | `/aidd-impl-unit` | `unit/` |
| 統合テストコード | `/aidd-impl-integration` | `integration/` |
| E2E テストコード（スクリーンショット含む）| `/aidd-impl-e2e` | `e2e/` |
| テストシナリオ仕様書 | `/aidd-epic-design` Step 3 | `specs/e2e/*.md` |

### ツールが生成するもの（AI スコープ外）

| 成果物 | 生成ツール |
|--------|-----------|
| テスト結果レポート | pytest / vitest / cargo-nextest 等 |
| カバレッジレポート | pytest-cov / istanbul / cargo-llvm-cov 等 |
| スクリーンショット差分レポート | Playwright / Chromatic 等 |

---

## インフラ成果物種別テスト戦略

> **参照 ADR:** [ADR-029（IaC セキュリティスキャナー trivy 採用）](../docs/architecture/adr/ADR-029-iac-security-scanner-trivy.md)

インフラコード（IaC・GitOps マニフェスト・Kubernetes 設定）の変更に適用する検証フロー。
アプリコードの unit/integration/e2e とは異なり、各スタック固有の検証段階が存在する。

**AI スコープの境界（Tier 3 準拠）:**

apply・reconcile 等のリソース適用操作は AI のスコープ外。
FRAMEWORK.md Tier 3「plan / migration diff を提示。apply は人間が実行」に従い、
人間が判断・実行する。AI は静的解析・差分確認・スキーマ検証・ポリシーテストまでを担う。

---

### IaC（Terraform + Terragrunt）

| 段階 | 内容 | 主なツール |
|------|------|----------|
| **静的解析** | 構文エラー・セキュリティ設定の確認 | tflint・trivy（ADR-029）|
| **ユニット（plan）** | インフラ作成なし・設定値・論理検証 | terraform test（command=plan）+ mock provider |
| **統合（apply）** | 実リソース作成・API 契約検証（専用テスト環境必須）| terraform test（command=apply）・terratest v1.0.0 |
| **E2E** | 複数サービスをまたぐシナリオ検証 | terratest（週次 or リリース前）|

詳細ツール・セットアップ例は [`aidd-framework/conventions/terraform.md`](./terraform.md) を参照。

---

### GitOps（Flux）

| 段階 | 内容 | 主なツール |
|------|------|----------|
| **スキーマ検証** | マニフェストの Kubernetes スキーマ整合性確認 | kubeconform v0.8.0 |
| **ポリシーテスト** | セキュリティ・組織ルールの適用検証 | conftest（OPA/Rego）|
| **ドリフト検出** | ローカル変更とクラスタ現在状態の差分確認 | flux diff kustomization（exit 0=差分なし・exit 1=差分あり・exit 2+=エラー）|
| **reconciliation** | テストクラスタへの適用確認（**人間が判断・実行**・Tier 3）| flux reconcile |

詳細ツール・セットアップ例は [`aidd-framework/conventions/flux.md`](./flux.md) を参照。

---

### Kubernetes Kustomization

| 段階 | 内容 | 主なツール |
|------|------|----------|
| **ビルド検証** | kustomize build が成功するか確認 | kustomize v5.8.0 |
| **スキーマ検証** | Kubernetes リソースのスキーマ整合性確認（CRD 含む）| kubeconform v0.8.0 |
| **ポリシーテスト** | セキュリティ設定・必須ラベル等の検証 | conftest・trivy |
| **ローカルクラスタ適用** | kind/k3d 上での動作確認（PR 時推奨）| kind v0.32.0・k3d |

詳細ツール・セットアップ例は [`aidd-framework/conventions/kubernetes.md`](./kubernetes.md) を参照。

---

### AI エージェント型（eval-as-spec）

AI エージェント機能は eval-as-spec アプローチを採用する（評価関数を先に書いてからプロンプトを実装する Outside-In TDD）。

#### 3層 eval 構造

| 層 | eval 種類 | 対応する従来テスト層 | 検証内容 |
|----|----------|-------------------|---------|
| 第1層 | Scenario Eval | E2E | エージェントがゴールを達成できるかをエンドツーエンドで検証 |
| 第2層 | Tool Call Eval | 統合テスト | 期待される tool call が正しい順序・引数で発行されるかを検証 |
| 第3層 | Prompt Unit Eval | ユニットテスト | 単一 step の出力に幻覚・動作範囲逸脱がないかを検証 |

#### eval 名の命名規則

```
test("AC-F[Feature Issue番号]-NN: [Scenario|Tool Call|Prompt Unit] Eval [シナリオ名]", ...)
```

例: `test("AC-F1642-01: Scenario Eval エージェントが検索ツールを正しく呼び出す", ...)`

#### 受け入れ基準（3指標）

| 指標 | 基準値 | 測定方法 |
|------|--------|---------|
| tool call 成功率 | ≥95% | 全実行回数のうち期待 tool call が正しく発行された回数の割合 |
| 幻覚率 | ≤5%（AC 単位では 0件必須）| AC の期待出力と実際の出力の乖離をレビュアーが判定 |
| 動作範囲違反 | 0件 | boundary-rules.md に定義された禁止操作・エスカレーション違反の件数 |

#### eval 実装の注意事項

- フレーキー eval（3回中1回 FAIL）は Critical 扱い
- eval 実行には LLM API キーが必要。CI 環境では適切なシークレット管理を行う
- eval-as-spec でも RED → GREEN のサイクルを維持する（プロンプト実装前に eval が失敗することを確認する）
