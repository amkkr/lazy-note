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
 * - `posts`: `usePosts()` が返す `allPosts` は `getAllPostSummaries()` 内で
 *   id (= timestamp) 降順にソート済み (`src/lib/markdown.ts` の
 *   `summaries.sort((a, b) => b.id.localeCompare(a.id))`) のため、ここでの
 *   追加ソートは不要 (= 最新記事が先頭に来る期待挙動と一致)。仕様変更で
 *   別順序を望む場合は、本ファイル側で sort を挟んで AnchorPage に渡すこと。
 * - `milestones`: `milestones.json` の配列順をそのまま渡す (= ファイル上の
 *   記載順が画面の表示順になる)。日付順などで並び替えたい場合は、JSON 自体
 *   を並び替えるか、本ファイルで sort を挟むこと。
 */
const MILESTONES: readonly Milestone[] = milestonesData as readonly Milestone[];

const Anchor = () => {
  const { allPosts, loading } = usePosts();

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
          <AnchorPage posts={allPosts} milestones={MILESTONES} />
        </Transition>
      )}
    </Layout>
  );
};

export default Anchor;
