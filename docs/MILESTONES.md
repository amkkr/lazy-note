# milestones.json の編集方法

`datasources/milestones.json` は Anchor (epic #487) の起点になる節目データ。
publishedAt との日数差が Cast の火種 / Resurface の節目記念日で利用される。

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

正本の型は `src/lib/anchors.ts` の `Milestone`。tone の意味と表示挙動
(とくに `heavy` を Coordinate 表示に出さない方針) は同ファイル JSDoc を参照する。

## 追加と撤退

epic #487 の方針として「節目は最低限」が前提。複数記事で参照している節目で、
`YYYY-MM-DD` で日付が特定できるものに絞る。

不要になったら配列から削除する。中身を `[]` にしても、Resurface の沈黙トリガーと
暦の節目は引き続き機能する。
