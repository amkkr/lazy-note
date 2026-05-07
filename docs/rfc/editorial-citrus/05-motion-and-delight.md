# 05. モーションと delight

## 設計方針

- モーションは **「組版で語り、動きで補強する」** が原則。ページ遷移演出より文字組で勝負する
- MVP では **5 種類** のみ。それ以上のリッチアニメーションは増やさない
- 全モーションは **`prefers-reduced-motion: reduce` で停止または減衰**
- 透過 / blur は **`prefers-reduced-transparency`** で代替表現にフォールバック

## モーション 5 種

### 1. ページ遷移 (MVP では VT 不採用)

- View Transitions API は **MVP では採用しない** (Ext-7 に退避)
- 代わりに `<Suspense>` + 200ms の `opacity` フェードのみ
- 退避理由: SPA + クライアントルーティング下で MPA-like VT を期待した実装は **当面ブラウザ差異が大きい**。組版で勝負する方針と合わせ、MVP からは外す

### 2. ロゴ "z" のゆらり

- "lazyNote" の z 文字のみ、`transform: rotate(0deg → 4deg → -2deg → 0deg)` を 600ms / cubic-bezier(0.4, 0, 0.2, 1)
- **hover 時のみ** 発火 (常時アニメーションは騒がしいため不採用)
- `prefers-reduced-motion: reduce` で **完全停止**
- moment of delight #1

### 3. リンク下線アニメーション

- 通常時は下線あり (`text-decoration-thickness: 1px; text-underline-offset: 0.2em`)
- hover で下線が左→右に再描画 (`background-image: linear-gradient(...)` + `background-size` トリック)
- 200ms / ease-out
- `prefers-reduced-motion: reduce` 下では **静的な下線のみ** (スワイプ無し)

### 4. カード hover (Bento タイル)

- transform: なし (リフトアップ無し、紙の落ち着きを保つ)
- box-shadow: なし → `0 0 0 1px sumi-300` の枠線のみ
- 60ms ease-out
- `prefers-reduced-motion: reduce` で transition 0ms にする (枠線は出る)

### 5. focus ring (静止)

- `outline: 2px solid citrus-500`
- `outline-offset: 2px`
- `transition: 0ms` (= 即時表示、trail エフェクト無し)
- accent ボタン上では二重リング: 外 `box-shadow: 0 0 0 4px ink-900` + 内 `outline: 2px citrus-500`
- DA 第 2 ラウンドで「focus に trail を付けるとキーボード操作の可視性を損なう」と指摘を受け、**trail を廃止**

## moment of delight: ドロップキャップ

ドロップキャップは技術的には組版だが、**読み始めの一瞬の「おっ」を生む** 装置として motion 章にも記録します。

- 詳細仕様は `03-typography.md`
- 季節アイコン (🍃 等) は **不採用** (Editorial の落ち着きを壊すため)。Whimsy 系は徹底削減

## grainy gradient (紙の質感)

### 仕様

- **モノクロ noise PNG 1 枚** を `public/textures/grain.png` に配置 (1024 × 1024、< 30KB)
- CSS で `background-image` として全画面背景に重ねる
- `mix-blend-mode`:
  - light テーマ: `multiply` (cream を僅かに沈める)
  - dark テーマ: `screen` (sumi を僅かに浮かせる)
- `opacity: 0.06`、固定 (背景固定 = `background-attachment: fixed`)

### `prefers-reduced-transparency` 対応

- ユーザが透過抑制を希望している場合 → noise を **完全に非表示**
- 代替: 背景色をそのまま (cream-50 / sumi-950 のフラット表示)
- 検出: `@media (prefers-reduced-transparency: reduce)` で `display: none`

## focus / hover のキーボード両対応

- 全モーションは **keyboard focus でも発火** すること
- `:focus-visible` で focus ring を必ず表示
- hover 専用のアフォーダンス (例: hidden CTA) は作らない

## reduced-motion / reduced-transparency 仕様一覧

| 演出                        | 通常                                  | reduced-motion         | reduced-transparency   |
| --------------------------- | ------------------------------------- | ---------------------- | ---------------------- |
| ページ遷移 fade             | 200ms opacity                         | 0ms (即時)             | 影響なし               |
| ロゴ "z" ゆらり (hover)     | 600ms rotate                          | 停止                   | 影響なし               |
| リンク下線 (hover)          | 200ms スワイプ                        | 静的下線               | 影響なし               |
| カード hover                | 60ms 枠線フェード                     | 0ms (即時)             | 影響なし               |
| focus ring                  | 0ms (静止)                            | 0ms (静止、変更なし)   | 影響なし               |
| Loading skeleton pulse      | 1.6s ease-in-out                      | 静止                   | 影響なし               |
| grainy gradient overlay     | opacity 0.06、blend                   | 影響なし               | **非表示**             |
| Header backdrop-filter      | 0.6 透過 + blur                       | 影響なし               | **不透明背景に置換**   |

## 実装上のガイドライン (Issue #4c)

- アニメーションは **CSS で完結** させ、JS タイマー駆動を避ける (バッテリ・タブブラックリスト対策)
- `transform` / `opacity` 以外をアニメーションさせない (composite layer)
- IntersectionObserver の rootMargin は控えめ (= 不要再描画を抑制)

## DA レビューでの確定事項

- ❌ ページ遷移 View Transitions → **Ext-7 へ退避**
- ❌ focus ring trail (発光残像) → **廃止**
- ❌ ホーム背景の sweeping gradient → **廃止**、grain 1 枚で代替
- ❌ 季節アイコン (🍃 等) → **不採用**
- ✅ ロゴ "z" hover ゆらり → moment of delight として残す
- ✅ ドロップキャップ → 採用、ただし aria-hidden + 隠し span で SR 重複回避
