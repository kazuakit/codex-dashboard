# initiative-complete レビュー観点

`/aidd-review` が initiative-complete（Initiative 完了）と判定したときに読み込まれる観点集。

**判定したいこと:** Initiative 配下の全 Epic が完了し、main にマージできる状態か？

**観点数:** 4

> Epic 単位の品質（アーキテクチャ・コード品質・テスト・運用準備）は epic-complete レビューで既に検証済み。initiative-complete は **Initiative 全体としての完了確認と品質ゲート** のみを確認する。

---

## 共通出力フォーマット

MANDATORY: 各観点の Agent は以下フォーマットで結果を返すこと。フォーマット逸脱時は orchestrator が再要求する。

```markdown
## 観点 N レビュー結果: [観点名]

### Critical
- [問題タイトル]
  - 該当箇所: [ファイル名:行 / Issue 番号]
  - 理由: [なぜ問題か・観測根拠を 1〜2 行]
  - 修正方針: [具体的アクション]

### Suggestions
- [改善提案タイトル]
  - 該当箇所: [ファイル名:行]
  - 提案理由: [改善で得られる効果]

### OK Points
- [評価する点]

### Analysis Notes
- レビュー限界: [確認できなかった範囲]
- 不確実性: [前提条件・情報不足箇所]
```

DO NOT: 各セクションを省略する。該当なしの場合は「- なし」と明記。
DO NOT: 推測のみでの指摘（観測根拠を必ず添える）。

---

## 観点 1: 全 Epic 完了確認

**確認内容:** Initiative 配下の全 Epic Issue がクローズされ、epic-complete が監査ログに記録されているか。

**検証手順:**

```bash
# Initiative Issue 番号から配下の Epic Issue を取得
gh issue view [Initiative Issue番号] --json body -q '.body' | grep -E "^- \[x\] #[0-9]+"

# 全 Epic の epic-complete 記録確認
grep "epic-complete PASS" docs/audit/$(date +%Y-%m).md
```

**判定基準:**

| 状態 | 判定 |
|------|------|
| 全 Epic Issue がクローズ済み かつ 全 epic-complete が監査ログに記録されている | PASS |
| 未クローズの Epic Issue が 1 件以上ある | FAIL（Critical）|
| epic-complete の監査ログ記録が欠損している | FAIL（Critical）|

---

## 観点 2: 品質基準確認

**確認内容:** Initiative ブランチ上で lint・型チェックが通過しているか。

**検証手順:**

```bash
# Initiative ブランチ上で品質チェックを実行
task check
```

**判定基準:**

| 状態 | 判定 |
|------|------|
| `task check` が exit 0 | PASS |
| lint / 型チェックが失敗 | FAIL（Critical）|

---

## 観点 3: main マージ準備確認

**確認内容:** Initiative ブランチが main から大きく乖離していないか。コンフリクトリスクを確認する。

**検証手順:**

```bash
# Initiative ブランチと main の差分確認
git log --oneline origin/main..initiative/IN-[NNN]-[slug] | wc -l

# コンフリクトの dry-run
git merge-tree $(git merge-base HEAD origin/main) origin/main HEAD | grep -c "^<<<<<<" || echo "0"
```

**判定基準:**

| 状態 | 判定 |
|------|------|
| マージ dry-run でコンフリクトなし | PASS |
| コンフリクトが検出された | FAIL（Critical）— コンフリクト解消後に再実行 |
| Initiative ブランチが main に対して 500 コミット以上乖離 | Suggestions（rebase 推奨）|

---

## 観点 4: INV-7 漸進的拡張維持確認 — aidd-builder

<!-- AC-F1641-01 -->
<!-- AC-F1641-02 -->

**確認内容:** Initiative 配下の各 Epic を order 順に積み重ねたとき、各時点で `demo_standalone(⋃ epics[1..k]) = true` が成立しているか（INV-7）。

**評価基準（FRAMEWORK.md §漸進的拡張原則）:**

`demo_standalone(stories) := stories だけをデプロイした状態で、stories の actor が全 want を実行でき、so_that の価値をステークホルダーに示せること`

**検証手順:**

1. Initiative Issue 本文のタスクリストから配下の Epic 一覧を取得する
2. 各 Epic の order（漸進的分割が行われた場合）を `docs/initiatives/[N]-context.md §Epic 群` テーブルで確認する
3. 各 k（order 1, 2, …, n）について、`epics[1..k]` の Epic 群の Stories を累積してデモ可能状態を評価する:
   - `epics[1..k]` の Epic 群だけで、ユーザーが主要な want を実行できるか
   - `so_that` の価値をステークホルダーに示せるか

**INV-7 チェック対象の判定:**

| 条件 | 対象 |
|------|------|
| Initiative の Epic 群が RULE size（粒度分割）で生成された（order 列が存在する） | INV-7 チェック必須 |
| RULE domain または RULE goal で生成された（order 列なし） | INV-7 チェックはベストエフォート（各 Epic が独立デモ可能かを確認） |

**判定基準:**

| 状態 | 判定 |
|------|------|
| 全 k で demo_standalone(⋃ epics[1..k]) が成立する | PASS（OK Point に記録）|
| ある k で demo_standalone(⋃ epics[1..k]) が成立しない | FAIL（Critical: 「Epic #[k]：INV-7 違反（理由：[根拠]）」）|

### 重要度判定基準

- **Critical**: ある k において demo_standalone(⋃ epics[1..k]) が成立しない（Epic k 完了時点でデモできない）
- **Suggestion**: なし
- **OK Point**: 全 k で INV-7 が成立している

---

## initiative-complete PASS 後の処理

```bash
# main に Squash merge
git push origin initiative/IN-[NNN]-[slug]
gh pr merge --squash --delete-branch

# Initiative Issue をクローズ
gh issue close [Initiative Issue番号]

# 監査ログ記録
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] GATE initiative-complete PASS — Initiative #[N]" >> docs/audit/$(date +%Y-%m).md
```
