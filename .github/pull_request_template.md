## 概要

## 変更内容

-

## 備考

## チェックリスト (Anchor 型を扱うとき) (Issue #556)

<!--
`scripts/newPost.ts` の `IgnitionInput` などに「Coordinate / Elapsed (Anchor 型)
を要素として含むフィールド」を新規追加・変更する場合のみ以下を確認する。
無関係な PR ではセクションごと削除してよい。
-->

- [ ] 新フィールドの型宣言で `Coordinate` / `Elapsed` (またはそれらを要素とする
      `readonly Coordinate[]` / `Elapsed | null` 等) を `src/lib/anchors.ts` から
      `import type` で参照しているか
- [ ] 構造的リテラル `{ label, tone, daysSince }[]` のようなハンドメイドな
      型宣言になっていないか (discriminator `kind` の欠落 = サイレント縮退の
      入口になるため。`scripts/newPost.ts` の
      `EnforceAnchorDiscriminatorFields` 型レベルガードが `type-check:test` で
      検知するが、ガード追加忘れを防ぐためレビュー時点でも確認すること)
- [ ] 必要に応じて `scripts/__tests__/newPost.test.ts` の「型レベル: Anchor
      field 構造的縮退の予防ガード (Issue #556)」ブロックに、追加した
      フィールド向けの `@ts-expect-error` 回帰固定テストを足したか
