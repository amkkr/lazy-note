# milestones.json の編集方法

`datasources/milestones.json` は Anchor (epic #487) の起点になる節目データ。
publishedAt との日数差が Coordinate (層1=座標) / Resurface (節目記念日) /
Cast (火種) の各経路で利用される。

Anchor 全体の運用 (Coordinate / Resurface / Cast の OFF 手順を含む) は
[`docs/ANCHOR.md`](./ANCHOR.md) を参照する。本ドキュメントは
**節目の追加・編集** に絞って記載する。

## スキーマ

```json
[
  {
    "date": "YYYY-MM-DD",
    "label": "節目の名前",
    "tone": "neutral" | "light" | "heavy"
  }
]
```

正本の型は `src/lib/anchors.ts` の `Milestone` インターフェース。値の
ランタイム検証は最小限で、不正な要素は `loadMilestones`
(`scripts/newPost.ts`) や `toMilestoneCalendarDate` (`src/lib/anchors.ts`)
で除外される。

### フィールド

- **`date`**: `YYYY-MM-DD` (JST 想定)。形式違反の要素はサイレントに除外される
- **`label`**: 表示用ラベル (例: `"社会復帰"`、`"サイト開設"`)
- **`tone`**: 表示時の扱いを切り替える感情タグ。次節で詳述する

## `tone` の使い分け

`tone` は表示挙動を分岐させるための感情タグであり、3 値のみ受理する。
正本は `src/lib/anchors.ts` の `MilestoneTone` 型と各コンポーネント実装。

| `tone`    | 意味                       | Coordinate (記事詳細「{label} から N 日目」) | Resurface (節目記念日) | Cast (.md 火種コメント) |
| --------- | -------------------------- | -------------------------------------------- | ---------------------- | ----------------------- |
| `neutral` | 中立な事実 (例: サイト開設) | 表示する                                     | 表示する               | 表示する                |
| `light`   | 軽めの節目 (例: 復帰)       | 表示する                                     | 表示する               | 表示する (`[軽め]` 補助マーク付き) |
| `heavy`   | 重い節目 (例: 喪失体験)    | **表示しない** (静かに隠す)                  | 表示する               | 表示する (`[重い節目]` 補助マーク付き) |

### `heavy` の登録動機

`heavy` は **「Coordinate に表示せず、しかし他経路では生かす」** ための
分類である。次の 2 つを同時に成立させたいときに使う。

1. **Coordinate (記事詳細の一行) には出したくない**:
   重い節目を「{label} から N 日目」として常時表示すると、関係のない記事を
   読みに来た読者にも繰り返し提示してしまう。Coordinate は `tone !== "heavy"`
   でフィルタする (`src/components/common/Coordinate.tsx` の `displayable`)。
2. **Resurface / Cast には残したい**:
   重い節目を起点に書いた古い記事を、節目記念日に静かに浮上させる
   (Resurface) ことや、執筆時に座標として自覚する (Cast 火種コメント) こと
   そのものは、Anchor 機能の本来の意図と矛盾しない。

つまり `heavy` は「座標として書かないが、記録としては残す」運用を表す。
**最初から登録しない** のと **`heavy` で登録する** のは、Resurface 経由で
過去記事を浮上させるかどうかで差が出る。

## 追加・削除

epic #487 の方針として「節目は最低限」が前提。複数記事で参照している節目で、
`YYYY-MM-DD` で日付が特定できるものに絞る。

不要になった節目は配列から削除すればよい。配列を `[]` にしても、
Resurface の沈黙トリガーと暦の節目は引き続き機能する (節目記念日のみが
発火しなくなる)。
