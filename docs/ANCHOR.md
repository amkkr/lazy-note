# Anchor (個人史座標) 運用ドキュメント

Anchor は epic #487 で導入された「個人史座標」機能の総称。3 つの顔
(Coordinate / Resurface / Cast) と、それを支える節目データ
(`datasources/milestones.json`) からなる。

本ドキュメントは **撤退手順** を中心に Anchor の運用に必要な情報を集約する。
節目データ (`milestones.json`) の編集方法は
[`docs/MILESTONES.md`](./MILESTONES.md) に分離している。

## 3 つの顔と該当 Issue

| 顔             | 役割                                                                                     | 設計 Issue |
| -------------- | ---------------------------------------------------------------------------------------- | ---------- |
| **Coordinate** | 記事詳細の MetaInfo 直下に「{label} から N 日目」を一行で添える (層1=座標)               | #491       |
| **Resurface**  | HomePage の新着エリア下に独立スロットで過去記事を 1 件浮上させる                         | #492       |
| **Cast**       | `pnpm new-post` 実行時に生成される .md の本文直前に「今日の座標」HTML コメントを仕込む   | #490       |

土台は `src/lib/anchors.ts` の純粋関数群 (`computeCoordinates` /
`computeElapsed` / `inferPublishedAt`) と `Milestone` 型。詳しい設計は
各 Issue / epic #487 を参照する。

## 撤退可能性

Anchor 企画は **「いつでも黙らせられる」** ことを設計要件としている。
3 つの顔はそれぞれ独立に OFF にできる。

撤退の粒度は以下の 3 段階で考える。

1. **個別 OFF**: コンポーネント prop の `show` フラグを `false` に倒す
2. **データで黙らせる**: `milestones.json` を `[]` にする
3. **完全撤退**: 該当コンポーネントを使わない / 旧版に戻す

### 1. Coordinate の撤退手順

#### 個別 OFF (推奨)

`PostDetailPage` への `showCoordinate` prop を `false` にする。
親側で `show*` 変数を保持し、子の `show` prop へ橋渡しする命名規約に従っている。

該当箇所:
- `src/components/pages/PostDetailPage.tsx`: `showCoordinate` prop (既定 `true`)
- `src/components/common/Coordinate.tsx`: `show` prop (既定 `true`)

`show=false` のとき Coordinate 内部で `null` を返し、DOM に何も出ない。

#### データで黙らせる

`datasources/milestones.json` を `[]` にする。`computeCoordinates` の戻り値が
空配列となり、`displayable.length === 0` の early return で全記事の
Coordinate が消える。Resurface 側の「節目記念日」も同じ理由で発火しなくなる
点に注意する (沈黙トリガーと暦の節目は引き続き機能する)。

#### 完全撤退

`PostDetailPage.tsx` から Coordinate の JSX 呼び出しと import を削除すれば
記事詳細から Coordinate が消える。`pages/posts/Post.tsx` の
`milestones={MILESTONES}` 受け渡しも併せて整理してよい。

影響範囲:
- 記事詳細ページの MetaInfo 直下から「{label} から N 日目」が消える
- Cast (`scripts/newPost.ts`) と Resurface には影響しない (それぞれ
  `milestones.json` を直接参照しているため)

### 2. Resurface の撤退手順

Resurface は 3 つの選定経路 (沈黙トリガー / 暦の節目 / 座標上の意味 =
節目記念日) を `selectResurfaced` (`src/lib/resurface.ts`) でまとめて
扱う。撤退は粒度で選ぶ。

#### 個別 OFF (推奨、3 経路まとめて停止)

`HomePage` への `showResurface` prop を `false` にする。

該当箇所:
- `src/pages/index.tsx`: `<HomePage ... />` 呼び出し
- `src/components/pages/HomePage.tsx`: `showResurface` prop (既定 `true`)
- `src/components/common/Resurface.tsx`: `show` prop (既定 `true`)

`show=false` のとき Resurface 内部で `null` を返し、セクションごと DOM に出ない。

#### 経路ごとの停止

3 経路は `selectResurfaced` 内部で優先順位 (1) 沈黙トリガー (2) 暦の節目
(3) 節目記念日 の順に評価される。

- **節目記念日 (milestoneAnniversary) のみ止める**: `milestones.json` を `[]`
  にする。沈黙トリガーと暦の節目は引き続き機能する
- **沈黙トリガー (silence) のみ止める**: `selectResurfaced` の `silence`
  分岐を `null` に倒す改修が必要 (現状は単一フラグでの停止口は無い)
- **暦の節目 (calendar) のみ止める**: 同上

経路を細かく区別して止めたい運用が定常化した場合は、`selectResurfaced` 側に
個別 OFF オプションを足すことを別 Issue で検討する。

#### 完全撤退

`pages/index.tsx` から `selectResurfaced` の useMemo 計算と `resurfaceEntry`
prop の受け渡しを削除し、`HomePage.tsx` から Resurface の JSX 呼び出しと
import を削除する。

影響範囲:
- HomePage の新着エリア下の「過去の記事」セクションが消える
- Coordinate と Cast には影響しない

### 3. Cast の撤退手順

Cast は `pnpm new-post` 実行時にのみ動く (=記事生成時の付加情報)。**既存記事の
.md には Cast の火種コメントが入っていない**。仮に火種が入った .md があっても、
公開ページでは `sanitizePostHtml` (DOMPurify) が HTML コメントを除去するため、
読者の画面には現れない。

#### 個別 OFF (実装上の仕掛けは無い)

Cast に `show` フラグは無い。撤退するときは下記の「旧版に戻す」手順を使う。

#### 旧版に戻す

`scripts/newPost.ts` を旧版 (Anchor 導入前) の素朴な実装に戻す。
やり方は 2 択。

- **`git revert` で対象コミットを打ち消す**: PR #490 の `scripts/newPost.ts`
  への変更コミットを `git revert` する。`src/lib/anchors.ts` 等は他の顔
  (Coordinate / Resurface) も使うため revert 対象から外す
- **該当箇所のコメントアウト / 削除**: `createNewPost` 内の
  `ignitionComment` 構築ブロック (milestones ロード〜`buildIgnitionComment`
  呼び出し) を削り、`buildPostMarkdown` に空文字列を渡すよう書き換える

影響範囲:
- これ以降 `pnpm new-post` で生成される .md に火種コメントが入らなくなる
- **既存記事への影響は無い** (火種は HTML コメントとして .md に残るが、
  `sanitizePostHtml` で公開 DOM からは除去済み)
- Coordinate と Resurface には影響しない

## 関連ドキュメント

- [`docs/MILESTONES.md`](./MILESTONES.md): `milestones.json` のスキーマと
  `tone` の使い分け (`heavy` の登録動機を含む)
- epic #487: Anchor 全体の設計意図
- Issue #490 / #491 / #492: Cast / Coordinate / Resurface の設計・実装
- `src/lib/anchors.ts` の JSDoc: 層1=座標 / 層2=経過 の型定義と挙動仕様
