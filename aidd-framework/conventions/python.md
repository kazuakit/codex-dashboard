# Python テスト規約

> **テスト戦略の原則:** [aidd-framework/conventions/test-strategy.md](./test-strategy.md) を参照

Python プロジェクトのテストツール選定と設定例。

---

## テストツール選定

| テスト層 | フレームワーク | バージョン | 補助ツール |
|---------|-------------|---------|----------|
| **unit** | pytest | 9.0.3 | pytest-asyncio 1.4.0 |
| **integration** | pytest + httpx | httpx 0.28.1 | testcontainers-python 4.14.2 |
| **E2E** | pytest + pytest-playwright | latest | Testcontainers |

**注意:** pytest-asyncio 1.0 以降でデフォルトモードが変更された。既存コードの移行が必要な場合がある。

## テスト命名規約

Python の関数名は PEP 8 snake_case に従う。AC-ID は docstring 先頭に `AC-F[N]-NN:` 形式で記載し、これを機械トレース（`git grep "AC-F[N]-NN"`）の正本とする。

```
# 関数名: test_ac_fN_NN_<説明>  ← snake_case（PEP 8 準拠）
# docstring 先頭: "AC-F[N]-NN: [種別] — [説明]"  ← git grep の対象
```

## セットアップ例

### unit テスト（pytest）

```python
# AC-F[N]-01: Unit — ビジネスロジックの検証
import pytest
from unittest.mock import patch

def test_ac_fN_01_unit_business_logic():
    """AC-F[N]-01: Unit — [Given/When/Then の要約]"""
    with patch('module.external_service') as mock_svc:
        mock_svc.return_value = {'data': 'mock'}
        result = business_logic(input_value)
    assert result == expected
```

### integration テスト（pytest + httpx + Testcontainers）

```python
# AC-F[N]-02: Integration — API エンドポイントの検証
import pytest
from testcontainers.postgres import PostgresContainer
import httpx

@pytest.fixture(scope="session")
def postgres():
    with PostgresContainer("postgres:17") as pg:
        yield pg

@pytest.mark.asyncio
async def test_ac_fN_02_integration(postgres):
    """AC-F[N]-02: Integration — [エンドポイント + 条件]"""
    # 実コンテナを使用（HTTP モック禁止 — ADR-027）
    async with httpx.AsyncClient() as client:
        response = await client.get("http://localhost:8000/api/resource")
    assert response.status_code == 200
```

### E2E テスト（pytest-playwright）

```python
# AC-F[N]-03: E2E — フルスタックのユーザーフロー検証
from playwright.sync_api import Page, expect

def test_ac_fN_03_e2e(page: Page):
    """AC-F[N]-03: E2E — [Story シナリオ]"""
    page.goto("http://localhost:8000")
    page.click("[data-testid='submit']")
    expect(page).to_have_screenshot("result.png")
```

## モックポリシー

[test-strategy.md §モック判断基準](./test-strategy.md) を参照。

- unit: 全モック可（`unittest.mock.patch` 等）
- integration: Testcontainers 必須・HTTP モック禁止
- E2E: Testcontainers 必須

---

## CLI / バッチ テスト（サブプロセス実行）

CLI コマンドやバッチスクリプトのテストでは `subprocess` でプロセスを直接実行し、標準出力・終了コード・冪等性を検証する。

### 基本パターン（CLI コマンド実行テスト）

```python
# AC-F[N]-04: Integration — CLI コマンドの出力・終了コード検証
import subprocess
import pytest

def test_ac_fN_04_cli_exit_code():
    """AC-F[N]-04: Integration — コマンドが正常終了し期待出力を返す"""
    result = subprocess.run(
        ['python', '-m', 'my_cli', '--input', 'data.csv'],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 0, f"Exit code: {result.returncode}\nstderr: {result.stderr}"
    assert 'processed 100 records' in result.stdout

def test_ac_fN_04_cli_error_exit_code():
    """AC-F[N]-04: Integration — 不正入力で exit code 1 を返す"""
    result = subprocess.run(
        ['python', '-m', 'my_cli', '--input', 'nonexistent.csv'],
        capture_output=True,
        text=True,
    )
    assert result.returncode == 1
    assert 'File not found' in result.stderr
```

### 冪等性テスト

```python
# AC-F[N]-05: Integration — バッチの冪等性検証（同一入力で2回実行して同一出力）
import subprocess
import filecmp

def test_ac_fN_05_batch_idempotency(tmp_path):
    """AC-F[N]-05: Integration — 冪等性（2回実行で同一出力）"""
    input_file = 'tests/fixtures/input.csv'
    output1 = tmp_path / 'output1.csv'
    output2 = tmp_path / 'output2.csv'

    # 1回目の実行
    result1 = subprocess.run(
        ['python', '-m', 'my_batch', '--input', input_file, '--output', str(output1)],
        capture_output=True, text=True,
    )
    assert result1.returncode == 0

    # 2回目の実行（同一入力）
    result2 = subprocess.run(
        ['python', '-m', 'my_batch', '--input', input_file, '--output', str(output2)],
        capture_output=True, text=True,
    )
    assert result2.returncode == 0

    # 出力が完全一致する（冪等性の確認）
    assert filecmp.cmp(output1, output2, shallow=False), "冪等性テスト失敗: 出力が一致しない"
```

### 処理件数の検証

```python
# AC-F[N]-06: Integration — 処理件数の照合
def test_ac_fN_06_batch_record_count():
    """AC-F[N]-06: Integration — バッチが期待件数を処理する"""
    result = subprocess.run(
        ['python', '-m', 'my_batch', '--input', 'tests/fixtures/100_records.csv'],
        capture_output=True, text=True,
    )
    assert result.returncode == 0
    # stdout または専用の統計出力から処理件数を検証
    assert 'processed: 100' in result.stdout
    assert 'errors: 0' in result.stdout
```
