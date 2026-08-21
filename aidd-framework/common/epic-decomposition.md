# Epic 分解基準

`/aidd-new-epic`（スコープ評価）と `/aidd-new-initiative`（Epic 群変換）が共有する分解基準。

SSOT: `docs/architecture/adr/ADR-033-initiative-hierarchy.md §Epic 分解仕様`（このファイルは ADR-033 の内容をスキルが直接参照できる形に転写したものである）

---

## 型定義

```
Story := {
  actor   : string   -- "As a [actor]"
  want    : string   -- "I want to [want]"
  so_that : string   -- "So that [so_that]"
  domain  : string   -- docs/glossary.md のセクション見出し
}

Epic := {
  stories : Story[]
  order?  : int      -- 漸進的分割時のみ付与（1始まり）
}
```

---

## 述語定義

```
domain_crossed(stories)  := stories に含まれる domain の種類 ≥ 2
goal_differs(stories)    := stories に含まれる so_that の種類 ≥ 2
oversized(stories)       := |stories| > 15

demo_standalone(stories) :=
  stories だけをデプロイした状態で
  stories の actor がすべての want を実行でき
  stories の so_that の価値をステークホルダーに示せる
```

---

## 不変条件（Invariants）

生成された `epics` はすべてを同時に満たす必要がある。ひとつでも違反したら分解をやり直す。

```
INV-1  ∀ e ∈ epics :  5 ≤ |e.stories| ≤ 15
INV-2  2 ≤ |epics| ≤ 7
INV-3  ⋃ e.stories = input_stories
INV-4  ∀ i≠j : epics[i].stories ∩ epics[j].stories = ∅
INV-5  ∀ e ∈ epics : demo_standalone(e.stories) = true
```

同一 domain かつ同一 so_that のグループを分割する場合（粒度分割）、追加で：

```
INV-6  epics に order(1, 2, …, n) が付与されている
INV-7  ∀ k ∈ 1…n : demo_standalone(⋃ epics[1..k].stories) = true
```

INV-7 の意味：epic を 1 本積むたびにデモができる状態を維持する。

---

## 分割規則（Rules）

条件に合致したら即座に適用する。各 group に全規則を再適用する（再帰）。

```
RULE domain
  TRIGGER  domain_crossed(stories)
  ACTION   group(stories, by: domain)

RULE goal
  TRIGGER  ¬domain_crossed(stories) ∧ goal_differs(stories)
  ACTION   group(stories, by: so_that)

RULE size
  TRIGGER  ¬domain_crossed(stories) ∧ ¬goal_differs(stories) ∧ oversized(stories)
  ACTION   find e[1] ⊆ stories such that:
             demo_standalone(e[1]) = true
             ∧ |e[1]| ≥ 5
             ∧ ¬∃ s ∈ e[1] : demo_standalone(e[1] \ {s}) = true  -- 最小セット
           assign e[1].order = 1
           remainder = stories \ e[1]
           apply RULE size to remainder with order = prev + 1
             constraint: ∀ k : demo_standalone(⋃ epics[1..k]) = true
```

---

## 事後確認（Postconditions）

```
CHECK  INV-1〜INV-5 を全 Epic に対して確認
CHECK  粒度分割が発生した場合は INV-6、INV-7 を確認
CHECK  |epics| = 1  → Initiative 不要。/aidd-new-epic を案内して終了
CHECK  |epics| ≥ 8  → INV-2 違反。RULE domain の domain 粒度を細かくして再適用
```

---

## 判断に迷ったときの帰着式

> `demo_standalone(stories) = true` を満たす最小セットが e[1]、それを引いた残りで同じ問いを繰り返す。

---

## スコープ評価（/aidd-new-epic Step 2.5 向け）

`/aidd-new-epic` が1件の Epic 要件案を受け取ったとき、以下の3条件を順次評価する。

### 条件 1: ドメイン境界違反（AC-F1489-01）

`docs/glossary.md` のセクション見出し（`## セクション名`）をドメイン分類として使用する。

1. 要件案に含まれる業務用語を抽出する
2. 各用語を `docs/glossary.md` のどのセクションに属するか照合する
3. 2つ以上の異なるセクションに属する用語が存在する場合: **ドメイン境界違反**として記録する

`docs/glossary.md` が存在しない・空の場合: 条件 1 = 非該当として扱い、条件 2・3 の評価を継続する。

### 条件 2: 独立ゴール混在（AC-F1489-02）

要件案から Story 候補を推論し、各 Story が達成するユーザーゴールを特定する。
異なるユーザーゴールを達成する独立したフローが2つ以上存在する場合: **独立ゴール混在**として記録する。

### 条件 3: スコープ超過（AC-F1489-03）

要件案から推定される規模指標を算出する。以下の閾値のいずれかを超えた場合: **スコープ超過**として記録する。

| 指標 | 閾値 | 根拠 |
|------|------|------|
| Feature 候補数 | > 7 件 | 7 × 2 週 = 14 週 ≈ 3.5 ヶ月（健全な Epic = 1〜3 ヶ月を超過）|
| Story 候補数 | > 15 件 | 業界通念（5〜15 が適正・monday.com）|
| 推定 AC 数 | > 40 件 | Story 15 件 × 平均 AC 3 件 の 88%ile |

### 評価結果とルーティング（AC-F1489-04 / AC-F1490-01）

| 結果 | アクション |
|------|----------|
| 1つ以上の条件が検出された | 検出条件と理由を提示し、`/aidd-new-initiative` の使用を推奨して処理を停止する |
| いずれの条件も非該当 | 「スコープ評価 — 分割不要」を出力し、管理単位作成（Issue + worktree）を実行してユーザー確認なしで Step 3 に進む |

**条件検出時のメッセージテンプレート:**

```
スコープ評価 — /aidd-new-initiative を推奨します

検出された条件:
- [ドメイン境界違反 / 独立ゴール混在 / スコープ超過（該当するものを列挙）]

理由: [検出条件の説明]

この要件は複数 Epic にまたがる大規模な取り組みです。
/aidd-new-initiative を使うと適切な粒度の Epic 群（2〜7 件）に変換し、
Initiative ブランチで安全に管理できます。

→ /aidd-new-initiative [取り組みの概要]
```
