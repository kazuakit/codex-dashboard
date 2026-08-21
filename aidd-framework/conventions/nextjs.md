# Next.js 規約

Next.js + Vitest + Supertest + Playwright + Biome を使うプロジェクトに適用せよ。

---

## 1. ディレクトリ構成（この構造に従え）

```
src/
├── app/                    # App Router: ページ・レイアウト・ルートハンドラー
│   ├── (routes)/           # ルートグループ
│   ├── api/                # Route Handlers
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                 # 汎用プリミティブ
│   └── features/           # ドメイン単位コンポーネント
├── lib/                    # ユーティリティ・ヘルパー
├── hooks/                  # カスタム React フック
└── types/                  # グローバルスコープ型定義

e2e/                        # Playwright E2E テスト
```

### DO / DO NOT

| DO | DO NOT |
|----|--------|
| `app/` にはページ・レイアウト・Route Handlers のみ置け | `app/` にビジネスロジックを持ち込むな |
| 汎用コンポーネントは `ui/`、ドメイン単位は `features/` に置け | プロジェクト固有構成を ADR に記録せずに変更するな |

---

## 2. テスト戦略

| レイヤー | ツール | 対象 | 配置 |
|---------|--------|------|------|
| ユニットテスト | Vitest | 関数・コンポーネント単体 | `*.test.ts(x)`（コロケーション） |
| 統合テスト | Supertest | API ルートの入出力 | `*.test.ts` |
| E2E テスト | Playwright | ユーザーシナリオ全体 | `e2e/` |

### カバレッジ基準

| レイヤー | 閾値 |
|---------|------|
| ユニットテスト | 80% 以上（行カバレッジ）|
| 統合テスト | 主要 API エンドポイントのハッピーパス + 主要エラーケース（400/401/403/404/500）を必ずカバー |
| E2E テスト | クリティカルなユーザーシナリオ（認証・主要業務フロー）のみ。網羅率より再現性を優先する |

### テストデータ方針

| 種別 | 使い分け |
|------|---------|
| インラインデータ | テスト関数内で完結する単純な値（文字列・数値）|
| Factory 関数 | 複数テストで共通する複雑なオブジェクト（`createUser()` 等）|
| Fixture ファイル | 外部 API レスポンス・大きな JSON のモック（`__fixtures__/` 配下に配置）|

DO NOT: テスト間でグローバル状態を共有するな。各テストは独立して実行可能にせよ。

### モック方針（ADR-027 準拠）

テスト層ごとにモック可否が異なる。詳細は `aidd-framework/conventions/test-strategy.md` §モック判断基準 を参照。

**ユニットテスト（Vitest / Jest）:**
- 外部依存（DB・外部 API・サービス）: すべてモック可（`vi.mock()` / MSW）
- 同一モジュール内の関数: モックしない（実装で直接テストする）

**統合テスト（Supertest + Testcontainers）:**
- DB・ローカル起動可能なサービス: Testcontainers で実コンテナを使用。モック禁止（ADR-027）
- OpenAPI spec version-pin 済みの外部 SaaS: spec から生成した contract mock を使用
- 時刻・乱数・メール等の副作用系: モック可
- 上記以外の外部 HTTP: モック禁止。設計を見直すか Testcontainers 対応サービスを採用

**E2E テスト（Playwright + Testcontainers）:**
- すべての外部依存: Testcontainers でフルスタック起動。モック禁止

### MANDATORY

- 純粋関数・ユーティリティには必ずユニットテストを書け
- 統合テスト（Supertest）では DB・ローカル起動可能なサービスは Testcontainers を使用せよ（ADR-027）
- E2E はクリティカルなシナリオのみカバーせよ（量より質）
- テスト間の依存を持たせるな（CI 並行実行前提）
- テスト名は AC-ID プレフィックス形式（`AC-F[N]-NN: テスト内容の説明`）で記述せよ（ADR-020）

---

## 3. 命名規約

| 対象 | 規約 | 例 |
|------|------|---|
| コンポーネントファイル | PascalCase | `UserCard.tsx` |
| ページ・レイアウト | Next.js 規約 | `page.tsx`, `layout.tsx` |
| フックファイル | camelCase（`use` プレフィックス） | `useUserData.ts` |
| ユーティリティ | camelCase | `formatDate.ts` |
| テストファイル | 対象 + `.test` | `UserCard.test.tsx` |

- コンポーネント名は PascalCase（例: `UserProfileCard`）
- 汎用コンポーネントは一般名詞（例: `Button`, `Modal`）
- 機能コンポーネントはドメイン + 役割（例: `OrderSummaryPanel`）
- イベントハンドラーは `handle` プレフィックス（例: `handleSubmit`）
- ブール型変数は `is` / `has` / `can` プレフィックス（例: `isLoading`, `hasError`）

---

## 4. Biome 設定

`biome.json` はリポジトリルートに配置し、全パッケージで共通設定を継承せよ。

```json
{
  "$schema": "https://biomejs.dev/schemas/1.x.x/schema.json",
  "organizeImports": { "enabled": true },
  "linter": { "enabled": true, "rules": { "recommended": true } },
  "formatter": {
    "enabled": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": { "quoteStyle": "double", "trailingCommas": "all" }
  }
}
```

### MANDATORY

- `biome check` を lefthook（pre-commit）および CI に組み込め
- プロジェクト固有ルール追加は `biome.json` の `overrides` で管理し、ADR に理由を記録せよ

### DO NOT

- `// biome-ignore` による抑制を使うな。根本原因を修正せよ

---

## 5. エラーハンドリング

### 基本方針

- HTTP API は RFC 7807（Problem Details for HTTP APIs）準拠のレスポンスを返す
- `Content-Type: application/problem+json`
- 必須フィールド: `type` / `title` / `status`、任意フィールド: `detail` / `instance`

### エラー種別と HTTP ステータス

| エラー種別 | HTTP ステータス | 対応方針 |
|-----------|---------------|---------|
| バリデーションエラー | 400 / 422 | Zod スキーマで検証し、フィールド単位のエラー詳細を `detail` に含める |
| 認証エラー | 401 | セッション・トークン無効。再認証を促す |
| 認可エラー | 403 | リソースへのアクセス権なし。詳細は返さない |
| リソース不在 | 404 | 対象 ID をメッセージに含める |
| ビジネスルール違反 | 409 | 競合・制約違反の理由を `detail` に明記する |
| サーバーエラー | 500 | スタックトレースをクライアントに返さない。ログに記録する |

### DO / DO NOT

| DO | DO NOT |
|----|--------|
| Route Handler の外側で Next.js の `middleware` または共通ユーティリティでエラーを整形する | 各 Route Handler でバラバラにエラーレスポンスを組み立てる |
| `instanceof` でエラー型を判定し、既知エラーと未知エラーを分岐する | `catch (e: unknown)` をそのまま 500 で返す |

---

## 6. ロギング

### 基本方針

- 構造化ログ（JSON 形式）を使用する
- ログレベル: `error` / `warn` / `info` / `debug`
- サーバーサイド（Route Handler・Server Component）のみでログを出力する。クライアントコンポーネントではログを出力しない

### ログレベル定義

| レベル | 使用基準 | 例 |
|-------|---------|-----|
| `error` | 予期しない例外・サービス停止相当 | DB 接続エラー、外部 API 呼び出し失敗 |
| `warn` | 業務的に想定される異常・降格した処理 | レート制限到達、リトライ発生 |
| `info` | 主要なビジネスイベント | ユーザー登録完了、注文作成 |
| `debug` | 開発時の詳細トレース（本番は無効化） | 関数の入出力値 |

### 必須ログコンテキスト

リクエスト起因のログには以下を含める：

| フィールド | 説明 |
|-----------|------|
| `requestId` | トレーシング用 UUID（`x-request-id` ヘッダーから取得 or 生成） |
| `userId` | 認証済みユーザーの ID（未認証は `null`） |
| `path` | リクエストパス |
| `durationMs` | レスポンスタイム（ms）|

### DO / DO NOT

| DO | DO NOT |
|----|--------|
| `console.log` の代わりに採用ロギングライブラリ（pino 等）を使う | `console.log` をプロダクションコードに残す |
| 個人情報（メールアドレス・パスワード等）をログに出力しない | リクエストボディをそのままログに流す |

---

## Spikestudio UIKit テスト戦略

Spikestudio UIKit（`catalog.json` 管理コンポーネント）のテスト方針。

### catalog.json を使ったコンポーネント確認

MANDATORY: UIKit コンポーネントを使用するテストでは、実装前に `catalog.json` でコンポーネント仕様を確認する（ADR-012）。

```bash
# catalog.json のコンポーネントメタデータ確認
cat mocks/ui/node_modules/@spikestudio/uikit/catalog.json | jq '.components["ComponentName"]'
```

### Storybook 9.0 によるコンポーネントテスト

```typescript
// Button.stories.tsx — Storybook の play() 関数でインタラクションテスト
import type { Meta, StoryObj } from '@storybook/react'
import { within, userEvent } from '@storybook/test'
import { Button } from '@spikestudio/uikit'

const meta: Meta<typeof Button> = { component: Button }
export default meta

export const Primary: StoryObj<typeof Button> = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole('button'))
    await expect(canvas.getByText('Clicked!')).toBeInTheDocument()
  },
}
```

**実行:**

```bash
# Storybook テストランナーで全ストーリーのインタラクションテストを実行
npm run test-storybook
```

### ビジュアルリグレッション（スクリーンショット比較）

UIKit コンポーネントの見た目の変化を検知する。

```typescript
// Playwright の toHaveScreenshot() で見た目の変化を検知
test('AC-F[N]-01: E2E — [コンポーネント名] の見た目確認', async ({ page }) => {
  await page.goto('http://localhost:3000/components/button')
  await expect(page.locator('[data-testid="button-primary"]')).toHaveScreenshot('button-primary.png')
})
```

- catalog.json に `states` が定義されているコンポーネントは各状態のスクリーンショットを取得する
- スナップショットは `e2e/__screenshots__/` 配下に保存
- CI 環境は Docker で統一してスクリーンショット差分を防ぐ
