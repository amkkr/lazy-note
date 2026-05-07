# 04. レイアウト

## 設計方針

- ホームは「**Editorial Bento**」── 雑誌の表紙的に Featured + 2x2 + Index を組む
- 記事詳細は **本文 36rem 固定** + Sticky TOC で、長時間の読み物に耐える
- 全レイアウトは **mobile first**、ブレークポイント 3 段階 (< 960 / 1024〜1279 / ≥ 1280)
- 追従要素は **scroll position guard** を必ず実装し、開閉でジャンプしない

## グリッド & ブレークポイント

| トークン名     | 値                | 用途                              |
| -------------- | ----------------- | --------------------------------- |
| `bp.sm`        | `768px`           | mobile 上端                       |
| `bp.md`        | `960px`           | TOC Disclosure 切替境界           |
| `bp.lg`        | `1024px`          | TOC sticky 開始                   |
| `bp.xl`        | `1280px`          | TOC 200px / Bento full layout 閾値 |
| `content.max`  | `36rem`           | **本文最大幅**                    |
| `page.max`     | `1200px`          | ページ全体最大幅                  |
| `gutter`       | `clamp(1rem, 4vw, 2rem)` | 左右余白                  |

## ホーム: Editorial Bento

### コンセプト

- 訪問者が **5 秒で** 「ここはどんなブログか」を掴めること
- 雑誌の表紙のように **タイル数を絞り**、情報密度を抑える (Calm)

### グリッド

```
+--------------------------------+
|                                |
|     Featured (span 6)          |  ← 最新 or 編集者推薦 1 件
|     (大型カード、Persimmon枠)  |
|                                |
+----------------+----------------+
|  Bento (sp 3)  |  Bento (sp 3)  |
+----------------+----------------+
|  Bento (sp 3)  |  Bento (sp 3)  |
+----------------+----------------+
|                                |
|     Index (span 6)             |  ← それ以前のアーカイブ
|     (テキストリスト・年別)     |
|                                |
+--------------------------------+
```

| 領域       | desktop (≥1280)  | tablet (960〜1279) | mobile (<960)         |
| ---------- | ---------------- | ------------------- | --------------------- |
| Featured   | span 6 (= 全幅)  | 全幅                | 全幅 (高さ縮)         |
| Bento 2x2  | 2 × 2 = 4 タイル | 2 × 2 = 4 タイル    | 1 列縦並び 4 タイル   |
| Index      | 全幅、2 カラム   | 全幅、1 カラム      | 全幅、1 カラム        |

### 不足時の挙動

- 記事数が 5 件未満で Bento 4 タイル枠を埋められない場合 → **placeholder タイル** を生成
  - placeholder は半透明グレースケールでメッセージ「次の記事をお待ちください」を表示
  - クリック領域なし、aria-hidden で SR からも除外
- Featured 候補が無い (全記事 archived) 場合 → Featured 領域を非表示にして Bento を上に詰める

### Featured タイル仕様

- 高さ: `min(45vh, 480px)`
- 背景: cream-100 + grainy gradient overlay (詳細は `05-motion-and-delight.md`)
- アクセント: 左 4px の Persimmon-600 ボーダー
- タイトル: `display.hero` テキストスタイル
- メタ: 投稿日、`meta` テキストスタイル
- 「Featured」ラベル: ブランド単色 Persimmon-600 (色相利用、ホームでここだけ)

### Bento タイル仕様

- aspect-ratio: `4 / 3`
- 背景: cream-50 (light) / sumi-900 (dark)
- 枠線なし、hover で 1px の sumi-300 ボーダー (60ms ease-out)
- タイトル `heading.h3`、3 行で truncate
- 投稿日 `meta`、status バッジ (色相なし)

### Index 領域

- 年・月ごとにグルーピング (新→旧)
- 行の左 4ch が「日付」、右が「タイトル」
- Hover で indigo-500 の **下線アニメーション** (詳細 `05-motion-and-delight.md`)
- archived 記事は外枠 1px + ラベル「アーカイブ」、本文より 1 段沈んだ ink-secondary

## 記事詳細

### 構造 (desktop ≥ 1280)

```
+--------------------------------------------------+
|  Header (slim, sticky)                          |
+----------------+--------------------+------------+
|                |                    |            |
|   余白         |   本文 36rem       |  TOC 200px |
|   (gutter)     |   (max-w: 36rem)   |  (sticky)  |
|                |                    |            |
+----------------+--------------------+------------+
|  Footer                                         |
+--------------------------------------------------+
```

| 範囲              | 本文 max-width | TOC 表示                                  |
| ----------------- | -------------- | ----------------------------------------- |
| ≥ 1280px          | 36rem          | sticky right、幅 200px                    |
| 1024〜1279px      | 36rem          | sticky right、幅 180px                    |
| < 1024px (= 960未満含む) | 36rem (中央寄せ) | **Disclosure** (本文上部の折り畳み)       |

### Sticky TOC

- 縦方向: `position: sticky; top: 96px` (Header の下)
- 縦方向の最大高: `max-height: calc(100vh - 96px - 24px)`、`overflow-y: auto`
- 現在位置のハイライト: IntersectionObserver で `<h2>`/`<h3>` を監視
- TOC 項目間隔: 0.5rem、line-height 1.45

### モバイル Disclosure 開閉時の scroll position guard

```
[ 開閉前 ]
  ・現在の scrollY を保存
  ・現在ビューポート最上部にある記事内要素の getBoundingClientRect().top を保存
[ 開閉アニメーション完了後 ]
  ・同じ要素の rect を再計算し、差分だけ window.scrollTo で補正
  ・behavior: "auto" (instant) で誤差を残さない
```

これにより本文を読み進めている最中に TOC を開いても **読み位置がジャンプしない**。

### 長 URL 対応

- 本文 / コードブロック内の長い URL は `overflow-wrap: anywhere`
- ただし `pre > code` 内ではスクロールを優先 (折り返さない)

## Header

- 高さ: 56px (mobile) / 64px (desktop)
- sticky、scroll で 0.6 透過 + backdrop-filter (prefers-reduced-transparency 下では透過なし)
- 中央: ロゴ "lazyNote" (z 文字に hover ゆらり、`05-motion-and-delight.md`)
- 右: テーマ切替 (Ext-5 で実装)

## Footer

- 高さ: 自動、padding 32px / 48px
- 著者名、コピー「Notes that age well.」、外部リンク (X / GitHub 等)
- 区切り罫: 上端 1px sumi-200

## 404 / Empty / Loading

### 404

- 本文 36rem センター
- 見出し: "Not found." (`display.section`)
- 本文: 「お探しのページは見つかりませんでした。」
- 戻りリンク: indigo-500 で「ホームに戻る」

### Empty (記事 0 件)

- ホームで記事が 1 件もない場合 (実運用上はほぼ無いが安全側で)
- Editorial Bento の代わりに 1 タイル: 「最初の記事をお待ちください」

### Loading

- スケルトン: Bento タイルと同じ aspect-ratio、cream-100 背景にゆっくり pulse (1.6s ease-in-out)
- prefers-reduced-motion 下では pulse なし、静止のスケルトンのみ

## レスポンシブ確認チェックリスト

- [ ] iPhone SE (375 × 667) で本文 36rem が崩れない
- [ ] iPad mini (768 × 1024) で Bento が 2x2 維持
- [ ] desktop 1280 で TOC 200px sticky が機能
- [ ] desktop 1024〜1279 で TOC 180px に切替
- [ ] desktop ≥ 1440 で `page.max` 1200px が中央寄せ
- [ ] フォント拡大 200% で本文 36rem が破綻しない (横スクロール無し)
