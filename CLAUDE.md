# CLAUDE.md
<!-- AI コーディングエージェント向け設定ファイル。概要・セットアップ等は README.md 参照 -->

<!-- aidd-fw:import-start -->
@aidd-framework/FRAMEWORK.md
<!-- aidd-fw:import-end -->

## プロジェクト概要

codex-dashboard は、MacBook 上で並行稼働する Codex セッションの稼働状態・入力待ち状態を一元把握するためのローカルダッシュボードです。

## プロジェクト固有の発見事項

<!-- AI が間違えたパターンを発見した都度、ここに追記する -->
<!-- 形式: - **[要点]**: [説明]（#Issue番号） -->
<!-- 汎用ルールは @aidd-framework/FRAMEWORK.md に記載済み。プロジェクト固有の発見事項のみここに追記する -->

<!-- uikit を使用する場合: 以下のコメントを解除すると AI がコンポーネント仕様を自動参照できる（/aidd-setup project で自動追記） -->
<!-- @node_modules/@spikestudio-jp/uikit/dist/llms.txt -->

<!-- codegraph セットアップ完了後に以下のコメントを解除する（/aidd-setup-codegraph が自動で解除） -->
<!-- ## コード探索規則
コード探索（依存関係・影響範囲・既存コード調査）は codegraph を使用する（ADR-032）。
grep / Read / Glob へのフォールバック禁止。

MCP 登録先: `.claude/settings.local.json`（/aidd-setup-codegraph が自動登録）

MANDATORY: 使用前に `codegraph_status` で状態確認し、Uninitialized なら `/aidd-setup-codegraph` で初期化してから使用する。

主要ツール（codegraph）:
- `codegraph_explore`: シンボル周辺の依存関係を一括取得
- `codegraph_impact`: 変更影響半径を分析
- `codegraph_callers` / `codegraph_callees`: 呼び出し元・呼び出し先の検出
-->

## ビルド・テストコマンド

```bash
# ビルド
# [コマンド]

# テスト
# [コマンド]

# リント
# [コマンド]
```
