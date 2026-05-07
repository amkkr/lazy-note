# 03. タイポグラフィ

## 設計方針

- **本文は Serif** で「読み物」の佇まいを獲得する
- 欧文 Serif: **Newsreader VF** (Google Fonts、OFL ライセンス)
- 等幅: **JetBrains Mono VF** (Apache 2.0 / OFL)
- 和文 + 欧文 Sans: **システムスタックに完全委譲** (ダウンロード負担ゼロ)
- self-host 配信。フォント合計 **150KB 目標** (preload は Newsreader wght 1 本のみ)
- 採用判定は **Phase 0 検証** で行う。20/25 点未満は Plan A / Plan B に退避

## フォント採用候補

| 用途                 | フォント                                  | ライセンス | 配信       |
| -------------------- | ----------------------------------------- | ---------- | ---------- |
| 本文 / 見出し (欧文) | **Newsreader VF**                         | OFL        | self-host  |
| 本文 / 見出し (和文) | システム (Hiragino Mincho ProN / Yu Mincho 等を後段で検証) | OS         | -          |
| UI / メタ (欧文)     | システム sans (`-apple-system, "Segoe UI", ...`) | OS     | -          |
| UI / メタ (和文)     | システム sans (`"Hiragino Sans", "Yu Gothic", ...`) | OS     | -          |
| 等幅                 | **JetBrains Mono VF**                     | Apache 2.0 / OFL | self-host  |

> 2 ファミリ × VF で抑え、それ以外をシステムに任せることでネットワーク負荷を最小化します。

## Phase 0 検証フローチャート

Newsreader を本格採用する前に、**実機サンプル 27 枚** を撮影して 5 軸採点で判定します。

```
[ 候補確定 ]
    │
    ▼
[ 27 枚撮影 ]
  3 viewport × 3 surface × 3 和文 font 候補
  (vp = mobile 375 / tablet 768 / desktop 1280)
  (surface = cream-50 / cream-100 / sumi-950)
  (和文 = Hiragino Mincho ProN / Yu Mincho / システム既定)
    │
    ▼
[ 5 軸採点 (各 5 点満点 = 計 25 点満点) ]
  1. 和欧混植のベースライン整合
  2. 行間 1.85 における視覚的なゆとり
  3. ダーク背景での滲み (sumi-950 上)
  4. 小サイズ (14px) でのにじみ
  5. 数字・コロン・約物の組まれ方
    │
    ▼
[ 採用判定 ]
  20/25 点 (= 80%) 以上  → 採用
  19 点以下             → Plan A / Plan B へ退避
```

### Plan A (採点 15〜19 点)

- **本文は Hiragino Mincho ProN** を主軸にし、欧文だけ Newsreader を充当
- フォントロード戦略は変更なし
- 和欧混植スタックを `font-family` で組む

### Plan B (採点 14 点以下)

- **Noto Serif JP subset** を導入 (Ext-10 を発動)
- subset 範囲: 既存 16 記事に出現する文字 + JIS X 0208 第一水準
- 配信サイズ目標: 80KB 以下
- Newsreader は欧文のみのフォールバックに格下げ

## textStyles 定義 (案)

Panda CSS の `theme.textStyles` で集約管理する想定です (Issue #1 で実装)。

| name              | 用途                  | font-family                | weight | size       | line-height | letter-spacing |
| ----------------- | --------------------- | -------------------------- | ------ | ---------- | ----------- | -------------- |
| `display.hero`    | Hero タイトル         | Newsreader / 和文 mincho   | 700    | clamp(2.0rem, 5vw, 3.0rem) | 1.25 | -0.01em       |
| `display.section` | セクション見出し      | Newsreader / 和文 mincho   | 600    | 1.875rem   | 1.35        | -0.01em        |
| `heading.h2`      | 記事内 h2             | Newsreader / 和文 mincho   | 600    | 1.5rem     | 1.45        | -0.005em       |
| `heading.h3`      | 記事内 h3             | Newsreader / 和文 mincho   | 600    | 1.25rem    | 1.5         | 0              |
| `body.long`       | **本文 (記事)**       | Newsreader / 和文 mincho   | 400    | 1.0625rem  | **1.85**    | 0.005em        |
| `body.short`      | 短文 (Card description) | Newsreader / 和文 mincho | 400    | 1.0rem     | 1.7         | 0              |
| `meta`            | メタ・キャプション    | system sans                | 400    | 0.875rem   | 1.5         | 0.01em         |
| `code`            | 等幅                  | JetBrains Mono             | 400    | 0.9375rem  | 1.6         | 0              |
| `dropCap`         | ドロップキャップ      | Newsreader                 | 600    | 3.5em      | 0.85        | -0.02em        |

### 本文 max-width

- 本文 `max-width: 36rem` (= 約 36〜40 全角文字)
- これは Editorial Citrus の **最重要レイアウト定数**。詳細は `04-layout.md`

## ドロップキャップ仕様

### 採用条件

- **記事本文の最初の段落** にのみ適用
- 段落の **先頭文字が ASCII** (アルファベットまたは数字) の場合のみ
- 先頭が和文 / 約物の場合は **適用しない** (グリッド整合が崩れるため)

### 実装方針

- ASCII 先頭判定は `parseMarkdown` 後の Hyperscript ノードで行う
- DOM 上はドロップキャップ用 `<span aria-hidden="true">` と、隠し `<span class="sr-only">` の元の文字を併置
- これにより **スクリーンリーダの読み上げ重複を回避**
- フォールバック: `:first-letter` 擬似要素は使わない (約物・サロゲートペア・絵文字での挙動が不安定)

### 視覚仕様

- font-size: 3.5em
- line-height: 0.85
- 段落先頭 2 行を巻き込む `float: left` + `shape-outside: margin-box`
- 余白: `margin: 0.05em 0.15em 0 -0.05em`
- color: `ink-primary-on-cream` (アクセント色は使わない、編集物の落ち着きを保つ)

## フォントローディング戦略

| 項目                     | 設定                                                          |
| ------------------------ | ------------------------------------------------------------- |
| `font-display`           | `swap`                                                        |
| preload                  | Newsreader VF wght axis のみ 1 本                             |
| size-adjust              | 和文フォールバック → Newsreader 切替時の **CLS を抑制**       |
| ascent / descent override | 同上 (specifically Newsreader / Hiragino の比率を実測して書く) |
| woff2                    | self-host、`/fonts/` 直下                                     |
| Cache-Control            | `public, max-age=31536000, immutable` (Vercel / Vite 設定で)  |

### CSS 例 (イメージ)

```css
@font-face {
  font-family: "Newsreader";
  src: url("/fonts/Newsreader-VF.woff2") format("woff2-variations");
  font-weight: 200 800;
  font-style: normal;
  font-display: swap;
  size-adjust: 102%;
  ascent-override: 90%;
  descent-override: 25%;
  unicode-range: U+0020-024F, U+1E00-1EFF, U+2000-206F, U+2070-209F;
}
```

unicode-range で **欧文範囲のみ** に絞り、和文は OS フォントが直接担当することで二重ロードを防ぎます。

## OFL ライセンス管理

- `public/fonts/OFL.txt` に Newsreader / JetBrains Mono のライセンス全文を同梱
- `Ext-6` で **半年に 1 度の cron** を GitHub Actions に設定し、upstream のライセンス変更・バージョン更新を自動 Issue 化

## アクセシビリティ留意

- フォント拡大 (200%) で本文が壊れないか手動チェック
- `prefers-reduced-motion` 下でも文字組には影響なし (モーション対象外)
- 行間 1.85 は WCAG 1.4.12 (Text Spacing) を上回る安全側設計
