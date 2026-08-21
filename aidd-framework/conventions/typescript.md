# TypeScript テスト規約

> **テスト戦略の原則:** [aidd-framework/conventions/test-strategy.md](./test-strategy.md) を参照

TypeScript / Node.js プロジェクトのテストツール選定と設定例。

---

## テストツール選定

| テスト層 | フレームワーク | コンテナ | 補助ツール |
|---------|-------------|---------|----------|
| **unit** | Vitest または Jest | 不要 | `vi.mock()` / `jest.mock()` |
| **integration** | Vitest / Jest + Supertest | **Testcontainers** | `@testcontainers/postgresql` 等 |
| **E2E** | Playwright（UI）/ Supertest（API）| **Testcontainers** | `@testcontainers/*` |

## セットアップ例

### unit テスト（Vitest）

```typescript
// AC-F[N]-01: Unit — ビジネスロジックの検証
import { describe, test, expect, vi } from 'vitest'

test('AC-F[N]-01: Unit — [Given/When/Then の要約]', () => {
  vi.mock('../external', () => ({ fetch: vi.fn().mockResolvedValue({ data: 'mock' }) }))
  const result = businessLogic(input)
  expect(result).toEqual(expected)
})
```

### integration テスト（Supertest + Testcontainers）

```typescript
// AC-F[N]-02: Integration — API エンドポイントの検証
import { PostgreSqlContainer } from '@testcontainers/postgresql'
import supertest from 'supertest'

let container: StartedPostgreSqlContainer

beforeAll(async () => {
  // 実コンテナを起動（HTTP モック禁止 — ADR-027）
  container = await new PostgreSqlContainer().start()
}, 60000)

afterAll(async () => { await container.stop() })

test('AC-F[N]-02: Integration — [エンドポイント + 条件]', async () => {
  const res = await supertest(app).get('/api/resource')
  expect(res.status).toBe(200)
})
```

### E2E テスト（Playwright）

```typescript
// AC-F[N]-03: E2E — フルスタックのユーザーフロー検証
import { test, expect } from '@playwright/test'

test('AC-F[N]-03: E2E — [Story シナリオ]', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await page.click('[data-testid="submit"]')
  // スクリーンショット検証（ビジュアルリグレッション）
  await expect(page).toHaveScreenshot('result.png', {
    mask: [page.locator('.dynamic-timestamp')]
  })
})
```

## モックポリシー

[test-strategy.md §モック判断基準](./test-strategy.md) を参照。

- unit: 全モック可（`vi.mock()` / `jest.mock()`）
- integration: Testcontainers 必須・HTTP モック禁止
- E2E: Testcontainers 必須・`toHaveScreenshot()` でスクリーンショット検証
