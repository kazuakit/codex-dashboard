# Go テスト規約

> **テスト戦略の原則:** [aidd-framework/conventions/test-strategy.md](./test-strategy.md) を参照

Go プロジェクトのテストツール選定と設定例。

---

## テストツール選定

| テスト層 | フレームワーク | バージョン | 補助ツール |
|---------|-------------|---------|----------|
| **unit** | testing（標準）+ testify | testify v1.11.1 | `assert` / `require` / `mock` |
| **integration** | testing + testify + testcontainers-go | testcontainers-go v0.42.0 | Docker |
| **E2E** | testing + testcontainers-go | — | 未定（Go 向けブラウザ自動化ツールの成熟度を確認中。確定時は ADR を作成し本ファイルを更新する）|

**注意:** E2E ツール（ブラウザ自動化）は成熟度確認中。採用時は `docs/project-conventions/overrides.md` に追記する。

## セットアップ例

### unit テスト（testing + testify）

```go
// AC-F[N]-01: Unit — ビジネスロジックの検証
func TestAC_FN_01_Unit(t *testing.T) {
    // Arrange
    mockSvc := new(MockExternalService)
    mockSvc.On("Call", mock.Anything).Return("mock_result", nil)
    
    // Act
    result, err := BusinessLogic(mockSvc, input)
    
    // Assert
    require.NoError(t, err)
    assert.Equal(t, expected, result)
}
```

### integration テスト（testcontainers-go）

```go
// AC-F[N]-02: Integration — API エンドポイントの検証
func TestAC_FN_02_Integration(t *testing.T) {
    ctx := context.Background()
    
    // 実コンテナを起動（HTTP モック禁止 — ADR-027）
    pgContainer, err := postgres.Run(ctx, "postgres:17",
        postgres.WithDatabase("testdb"),
        postgres.WithUsername("test"),
        postgres.WithPassword("test"),
    )
    require.NoError(t, err)
    defer pgContainer.Terminate(ctx)
    
    // テスト実行
    resp, err := http.Get("http://localhost:8080/api/resource")
    require.NoError(t, err)
    assert.Equal(t, http.StatusOK, resp.StatusCode)
}
```

## モックポリシー

[test-strategy.md §モック判断基準](./test-strategy.md) を参照。

- unit: 全モック可（`testify/mock`）
- integration: Testcontainers 必須・HTTP モック禁止
- E2E: 採用時に確定

---

## CLI テスト（サブプロセス実行）

Go で実装した CLI コマンドのテストでは `exec.Command` でプロセスを直接実行し、標準出力・終了コードを検証する。

### 基本パターン（CLI コマンド実行テスト）

```go
// AC-F[N]-04: Integration — CLI コマンドの出力・終了コード検証
func TestAC_FN_04_CLI_ExitCode(t *testing.T) {
    // コマンドを直接実行（ビルド済みバイナリ or go run）
    cmd := exec.Command("./my-cli", "--input", "testdata/input.csv")
    var stdout, stderr bytes.Buffer
    cmd.Stdout = &stdout
    cmd.Stderr = &stderr

    err := cmd.Run()
    require.NoError(t, err, "Exit code != 0\nstderr: %s", stderr.String())
    assert.Contains(t, stdout.String(), "processed 100 records")
}

func TestAC_FN_04_CLI_ErrorExitCode(t *testing.T) {
    cmd := exec.Command("./my-cli", "--input", "nonexistent.csv")
    err := cmd.Run()

    // exit code 1 を期待
    var exitErr *exec.ExitError
    require.ErrorAs(t, err, &exitErr)
    assert.Equal(t, 1, exitErr.ExitCode())
}
```

### 冪等性テスト（Go バッチ）

```go
// AC-F[N]-05: Integration — バッチの冪等性検証
func TestAC_FN_05_BatchIdempotency(t *testing.T) {
    tmpDir := t.TempDir()
    output1 := filepath.Join(tmpDir, "output1.csv")
    output2 := filepath.Join(tmpDir, "output2.csv")

    // 1回目の実行
    cmd1 := exec.Command("./my-batch", "--input", "testdata/input.csv", "--output", output1)
    require.NoError(t, cmd1.Run())

    // 2回目の実行（同一入力）
    cmd2 := exec.Command("./my-batch", "--input", "testdata/input.csv", "--output", output2)
    require.NoError(t, cmd2.Run())

    // 出力が完全一致する（冪等性の確認）
    data1, err := os.ReadFile(output1)
    require.NoError(t, err)
    data2, err := os.ReadFile(output2)
    require.NoError(t, err)
    assert.Equal(t, data1, data2, "冪等性テスト失敗: 出力が一致しない")
}
```
