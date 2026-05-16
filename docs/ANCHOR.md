# Anchor (個人史座標) 運用ドキュメント

> **最終更新**: 2026-05-16 / Phase 3 of Anchor (Issue #494) 時点
> **想定読者**: Anchor を運用する **運営者本人**、および将来 Anchor 関連
> コードを変更するコントリビュータ

Anchor は epic #487 で導入された「個人史座標」機能の総称。3 つの顔
(Coordinate / Resurface / Cast) と、運用画面の補助ページ AnchorPage
(`/anchor`)、そしてそれら全体を支える節目データ
(`datasources/milestones.json`) からなる。

本ドキュメントは **撤退手順** を中心に Anchor の運用に必要な情報を集約する。
節目データ (`milestones.json`) の編集方法は
[`docs/MILESTONES.md`](./MILESTONES.md) に分離している。

## 3 つの顔 + 補助の運用ページ

「3 つの顔」(Coordinate / Resurface / Cast) が読者・運営者の通常導線で
動く本体機能。AnchorPage (`/anchor`) は別軸の「運用画面」として独立に
位置付ける (= 3 つの顔の一つではない)。

### 3 つの顔と該当 Issue

| 顔             | 役割 (一言)                  | 設計 Issue |
| -------------- | ---------------------------- | ---------- |
| **Coordinate** | 記事詳細に「N 日目」を添える | #491       |
| **Resurface**  | 過去記事を 1 件浮上させる    | #492       |
| **Cast**       | .md に火種コメントを仕込む   | #490       |

各「顔」の役割の詳述:

- **Coordinate (層1=座標)**: 記事詳細の MetaInfo 直下に
  「{label} から N 日目」を一行で添える経路。記事を読む読者に
  個人史座標を静かに提示する
- **Resurface**: HomePage の新着エリア下に独立スロットを設け、
  過去記事を 1 件浮上させる経路。3 経路 (沈黙トリガー / 暦の節目 /
  節目記念日) を `selectResurfaced` でまとめて扱う
- **Cast**: `pnpm new-post` 実行時に生成される .md の本文直前に
  「今日の座標」HTML コメントを仕込む経路。読者画面では
  `sanitizePostHtml` により除去され、運営者向けメモとして機能する

土台は `src/lib/anchors.ts` の純粋関数群 (`computeCoordinates` /
`computeElapsed` / `inferPublishedAt`) と `Milestone` 型。詳しい設計は
各 Issue / epic #487 を参照する。

### 個人史タイムライン (`/anchor` ページ) — Issue #493

`/anchor` 配下に置かれた運用画面用のページ。
`src/pages/anchor.tsx` から `src/components/pages/AnchorPage.tsx` を
呼び出して描画する。3 つの顔とは独立した、運営者向けの可視化面。

- **節目を全件 (`heavy` を含む) 一覧表示する**: Coordinate / Resurface とは
  異なるポリシー。運用画面として「いま何が登録されているか」を透明に
  確認できることを優先する。詳細は次節「`heavy` 表示ポリシー」を参照。
- **各記事ごとの座標 (Coordinate と同じ「{label} から N 日目」) を素朴に
  並べる**: 「過剰な可視化 (グラフ / 統計) は出さない」Pulse 思想を継承
  (詳細は `AnchorPage.tsx` の JSDoc を参照)。
- **入力データ**: `pages/anchor.tsx` で `datasources/milestones.json` を
  JSON import して `AnchorPage` に渡す。`pages/index.tsx` /
  `pages/posts/Post.tsx` と同じ参照経路。

#### `heavy` 表示ポリシー (Issue #545)

`/anchor` ページは **公開 URL** (認証なし) で誰でも閲覧可能だが、
`tone === "heavy"` の節目 (例: 休職開始 / 喪失体験) を **意図的に隠さず
全件表示する**。これは Coordinate (#491) / Resurface (#492) の「heavy
は静かに隠す」ポリシーとは **逆方向の意図的な選択** であり、本ドキュメントで
ポリシーとして明文化する。

**3 つの面の比較**:

| 面                 | `heavy` の扱い                  | 設計意図                                       |
| ------------------ | ------------------------------- | ---------------------------------------------- |
| Coordinate (#491)  | 表示しない (静かに隠す)         | 記事を読みに来た読者に重い節目を繰り返さない   |
| Resurface (#492)   | 表示しない (節目記念日経路のみ) | 過去の重い節目を「記念日」として浮上させない   |
| **AnchorPage**     | **表示する (全件)**             | 運用画面の透明性を優先 (本節で詳述)            |

**判断根拠**:

1. **公開リポジトリで既に公開済み**: `datasources/milestones.json` は本リポジトリ
   (公開 GitHub リポジトリ) で管理されており、`git log` / `git blame` を経由して
   既に誰でも参照可能。AnchorPage で隠したところで機密性は獲得できない
   (= 隠す側の効果が薄い)。
2. **運用画面の透明性を優先**: `/anchor` は「3 つの顔」とは独立した **運営者
   向けの可視化面** (= 何が登録されているか確認する場) として位置付けられる。
   ここで heavy を非表示にすると、運営者が「いま heavy が何件登録されている
   か」を別経路 (.json を直接開く等) で確認する必要が出てしまい、運用画面の
   存在意義 (= 一覧性) が失われる。
3. **読者導線の主面ではない**: 読者が日常的に踏む導線は HomePage / 記事詳細
   ページであり、`/anchor` は能動的に URL を踏まないと到達しない補助ページ。
   読者保護の主戦場は Coordinate / Resurface 側であり、そちらでは heavy を
   引き続き隠す (二段構えの設計)。

したがって AnchorPage は「3 つの面のうち、heavy を全件出す唯一の面」となる。
この非対称性は **意図的** で、Coordinate / Resurface との一貫性違反では
ない。

**撤退戦略 (運営者が将来 heavy を /anchor から隠したくなった場合)**:

ポリシー変更が必要になった場合、以下のいずれかを採用する。粒度の小さい順:

1. **個別 heavy 節目の `milestones.json` からの削除 (最小粒度)**:
   特定の `tone === "heavy"` 節目だけが懸念であれば、その節目自体を
   `datasources/milestones.json` から削除する。/anchor の節目一覧から消える
   と同時に、Cast 火種コメント / Resurface 節目記念日 (heavy 除外なので
   元から発火していない) / Coordinate (元から非表示) からも消える。
   **影響範囲が広い** (= Anchor の他の面にも波及する) ため、heavy を Cast
   火種で残したい場合は次の案を検討する。
2. **`milestones.json` の `tone` 体系から `heavy` を全廃 (運用ルール変更)**:
   今後 heavy フラグそのものを使わない運用に切り替える。既存 heavy 節目は
   `light` / `neutral` に降格するか、削除する。/anchor で出したくない節目を
   そもそも登録しない運用にすれば、表示の出し分けロジックは不要のまま
   AnchorPage のコード変更なしで完結する。コード変更が不要な点が利点。
3. **AnchorPage に表示制御 prop / クエリパラメータを追加 (将来案)**:
   `AnchorPage` に `showHeavy?: boolean` prop を追加し、デフォルト `true`
   (= 現状維持) で、呼び出し側 (`pages/anchor.tsx`) または URL クエリ
   (`/anchor?showHeavy=false`) で `false` に倒せるようにする。実装規模は
   Coordinate / Resurface の `show` prop と同等。「heavy を持つ運用は続け
   たいが、URL を共有するときだけ隠したい」というユースケースが出てきた
   場合の選択肢。**現時点では実装しない** (= YAGNI)。必要性が出た時点で
   新 Issue を切る。

なお、`milestones.json` 自体を空 (`[]`) にする全体撤退は本ドキュメント
直下の「[撤退方法 (運用画面の停止)](#撤退方法-運用画面の停止)」で扱う
(= heavy 単独の撤退戦略ではない)。

#### 撤退方法 (運用画面の停止)

AnchorPage には個別 OFF の prop / フラグは無い。停止したい場合は以下のいずれか:

- **ルーティングからリンクを外す**: ヘッダー / フッターなどから
  `/anchor` への遷移リンクを削除する (=ページ自体は残るが導線が無くなる)
- **ページ自体の削除 (完全撤退)**: `src/pages/anchor.tsx` と
  `src/components/pages/AnchorPage.tsx` を削除する (関連テスト
  `src/components/pages/__tests__/AnchorPage.test.tsx` /
  `AnchorPage.allPosts.test.tsx` も併せて削除)
- **データで黙らせる (節目一覧のみ空状態)**: `milestones.json` を `[]` に
  すると AnchorPage の「節目一覧」セクションが「まだ節目が記録されていません」
  の空状態になる。各記事の座標一覧は記事自体は残るので、座標が 0 件と
  なるだけで section は空状態テキスト付きで残る

影響範囲:
- AnchorPage を消しても 3 つの顔 (Coordinate / Resurface / Cast) には
  影響しない (それぞれ独自に `milestones.json` を参照する)
- 逆に 3 つの顔のどれを OFF にしても AnchorPage には影響しない

## 撤退可能性

Anchor 企画は **「いつでも黙らせられる」** ことを設計要件としている。
3 つの顔はそれぞれ独立に OFF にできる。

撤退の粒度は以下の 3 段階で考える (ただし Cast には個別 OFF 段階が存在
しないため、Cast は構造上 2 段階 = データで黙らせる / 完全撤退 のみ)。

1. **個別 OFF**: コンポーネント prop の `show` フラグを `false` に倒す
   (**Coordinate / Resurface のみ**。Cast には `show` フラグが無いため
   この段階は適用外)
2. **データで黙らせる**: `milestones.json` を `[]` にする
3. **完全撤退**: 該当コンポーネントを使わない / 旧版に戻す

### 1. Coordinate の撤退手順

#### 個別 OFF (推奨)

呼び出し側 (`src/pages/posts/Post.tsx`) で `<PostDetailPage>` に
`showCoordinate={false}` を **追加する**。`PostDetailPage` 内部で
`showCoordinate` の値が `<Coordinate show={...} />` の `show` prop に
橋渡しされる命名規約に従っている。

**現状はデフォルト `true`** で運用しているため、`Post.tsx` から
`showCoordinate` prop を渡していない (= デフォルトの true が効く)。
OFF にしたい場合は **明示的に prop を追記する** 必要がある (既存の true
を反転するのではなく、新しい prop の追加)。

該当箇所:
- `src/pages/posts/Post.tsx`: `<PostDetailPage>` の呼び出し
  (現状 `showCoordinate` prop は未指定)
- `src/components/pages/PostDetailPage.tsx`: `showCoordinate` prop (既定 `true`)
- `src/components/common/Coordinate.tsx`: `show` prop (既定 `true`)

`show=false` のとき Coordinate 内部で `null` を返し、DOM に何も出ない。

#### データで黙らせる

`datasources/milestones.json` を `[]` にする。`computeCoordinates` の戻り値が
空配列となり、表示対象 0 件の early return で全記事の Coordinate が消える
(`src/components/common/Coordinate.tsx`)。Resurface 側の「節目記念日」も
同じ理由で発火しなくなる点に注意する (沈黙トリガーと暦の節目は引き続き
機能する)。

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

呼び出し側 (`src/pages/index.tsx`) で `<HomePage>` に
`showResurface={false}` を **追加する**。

**現状はデフォルト `true`** で運用しているため、`index.tsx` から
`showResurface` prop を渡していない (= デフォルトの true が効く)。
OFF にしたい場合は **明示的に prop を追記する** 必要がある (既存の true
を反転するのではなく、新しい prop の追加)。

該当箇所:
- `src/pages/index.tsx`: `<HomePage ... />` 呼び出し
  (現状 `showResurface` prop は未指定)
- `src/components/pages/HomePage.tsx`: `showResurface` prop (既定 `true`)
- `src/components/common/Resurface.tsx`: `show` prop (既定 `true`)

`show=false` のとき Resurface 内部で `null` を返し、セクションごと DOM に出ない。

なお Resurface は HomePage 側で `currentPage === 1` のとき限定で描画される
(`src/components/pages/HomePage.tsx`)。Featured と同じく「全期間の意味付け」
を 1 ページ目に限定する設計なので、ページ移動時に Resurface が見えない
のは仕様 (= 不具合ではない)。

#### 経路ごとの停止

3 経路は `selectResurfaced` 内部で優先順位 (1) 沈黙トリガー (2) 暦の節目
(3) 節目記念日 の順に評価される。

- **節目記念日 (milestoneAnniversary) のみ止める**: `milestones.json` を `[]`
  にする。沈黙トリガーと暦の節目は引き続き機能する
- **沈黙トリガー (silence) のみ止める**: 現状は経路ごとの個別 OFF オプションが
  無い。一時的に止めたい場合は次のいずれかを使う:
  - (a) `src/lib/resurface.ts` の `selectResurfaced` 内、該当分岐
    (`if (isSilence) { ... }` ブロック) を一時的にコメントアウトする
  - (b) 全体 OFF (`showResurface={false}`) で代用する (3 経路まとめて停止)
  - (c) 経路指定の停止オプションが定常化する場合は、新 Issue で
    `selectResurfaced` の `options` 拡張 (例: `disableSilence?: boolean`) を
    検討する
- **暦の節目 (calendar) のみ止める**: 同上 (該当する `pickSameMonthDay` の
  分岐をコメントアウト / 全体 OFF / 別 Issue 化)

#### 完全撤退

`pages/index.tsx` から `selectResurfaced` の useMemo 計算と `resurfaceEntry`
prop の受け渡しを削除し、`HomePage.tsx` から Resurface の JSX 呼び出しと
import を削除する。

影響範囲:
- HomePage の新着エリア下の「過去の記事」セクションが消える
  (Resurface は HomePage 側で `currentPage === 1` のとき限定で描画される
  ため、もともと 2 ページ目以降には出ていない)
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
やり方は **「該当箇所のコメントアウト / 削除」が第一手** で、`git revert` は
補助情報。

- **該当箇所のコメントアウト / 削除 (推奨)**: `createNewPost` 内の
  `ignitionComment` 構築ブロック (milestones ロード〜`buildIgnitionComment`
  呼び出し〜`formatMilestonesSummary` の stdout 出力) を削り、
  `buildPostMarkdown` に空文字列を渡すよう書き換える。`scripts/newPost.ts` の
  純粋関数群 (`buildIgnitionComment` / `loadMilestones` 等の export) はそのまま
  残してよい (他から import されておらず、削除と同等の効果)
- **`git revert` で対象コミットを打ち消す (補助)**: PR #490 は
  `scripts/newPost.ts` を導入したコミット群 (複数の可能性あり) を含む。
  打ち消し対象を特定するには事前に
  `git log --follow scripts/newPost.ts` で該当コミットを洗い出すこと。
  `src/lib/anchors.ts` 等は他の顔 (Coordinate / Resurface) も使うため
  revert 対象から外す

影響範囲:
- これ以降 `pnpm new-post` で生成される .md に火種コメントが入らなくなる
- **`pnpm new-post` 実行時の stdout に出る節目サマリ** (📍 現在登録されて
  いる節目... の行) **も消える** (`formatMilestonesSummary` の出力ごと
  落ちる)
- **既存記事への影響は無い** (火種は HTML コメントとして .md に残るが、
  `sanitizePostHtml` で公開 DOM からは除去済み)
- Coordinate と Resurface には影響しない

## 関連ドキュメント

- [`docs/MILESTONES.md`](./MILESTONES.md): `milestones.json` のスキーマと
  `tone` の使い分け (`heavy` の登録動機を含む)
- epic #487: Anchor 全体の設計意図
- Issue #490 / #491 / #492: Cast / Coordinate / Resurface の設計・実装
- Issue #493: AnchorPage (`/anchor` ページ / 個人史タイムライン) の設計・実装
- `src/lib/anchors.ts` の JSDoc: 層1=座標 / 層2=経過 の型定義と挙動仕様
