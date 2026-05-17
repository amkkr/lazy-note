# milestones.json の編集方法

> **最終更新**: 2026-05-16 / Phase 3 of Anchor (Issue #494) 時点
> **想定読者**: Anchor を運用する **運営者本人**、および将来 Anchor 関連の
> コード / 節目データを変更するコントリビュータ

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

**経路ごとの除外動作 (重要)**:

`milestones.json` を読む経路は 2 系統あり、不正値の扱いが非対称である。

- **Cast (`scripts/newPost.ts` の `loadMilestones`)**: 日付形式違反 / `tone`
  不正値 / 型不正のエントリを **全て除外する** (3 値外の `tone` を弾く)
- **Coordinate / Resurface (`pages/index.tsx` / `pages/posts/Post.tsx` から
  JSON import + 型キャスト)**: 型キャスト (`as readonly Milestone[]`) で
  読み込むため **`tone` 不正値はランタイム検出されない**。日付形式違反のみ
  `toMilestoneCalendarDate` が捨てる

したがって運営者が `tone` を `"medium"` 等の 3 値外の値で誤登録すると、
Cast には出ないが Coordinate には「`heavy` ではない」扱いで出てしまう
(= 沈黙トリガーの誤発火や、座標一行への誤表示につながる)。
**`tone` は必ず 3 値 (`neutral` / `light` / `heavy`) 内で書くこと。**

## `tone` の使い分け

`tone` は表示挙動を分岐させるための感情タグであり、3 値のみ受理する。
正本は `src/lib/anchors.ts` の `MilestoneTone` 型と各コンポーネント実装。

| `tone`    | 意味                        | Coordinate (記事詳細「{label} から N 日目」) | Resurface (節目記念日) | Cast (.md 火種コメント)                       |
| --------- | --------------------------- | -------------------------------------------- | ---------------------- | --------------------------------------------- |
| `neutral` | 中立な事実 (例: サイト開設) | 表示する                                     | 表示する               | 表示する (素のラベルのみ)                     |
| `light`   | 軽めの節目 (例: 復帰)       | 表示する                                     | 表示する               | 表示する (素のラベルのみ)                     |
| `heavy`   | 重い節目 (例: 喪失体験)     | **表示しない** (静かに隠す)                  | **表示しない** (Coordinate と同じく `heavy` 除外) | 表示する (`[重い節目]` 補助マーク付き) |

列の意味と補足:

- **Coordinate**: 記事詳細の MetaInfo 直下に「{label} から N 日目」を一行で添える経路。
  `heavy` は「静かに隠す」ため `src/components/common/Coordinate.tsx` で除外する
- **Resurface (節目記念日)**: 節目記念日経路のみ `heavy` を除外する
  (沈黙トリガー / 暦の節目は `milestones.json` を参照しないので影響なし。
  詳細は本ドキュメント末尾の「Resurface の `heavy` 除外スコープ」節を参照)
- **Cast (.md 火種コメント)**: `pnpm new-post` 実行時に .md 本文直前へ仕込む
  HTML コメント。`heavy` は `[重い節目]` の補助マーク付きで残る
  (詳細は次節「補助マークの注意」を参照)

**補助マークの注意**:

- 上表の「Cast」列にある補助マーク (`[重い節目]`) は **`.md` 火種コメント** に
  入る文字列のことで、`scripts/newPost.ts` の `buildIgnitionComment` が
  `coord.tone === "heavy"` のときだけ付加する (`light` / `neutral` は素のラベル)。
- 一方、`pnpm new-post` 実行時の **stdout サマリ** (📍 現在登録されている節目...
  の行) は別経路 (`formatMilestonesSummary`) で、こちらは `light` に `[軽め]` /
  `heavy` に `[重い節目]` の 2 種類のマークが付く。同じ「マーク表示」でも出力先と
  ルールが違うため混同しないこと。

**Resurface の `heavy` 除外スコープ (重要)**:

- Resurface には 3 経路 (沈黙トリガー / 暦の節目 / 節目記念日) があり、
  `tone === "heavy"` の除外が効くのは **節目記念日経路のみ**
  (`src/lib/resurface.ts` の `matchMilestoneAnniversary` 冒頭で除外)。
- 沈黙トリガー / 暦の節目は `milestones.json` を **全く参照しない** ため、
  `tone` の影響を受けない (したがって `heavy` 節目を起点に書かれた古い記事が
  沈黙トリガー / 暦の節目経由で浮上することはあり得る。これは節目 `tone` とは
  無関係な、記事日付ベースの選定である)。

### `heavy` の登録動機

`heavy` は **「Coordinate / Resurface 節目記念日には表示せず、しかし Cast
(.md 火種コメント) には残す」** ための分類である。次の 2 つを同時に成立させ
たいときに使う。

1. **Coordinate (記事詳細の一行) には出したくない**:
   重い節目を「{label} から N 日目」として常時表示すると、関係のない記事を
   読みに来た読者にも繰り返し提示してしまう。Coordinate は
   `src/components/common/Coordinate.tsx` 内で `tone === "heavy"` の節目を
   除外している。
2. **Cast (.md 火種コメント) には残したい**:
   執筆時に運営者自身が座標として自覚すること (Cast 火種コメント) は、
   Anchor 機能の本来の意図と矛盾しない。Cast 経路では `[重い節目]` の補助
   マーク付きで残る。

なお Resurface の節目記念日経路は `heavy` を除外するため、「重い節目記念日に
過去記事を静かに浮上させる」という挙動は起きない。`heavy` を **最初から
登録しない** のと **`heavy` で登録する** のは、主に Cast 火種コメント (.md
内の運営者向けメモ) に出るかどうかと、AnchorPage (`/anchor` ページ) の節目
一覧に並ぶかどうかで差が出る (AnchorPage は `heavy` も含めて全件表示する。
このポリシーの判断根拠と撤退戦略は
[`docs/ANCHOR.md` の「`heavy` 表示ポリシー (Issue #545)」](./ANCHOR.md#heavy-表示ポリシー-issue-545)
を参照)。

## 追加・削除

epic #487 の方針として「節目は最低限」が前提。複数記事で参照している節目で、
`YYYY-MM-DD` で日付が特定できるものに絞る。

不要になった節目は配列から削除すればよい。配列を `[]` にしても、
Resurface の沈黙トリガーと暦の節目は引き続き機能する (節目記念日のみが
発火しなくなる)。

## 関連ドキュメント

- [`docs/ANCHOR.md`](./ANCHOR.md): Anchor 全体 (Coordinate / Resurface /
  Cast / AnchorPage) の運用と撤退手順
- [`docs/MARKDOWN_LINT.md`](./MARKDOWN_LINT.md): 本ドキュメント内の `tone`
  使い分け表 (`| --- |` を含む) の手動整形運用と drift 検知手順
