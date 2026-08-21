# Rust 規約

Rust + Tokio + Axum + Tracing を使うプロジェクトに適用せよ。

---

## 1. ディレクトリ構成（この構造に従え）

```
src/
├── main.rs             # エントリポイント（最小限。起動処理のみ）
├── lib.rs              # ライブラリルート（再利用可能なロジック）
├── config.rs           # 設定構造体・読み込み処理
├── error.rs            # アプリ共通エラー型定義
├── routes/             # axum ルーター定義
│   ├── mod.rs
│   └── [domain].rs     # ドメイン単位のルート定義
├── handlers/           # リクエストハンドラー（薄いグルーコード）
│   └── [domain].rs
├── services/           # ビジネスロジック
│   └── [domain].rs
├── repositories/       # データアクセス層
│   └── [domain].rs
└── models/             # ドメインモデル・DTO
    └── [domain].rs

tests/                  # 統合テスト（`tests/` ディレクトリ形式）
```

Cargo workspace を使う場合はクレート単位でこの構造を繰り返す。

### DO / DO NOT

| DO | DO NOT |
|----|--------|
| `main.rs` はランタイム起動・トレーシング初期化のみに留めよ | `main.rs` にビジネスロジックを書くな |
| ビジネスロジックは `services/` に集約せよ | ハンドラーに DB アクセスや計算ロジックを書くな |
| `error.rs` にアプリ全体の共通エラー型を定義せよ | 各モジュールにバラバラにエラー型を定義するな |

---

## 2. Clippy / rustfmt 設定

### 基本設定

```toml
# rustfmt.toml
edition = "2021"
max_width = 100
tab_spaces = 4
newline_style = "Unix"
```

```toml
# .cargo/config.toml — Clippy をデフォルトで警告をエラーにする
[build]
rustflags = ["-D", "warnings"]
```

### MANDATORY

- `cargo clippy -- -D warnings` を lefthook（pre-commit）および CI に組み込め
- `cargo fmt --check` を CI に組み込め（フォーマット差分があればビルド失敗とする）
- `#[allow(clippy::...)]` による抑制を使うな。根本原因を修正せよ
- プロジェクト固有のルール追加は `.clippy.toml` で管理し、ADR に理由を記録せよ

### DO / DO NOT

| DO | DO NOT |
|----|--------|
| `cargo fix` で機械的に解消できる警告は即時修正せよ | `#[allow(unused)]` で未使用コードを放置するな（削除せよ） |
| `cargo clippy --all-targets --all-features` で全ターゲットを検査せよ | Clippy 警告を CI でのみ確認し、ローカルで無視するな |

---

## 3. テスト戦略

> **テスト戦略の原則:** [aidd-framework/conventions/test-strategy.md](./test-strategy.md) を参照

| レイヤー | ツール | バージョン | 対象 | 配置 |
|---------|--------|---------|------|------|
| **unit** | `#[test]` / `#[tokio::test]` | Rust 1.94+ | 関数・メソッド単体 | 対象ファイル末尾の `#[cfg(test)]` モジュール |
| **integration** | cargo-nextest + testcontainers + testcontainers-modules | nextest 0.9.137 / testcontainers 0.27.3 / modules 0.14.0 | HTTPエンドポイント・DB 制約 | `tests/` ディレクトリ |
| **E2E** | cargo-nextest + testcontainers | — | フルスタックシナリオ | `tests/e2e/` ディレクトリ |

**cargo-nextest の主要機能:**

- `slice:m/n` によるテスト分割パーティショニング（CI 並列化）
- `flaky-result` オプション: テスト再試行時の失敗判定制御
- Chrome Trace 形式でのテスト実行データエクスポート

**セットアップ例（integration テスト）:**

```rust
// AC-F[N]-01: Integration — DB 制約の検証
use testcontainers::{clients::Cli, Container};
use testcontainers_modules::postgres::Postgres;

#[tokio::test]
async fn test_ac_fn_01_integration() {
    let docker = Cli::default();
    // 実コンテナを起動（HTTP モック禁止 — ADR-027）
    let container: Container<Postgres> = docker.run(Postgres::default());
    let connection_string = format!(
        "postgres://postgres:postgres@localhost:{}/postgres",
        container.get_host_port_ipv4(5432)
    );
    // テスト実行
    let pool = sqlx::PgPool::connect(&connection_string).await.unwrap();
    // ...
}
```

**モックポリシー:**

[test-strategy.md §モック判断基準](./test-strategy.md) を参照。

- unit: 全モック可（`mockall` クレート等）
- integration: Testcontainers 必須・HTTP モック禁止
- E2E: Testcontainers 必須（Rust 向けブラウザ自動化ツールは成熟度確認中。確定時は ADR を作成し本ファイルを更新する）

### カバレッジ基準

| レイヤー | 閾値 |
|---------|------|
| ユニットテスト | 80% 以上（行カバレッジ）|
| 統合テスト | 主要エンドポイントのハッピーパス + 主要エラーケース（400/401/403/404/500）を必ずカバー |

### 非同期テスト

```rust
// DO: tokio ランタイムが必要なテストには #[tokio::test] を使え
#[tokio::test]
async fn test_create_user() {
    // ...
}

// DO NOT: 同期テストで block_on を使うな
#[test]
fn test_create_user_bad() {
    tokio::runtime::Runtime::new().unwrap().block_on(async {
        // 非推奨
    });
}
```

### MANDATORY

- 純粋関数・ユーティリティには必ずユニットテストを書け
- `#[cfg(test)]` ブロックは対象モジュールの末尾に配置せよ
- 統合テストはハッピーパス + 主要エラーケースをカバーせよ
- テスト間の依存を持たせるな（並行実行前提）
- テスト名は AC-ID プレフィックス形式（`AC-F[N]-NN: テスト内容の説明`）で記述せよ（ADR-020）。Rust の関数名にコロン・ハイフンは使えないため、`#[doc]` アトリビュートで AC-ID を付与し、関数名は snake_case で近似する

```rust
#[tokio::test]
#[doc = "AC-F1-01: ユーザー作成が 201 を返す"]
async fn ac_f1_01_create_user_returns_201() {
    // ...
}
```

---

## 4. 命名規則

| 対象 | 規約 | 例 |
|------|------|---|
| 変数・関数・モジュール | `snake_case` | `user_id`, `get_user()`, `mod user_service` |
| 型・トレイト・列挙型 | `UpperCamelCase` | `UserProfile`, `Repository`, `ErrorKind` |
| 定数・静的変数 | `SCREAMING_SNAKE_CASE` | `MAX_RETRY_COUNT`, `DEFAULT_TIMEOUT_MS` |
| ライフタイムパラメータ | 短い小文字 | `'a`, `'conn` |
| ジェネリクス型パラメータ | 大文字1文字 or 説明的な `UpperCamelCase` | `T`, `E`, `Item` |
| ファイル名 | `snake_case` | `user_service.rs`, `error.rs` |

- ブール型変数・メソッドは `is_` / `has_` / `can_` プレフィックスを付けよ（例: `is_active`, `has_permission`）
- コンストラクタは慣習的に `new()` または `from_*()` を使え
- 変換メソッドは `into_*()` / `to_*()` / `as_*()` の Rust 慣習に従え

---

## 5. エラーハンドリング

### `thiserror` vs `anyhow` の使い分け

| 用途 | クレート | 理由 |
|------|---------|------|
| ライブラリ・ドメインエラー（呼び出し元がパターンマッチする） | `thiserror` | エラー型を明示的に定義し、呼び出し元が個別対処できる |
| アプリケーションレベルの伝播（最終的にログ/レスポンスに変換） | `anyhow` | コンテキスト付き伝播が簡単、型定義不要 |

```rust
// DO: ドメインエラーは thiserror で定義せよ
#[derive(Debug, thiserror::Error)]
pub enum UserError {
    #[error("user not found: {id}")]
    NotFound { id: uuid::Uuid },
    #[error("email already exists")]
    DuplicateEmail,
    #[error("database error: {0}")]
    Database(#[from] sqlx::Error),
}

// DO: アプリ内伝播は ? 演算子でコンテキストを付けて伝播せよ
async fn find_user(id: Uuid) -> anyhow::Result<User> {
    let user = db.find_by_id(id).await.context("find_user: db query failed")?;
    Ok(user)
}
```

### エラー伝播方針

- `?` 演算子を積極的に使い、早期リターンで深いネストを避けよ
- `unwrap()` / `expect()` はテストコードと、パニックが設計上正当な場合のみ使え（本番コードでは原則禁止）
- エラーを握りつぶすな（`let _ = result;` で無視するな）。少なくとも `warn!` でログに残せ

### DO / DO NOT

| DO | DO NOT |
|----|--------|
| エラー型には `#[derive(Debug)]` を必ず付けよ | `Box<dyn std::error::Error>` をドメイン境界で使うな |
| 外部クレートエラーは `#[from]` で変換せよ | 複数箇所で同じ `map_err` 変換を繰り返すな |

---

## 6. 非同期（Tokio）

### ランタイム設定

```rust
// DO: main でマルチスレッドランタイムを明示的に指定せよ
#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // ...
}

// DO: ワーカースレッド数を環境変数で制御するには Builder を使え
// #[tokio::main(worker_threads = N)] はコンパイル時定数のみ受け付けるため環境変数は読めない
fn main() -> anyhow::Result<()> {
    let workers = std::env::var("WORKER_THREADS")
        .ok()
        .and_then(|v| v.parse().ok())
        .unwrap_or(num_cpus::get());
    tokio::runtime::Builder::new_multi_thread()
        .worker_threads(workers)
        .enable_all()
        .build()?
        .block_on(async_main())
}
```

### `async fn` 規約

| 規約 | 内容 |
|------|------|
| ブロッキング処理 | `tokio::task::spawn_blocking` でスレッドプールに委譲せよ |
| CPU バウンド処理 | `tokio::task::spawn_blocking` または Rayon を使え |
| タイムアウト | `tokio::time::timeout` でラップせよ |
| キャンセル安全性 | `select!` マクロを使う箇所では各 `Future` がキャンセル安全か確認せよ |

### DO / DO NOT

| DO | DO NOT |
|----|--------|
| `tokio::spawn` したタスクは `JoinHandle` を保持して完了を待て | `tokio::spawn` の戻り値を無視してタスクリークを起こすな |
| `Arc<Mutex<T>>` は必要最小限のクリティカルセクションに留めよ | `async` ブロック内で `std::sync::Mutex` のロックをまたいで `await` するな（マルチスレッドランタイムではコンパイルエラー、シングルスレッドランタイムではデッドロック）。代わりに `tokio::sync::Mutex` を使え |
| 非同期 I/O には `tokio::io` を使え | `std::fs`・`std::net` を async コンテキストで直接使うな |

---

## 7. HTTP サーバー（Axum）

### ルーター定義

```rust
// DO: ドメイン単位でルーターを分割し、Router::merge で結合せよ
pub fn user_router() -> Router<AppState> {
    Router::new()
        .route("/users", get(list_users).post(create_user))
        .route("/users/:id", get(get_user).put(update_user).delete(delete_user))
}

pub fn app_router(state: AppState) -> Router {
    Router::new()
        .merge(user_router())
        .merge(order_router())
        .layer(TraceLayer::new_for_http())
        .with_state(state)
}
```

### 状態管理

```rust
// DO: 共有状態は AppState に集約し、Clone 可能にせよ
#[derive(Clone)]
pub struct AppState {
    pub db: sqlx::PgPool,
    pub config: Arc<Config>,
}
```

### エラーレスポンス（RFC 7807 準拠）

HTTP API は [RFC 7807 Problem Details](https://www.rfc-editor.org/rfc/rfc7807) 準拠のレスポンスを返せ。

```rust
// DO: 共通エラーレスポンス型を定義して IntoResponse を実装せよ
#[derive(serde::Serialize)]
pub struct ProblemDetail {
    #[serde(rename = "type")]
    pub type_uri: String,
    pub title: String,
    pub status: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instance: Option<String>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let (status, problem) = match &self {
            AppError::NotFound(msg) => (
                StatusCode::NOT_FOUND,
                ProblemDetail {
                    type_uri: "https://YOUR_DOMAIN/problems/not-found".into(), // プロジェクトのドメインに置き換えること
                    title: "Resource Not Found".into(),
                    status: 404,
                    detail: Some(msg.clone()),
                    instance: None,
                },
            ),
            AppError::Validation(msg) => (
                StatusCode::BAD_REQUEST,
                ProblemDetail {
                    type_uri: "https://YOUR_DOMAIN/problems/validation-error".into(), // プロジェクトのドメインに置き換えること
                    title: "Validation Error".into(),
                    status: 400,
                    detail: Some(msg.clone()),
                    instance: None,
                },
            ),
            _ => (
                StatusCode::INTERNAL_SERVER_ERROR,
                ProblemDetail {
                    type_uri: "https://YOUR_DOMAIN/problems/internal-error".into(), // プロジェクトのドメインに置き換えること
                    title: "Internal Server Error".into(),
                    status: 500,
                    detail: None,
                    instance: None,
                },
            ),
        };
        (
            status,
            [(header::CONTENT_TYPE, "application/problem+json")],
            Json(problem),
        )
            .into_response()
    }
}
```

### エラー種別と HTTP ステータス

| エラー種別 | HTTP ステータス | 対応方針 |
|-----------|---------------|---------|
| バリデーションエラー | 400 / 422 | フィールド単位のエラー詳細を `detail` に含める |
| 認証エラー | 401 | セッション・トークン無効。再認証を促す |
| 認可エラー | 403 | リソースへのアクセス権なし。詳細は返さない |
| リソース不在 | 404 | 対象 ID をメッセージに含める |
| ビジネスルール違反 | 409 | 競合・制約違反の理由を `detail` に明記する |
| サーバーエラー | 500 | スタックトレースをクライアントに返さない。ログに記録する |

### DO / DO NOT

| DO | DO NOT |
|----|--------|
| `Content-Type: application/problem+json` を必ず付けよ | 各ハンドラーでバラバラにエラーレスポンスを組み立てるな |
| ハンドラーの戻り値型は `Result<impl IntoResponse, AppError>` に統一せよ | ハンドラー内で直接 `StatusCode` を返すな（エラー型変換を挟め） |

---

## 8. ロギング（Tracing）

### 基本方針

- `tracing` クレートを使って構造化ログを出力せよ
- 本番環境では `tracing-subscriber` で JSON 形式に設定せよ
- ログレベル: `error` / `warn` / `info` / `debug` / `trace`

### 初期化

`.json()` メソッドは `tracing-subscriber` の `json` feature が必要（デフォルト無効）。`Cargo.toml` に以下を追加せよ:

```toml
[dependencies]
tracing-subscriber = { version = "0.3", features = ["env-filter", "json"] }
```

```rust
// DO: main でトレーシングを初期化し、ログフォーマットは環境変数で切り替えよ
fn init_tracing() {
    let env_filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));

    tracing_subscriber::registry()
        .with(env_filter)
        .with(tracing_subscriber::fmt::layer().json())  // 本番: JSON（json feature 必須）
        .init();
}
```

### ログレベル定義

| レベル | 使用基準 | 例 |
|-------|---------|-----|
| `error!` | 予期しない例外・サービス停止相当 | DB 接続エラー、外部 API 呼び出し失敗 |
| `warn!` | 業務的に想定される異常・降格した処理 | レート制限到達、リトライ発生 |
| `info!` | 主要なビジネスイベント | ユーザー登録完了、注文作成 |
| `debug!` | 開発時の詳細トレース（本番は無効化） | 関数の入出力値 |
| `trace!` | 極細粒度のトレース（ライブラリ開発向け） | ループ内の逐次状態 |

### 必須ログコンテキスト

リクエスト起因のログには以下のフィールドを含めよ：

| フィールド | 説明 |
|-----------|------|
| `request_id` | トレーシング用 UUID（`x-request-id` ヘッダーから取得 or 生成） |
| `user_id` | 認証済みユーザーの ID（未認証は省略） |
| `path` | リクエストパス |
| `duration_ms` | レスポンスタイム（ms）|

```rust
// DO: tracing の span でリクエストスコープのコンテキストを付けよ
#[tracing::instrument(skip(state), fields(user_id = %user.id))]
async fn create_order(
    State(state): State<AppState>,
    Extension(user): Extension<AuthUser>,
    Json(payload): Json<CreateOrderRequest>,
) -> Result<impl IntoResponse, AppError> {
    // ...
}
```

### DO / DO NOT

| DO | DO NOT |
|----|--------|
| 構造化フィールドでコンテキストを付けよ（`tracing::info!(user_id = %id, "...")`） | フォーマット文字列にデータを埋め込むな（`format!` で文字列結合するな） |
| `#[tracing::instrument]` でスパンを自動付与せよ | 個人情報（メールアドレス・パスワード等）をログに出力するな |
| `axum::middleware::from_fn` でリクエストロギングを一元化せよ | 各ハンドラーで重複してリクエストログを出力するな |
