import { Transition } from "@headlessui/react";
import milestonesData from "../../datasources/milestones.json";
import { CardSkeleton } from "../components/common/CardSkeleton";
import { Layout } from "../components/layouts/Layout";
import { AnchorPage } from "../components/pages/AnchorPage";
import { usePosts } from "../hooks/usePosts";
import type { Milestone } from "../lib/anchors";
import {
  fadeInEnter,
  fadeInEnterFrom,
  fadeInEnterTo,
} from "../styles/transitions";

/**
 * /anchor ページ (Issue #493 / Anchor 顔2「個人史タイムライン」)。
 *
 * 個人史タイムラインの状態 (節目 / 各記事の座標) を確認できる素朴な運用画面。
 * HomePage / PostPage と同じ責務分離方針で、本ファイルはデータ読み込みのみを
 * 担当し、レイアウトとレンダリングは `AnchorPage` に委譲する。
 *
 * 設計の核 (epic #487 / Issue #493):
 * - 「節目を一覧 + 各記事の座標」を素朴に並べる
 * - **過剰可視化 (投稿頻度・統計グラフ) を一切しない** (Pulse を切った思想の継承)
 * - 0 件状態は穏やかな文言で表示 (AnchorPage 側で実装)
 *
 * Coordinate (Issue #491) / Resurface (Issue #492) と同じく
 * `datasources/milestones.json` を JSON import で読み込む。撤退方法も統一:
 * milestones.json の配列を `[]` にすれば AnchorPage の節目一覧が空状態になる。
 *
 * 表示順の責務 (Issue #543):
 * - AnchorPage は受け取った `posts` / `milestones` の配列順をそのまま描画する
 *   契約 (= 内部で再ソートしない)。本ファイルが「どの順で見せるか」を決める。
 * - `posts`: `usePosts()` が返す `allPosts` は **本番経路 / 開発経路の双方で
 *   id (= timestamp `YYYYMMDDhhmmss`) 降順にソート済み** だが、これは下記
 *   経路ごとに別ファイルが担う **暗黙の前提** にすぎない。
 *   - 本番経路 (`import.meta.env.DEV === false`): `src/lib/markdown.ts` の
 *     `getStaticPostSummaries()` 内で `summaries.sort((a, b) => b.id.localeCompare(a.id))`
 *   - 開発経路 (`import.meta.env.DEV === true`): `src/api/posts.ts` の
 *     `createPostsMiddleware()` 内で `posts.sort((a, b) => b.id.localeCompare(a.id))`
 *   暗黙前提への drift 防御として、本ファイルでも `AnchorPage` に渡す直前に
 *   `[...allPosts].sort((a, b) => b.id.localeCompare(a.id))` を 1 行噛ませて
 *   **id 降順を本ファイル側で明示的に強制する** (Issue #543 DA Counterpoint 1)。
 *   コストは sort 1 回 (運用 16 件規模) で実質ゼロ。
 * - `milestones`: `milestones.json` の配列順をそのまま渡す (= ファイル上の
 *   記載順が画面の表示順になる)。日付順などで並び替えたい場合は、JSON 自体
 *   を並び替えるか、本ファイルで sort を挟むこと。
 */

/**
 * 節目データ (`datasources/milestones.json`)。
 *
 * AnchorPage (個人史タイムライン) で「節目一覧 + 各記事の座標」を描画するために
 * 使用する。Coordinate (Issue #491) / Resurface (Issue #492) と同じ JSON を
 * 共有しているが、Issue #546 の判断で **集約せず各 page で個別 import** する
 * 設計を採用している (認知負荷の局所化を優先)。`src/lib/milestones.ts` のような
 * 集約点を作ると、各 page を読む際に「この MILESTONES はどこから来てどう加工
 * されたものか」を別ファイルまで追いかける必要が出るため、3 page で import 経路と
 * narrowing キャストを揃え、各 page の責務 (Coordinate / Resurface / AnchorPage
 * のどれに渡すか) をその場で完結して読めるようにする。撤退の単位は
 * docs/ANCHOR.md 「撤退可能性」節のとおり **コンポーネント (Coordinate /
 * Resurface) ごとの `show` フラグ** が一次手段であり、JSON の `[]` 化は 3 経路
 * まとめての停止 = 二次手段である。
 *
 * `as readonly Milestone[]` キャストは tsconfig.json の resolveJsonModule:true で
 * 取得される widen された型 (例: `tone: string`) を `Milestone`
 * (`tone: "neutral" | "light" | "heavy"`) に narrowing するため。
 * JSON データの妥当性は datasources 側で人手担保しており (`docs/MILESTONES.md`)、
 * `anchors.ts` 側にランタイム検証はない (将来 Issue #547 で Zod 等の導入を検討中)。
 * 値域から外れた場合の実害は AnchorPage の責務範囲では以下に帰着する:
 * - 不正 `tone` (`"neutral" | "light" | "heavy"` 以外の文字列): 節目一覧の
 *   `<li data-tone="...">` および各記事の座標の `<span data-tone="...">` に
 *   未知 string がそのまま `data-tone` として出る (描画は破綻しない)。色分けは
 *   していないため (AnchorPage は「過剰可視化を避ける」設計で tone を色に
 *   写像しない)、視覚的にも気付きにくいが破綻もしない
 * - 不正 `date` (`YYYY-MM-DD` 形式違反): 節目一覧ではその不正文字列がそのまま
 *   日付列に表示される (= 運用画面の透明性を優先し、フィルタしない) 一方、
 *   各記事の座標計算では `anchors.ts` の `toMilestoneCalendarDate` が `null` を
 *   返し、`computeCoordinates` が当該節目を `continue` でスキップするため、
 *   座標一覧からは静かに落ちる
 *
 * 撤退方法: `datasources/milestones.json` の配列を `[]` にすれば AnchorPage の
 * 節目一覧が空状態になる (AnchorPage 側で穏やかな 0 件文言を表示)。
 */
const MILESTONES: readonly Milestone[] = milestonesData as readonly Milestone[];

const Anchor = () => {
  const { allPosts, loading } = usePosts();

  // id 降順 (= timestamp 降順 = 新しい記事が先頭) を本ファイル側で明示的に
  // 強制する (Issue #543 DA Counterpoint 1)。usePosts → getAllPostSummaries →
  // 本番 sort / 開発 API sort という 4 階層の暗黙前提に依存せず、AnchorPage の
  // JSDoc 契約 (「呼び出し側が決めた順序をそのまま描画する」) をコードで担保する。
  const orderedPosts = [...allPosts].sort((a, b) => b.id.localeCompare(a.id));

  return (
    <Layout postCount={loading ? undefined : allPosts.length}>
      {loading ? (
        <CardSkeleton />
      ) : (
        <Transition
          as="div"
          show={true}
          appear={false}
          enter={fadeInEnter}
          enterFrom={fadeInEnterFrom}
          enterTo={fadeInEnterTo}
        >
          <AnchorPage posts={orderedPosts} milestones={MILESTONES} />
        </Transition>
      )}
    </Layout>
  );
};

export default Anchor;
