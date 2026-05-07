# Typography Decision (Phase 0 採点記録)

> Editorial Citrus デザインリニューアルの本文書体を確定するための **Phase 0** 検証記録。
> 採点フォーマットの draft であり、実採点は本ドキュメントに直接追記して残す。

参照:

- `docs/rfc/editorial-citrus/03-typography.md` (Phase 0 設計、5 軸採点定義)
- `docs/rfc/editorial-citrus/08-roadmap.md` (#0b: Phase 0 検証)
- `e2e/typography-phase0/sample.html` (撮影サンプル)
- `e2e/typography-phase0/capture.spec.ts` (撮影スクリプト)
- `docs/typography-phase0/screenshots/` (撮影結果 27 枚)

## 撮影環境

| 項目             | 値                                                          |
| ---------------- | ----------------------------------------------------------- |
| 撮影日           | TBD (採点者が記入)                                          |
| OS               | TBD (例: macOS 14.x)                                        |
| Playwright       | 1.59.1                                                      |
| 欧文フォント     | Newsreader VF (latin-ext subset, weight axis), self-host    |
| 等幅フォント     | JetBrains Mono VF (latin-ext subset, weight axis)           |
| 撮影コマンド     | `pnpm phase0:capture`                                       |
| 出力先           | `docs/typography-phase0/screenshots/{viewport}/{surface}/{jp}.png` |

> 撮影には OS にインストールされた和文フォント (Hiragino Mincho ProN / Hiragino Sans /
> Yu Gothic) を利用するため、再現性は撮影者の環境に依存する。CI で同じ画像を生成しないこと。

## 評価者

- 設計者: TBD
- DA (Design Advocate): TBD
- 第三者レビュアー: TBD

## 撮影マトリクス (27 枚)

3 viewport × 3 surface × 3 和文 stack = 27 サンプル。

| viewport          | surface                                | jp stack                                   |
| ----------------- | -------------------------------------- | ------------------------------------------ |
| mobile (375x812)  | `cream-50` / `cream-100` / `sumi-950`  | `hiragino-mincho` / `hiragino-sans` / `yu-gothic` |
| tablet (768x1024) | 同上                                   | 同上                                       |
| desktop (1280x900)| 同上                                   | 同上                                       |

## 5 軸採点 (各 5 点満点 = 25 点満点)

採点は 27 枚を 1 セットとして眺めたうえで、**和文 stack ごとに合計 25 点** で評価する。

| 軸  | 観点                                                         | 5 点 (理想)                  | 1 点 (要退避)                |
| --- | ------------------------------------------------------------ | ---------------------------- | ---------------------------- |
| A   | 和欧混植のベースライン整合                                    | 明らかなズレなし             | 文字ごとに段差が見える       |
| B   | 行間 1.85 における視覚的なゆとり                              | 雑誌のような呼吸             | 詰まって息苦しい             |
| C   | ダーク背景 (`sumi-950`) での滲み                              | クリアに読める               | 縁に色付き滲み               |
| D   | 小サイズ (14px) でのにじみ                                    | 14px でも読める              | 14px でつぶれる              |
| E   | 数字・コロン・約物の組まれ方                                  | 等幅数字が綺麗に揃う         | カーニング崩壊                |

## 採点表 (テンプレート、各評価者が記入)

> 評価者ごとに 1 行を埋めて、最後に平均を算出する。20/25 (= 80%) で採用。

### Newsreader + Hiragino Mincho ProN

| 評価者         | A | B | C | D | E | 合計 |
| -------------- | - | - | - | - | - | ---- |
| 設計者         |   |   |   |   |   |      |
| DA             |   |   |   |   |   |      |
| 第三者         |   |   |   |   |   |      |
| **平均**       |   |   |   |   |   |      |

### Newsreader + Hiragino Sans

| 評価者         | A | B | C | D | E | 合計 |
| -------------- | - | - | - | - | - | ---- |
| 設計者         |   |   |   |   |   |      |
| DA             |   |   |   |   |   |      |
| 第三者         |   |   |   |   |   |      |
| **平均**       |   |   |   |   |   |      |

### Newsreader + Yu Gothic

| 評価者         | A | B | C | D | E | 合計 |
| -------------- | - | - | - | - | - | ---- |
| 設計者         |   |   |   |   |   |      |
| DA             |   |   |   |   |   |      |
| 第三者         |   |   |   |   |   |      |
| **平均**       |   |   |   |   |   |      |

## 採用判断フロー

1. 各 stack の **3 評価者平均** を算出する。
2. 平均が **20 点以上 (= 80%)** の stack のうち最高スコアを採用候補とする。
3. すべての stack が **19 点以下** の場合、軸 A/E (混植・約物) のスコアで分岐:
   - 軸 A または軸 E が **3 点未満** の組み合わせしか残らない → **Plan B** (Noto Serif JP subset, Ext-10 起票)
   - それ以外 → **Plan A** (本文を Hiragino Mincho ProN 主軸、欧文だけ Newsreader)

## 採用判断 (採点後に記入)

- [ ] 採用案: `Newsreader + ___` (平均 ___ /25)
- [ ] Plan A 採用 (Hiragino Mincho ProN 本文化)
- [ ] Plan B 採用 (Noto Serif JP subset、Ext-10 起票)

### 決定事由

採点後に記入する欄:

> ここに「なぜこの案を採用したか」を 3〜5 行で記す。
> 特に Plan A / Plan B に流れた場合は、軸 A〜E のうちボトルネックになった軸を明示する。

## 後続アクション

採点完了後、本実装 Issue (Issue #2-β 相当) を起票する。本実装で行うこと:

- `panda.config.ts` の `theme.textStyles` に display / heading / body / meta / code / dropCap を登録 (#1)
- `@font-face` に `size-adjust` / `ascent-override` / `descent-override` を確定値で記述
- Newsreader VF wght の preload を 1 本だけ仕込む
- 採用 stack に応じた `font-family` トークン整備
- Plan B の場合は Noto Serif JP subset 配信 (Ext-10)

> Phase 0 段階では `@font-face` は撮影サンプル (`e2e/typography-phase0/sample.html`) 内のみ
> に閉じ込め、本番 CSS には影響を与えない。

## 残課題 / 注意点

- 撮影環境 (Hiragino フォントの導入有無) に結果が左右されるため、採点用の screenshots は
  撮影者の OS で撮ったものを優先する。CI 上で再生成しないこと。
- `font-display: swap` の挙動と FOUT の体感は採点軸の外で別途記録する。
- 採点が低スコア (Plan B 発動) になった場合、`Ext-10` Issue を発動させる。
