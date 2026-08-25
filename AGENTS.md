<!-- aidd-fw:managed-start -->

# AGENTS.md
<!-- Codex / Open Agent Skills 向け設定ファイル。概要・セットアップ等は README.md 参照 -->

## フレームワーク本体

MANDATORY: セッション開始時に `aidd-framework/FRAMEWORK.md` を必ず読み、そのルールを最優先で適用する。
`aidd-framework/` 配下はフレームワーク本体であり、フレームワーク更新時に最新版で上書きされる。プロジェクト固有の変更を加えてはならない。

<!-- aidd-fw:managed-end -->

## プロジェクト概要

codex-dashboard は、MacBook 上で並行稼働する Codex セッションの稼働状態・入力待ち状態を一元把握するためのローカルダッシュボードです。

## プロジェクト固有の発見事項

<!-- AI が間違えたパターンを発見した都度、ここに追記する -->
<!-- 形式: - **[要点]**: [説明]（#Issue番号） -->

## ビルド・テストコマンド

```bash
# ビルド
# [コマンド]

# テスト
# [コマンド]

# リント
# [コマンド]
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
