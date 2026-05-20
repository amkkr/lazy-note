import { Transition } from "@headlessui/react";
import { useMemo } from "react";
import milestonesData from "../../datasources/milestones.json";
import { CardSkeleton } from "../components/common/CardSkeleton";
import { Layout } from "../components/layouts/Layout";
import { HomePage } from "../components/pages/HomePage";
import { usePosts } from "../hooks/usePosts";
import { type Milestone, todayInJst } from "../lib/anchors";
import { parseMilestones } from "../lib/milestonesSchema";
import { selectResurfaced } from "../lib/resurface";
import {
  fadeInEnter,
  fadeInEnterFrom,
  fadeInEnterTo,
} from "../styles/transitions";

/**
 * 節目データ (`datasources/milestones.json`)。
 *
 * このページでは Resurface (Issue #492 / N-5) で「節目記念日
 * (milestoneAnniversary)」の発火に使用する。
 *
 * 集約しない設計判断 (Issue #546):
 * Coordinate (Issue #491) / Resurface (Issue #492) / AnchorPage (Issue #493) の
 * 3 page が同じ JSON を共有しているが、Issue #546 の判断で **集約せず各 page で
 * 個別 import** する設計を採用している (認知負荷の局所化を優先)。
 * `src/lib/milestones.ts` のような集約点を作ると、各 page を読む際に「この
 * MILESTONES はどこから来てどう加工されたものか」を別ファイルまで追いかける必要が
 * 出るため、3 page で import 経路と narrowing キャストを揃え、各 page の責務
 * (Coordinate / Resurface / AnchorPage のどれに渡すか) をその場で完結して読める
 * ようにする。撤退の単位は docs/ANCHOR.md 「撤退可能性」節のとおり
 * **コンポーネント (Coordinate / Resurface) ごとの `show` フラグ** が一次手段で
 * あり、JSON の `[]` 化は 3 経路まとめての停止 = 二次手段である。
 *
 * ランタイム検証 (Issue #547):
 * - `as readonly Milestone[]` の型キャスト**ではなく**、`parseMilestones`
 *   (`src/lib/milestonesSchema.ts`) で lenient 検証する。`tone` の値域外
 *   (例: `"happy"`) や `date` (`YYYY-MM-DD`) の形式違反などの不正要素は、
 *   ランタイムでサイレントに除外される (= 本番のページが壊れない fail-soft)。
 * - 全件不正で配列が空になった場合も、各 page の 0 件フォールバックがそのまま
 *   機能する。
 * - 厳密な検出 (CI で PR をブロック) は `src/lib/__tests__/milestonesSchema.test.ts`
 *   の `validateMilestonesStrict` 経由で別途担保する。
 *
 * このページでの実害: 不正要素が除外されることで、Resurface の節目記念日経路にも
 * 不正データが渡らない (= 沈黙トリガーの誤発火を防ぐ)。
 *
 * 撤退方法: `datasources/milestones.json` の配列を `[]` にすれば節目記念日が
 * 発火しなくなる (沈黙トリガーと暦の節目は引き続き機能する)。編集方法は
 * `docs/MILESTONES.md` を参照する。
 */
const MILESTONES: readonly Milestone[] = parseMilestones(milestonesData);

const Index = () => {
  const {
    posts,
    allPosts,
    loading,
    currentPage,
    totalPages,
    totalPosts,
    setCurrentPage,
  } = usePosts();

  // Resurface (Issue #492 / N-5) の浮上対象を算出する。
  // - 全期間の allPosts を入力にする (paginate 前の配列)
  // - milestones は datasources/milestones.json から JSON import (Issue #489)
  // - today は JST 暦の YYYY-MM-DD
  // - loading 中は計算しない (allPosts が空 → null になるため低コストではあるが、
  //   allPosts が解決した瞬間に再計算したいので useMemo で deps に入れる)
  //
  // excludeIds (致命: View Transition 名前衝突回避):
  //   HomePage では `posts` (= 現在ページに表示する 16 件) の各カード/行に
  //   `view-transition-name: post-{id}` が付与される。Resurface に同じ post.id を
  //   浮上させると DOM 内で同名 transition が 2 か所に同時宣言され、Chrome は
  //   `Unexpected duplicate view-transition-name` で transition 全体を abort する。
  //   呼び出し側で「現在表示中の posts.id」を `excludeIds` に渡すことで、Resurface
  //   候補から強制的に除外して衝突を防ぐ。
  //   1 ページ目以外でも Resurface は描画しない (HomePage 側の currentPage === 1
  //   ガード) ため、`posts` が現在ページ分しか含まなくても問題ない (Resurface が
  //   出るのは常に「1 ページ目の posts」のとき = HomePage に表示中の post 集合)。
  const resurfaceEntry = useMemo(
    () =>
      selectResurfaced(allPosts, MILESTONES, todayInJst(), {
        excludeIds: posts.map((p) => p.id),
      }),
    [allPosts, posts],
  );

  return (
    <Layout postCount={loading ? undefined : totalPosts}>
      {loading ? (
        <CardSkeleton />
      ) : (
        // appear=false に変更 (Issue #397 / DA 致命 3 対応)。
        // 詳細は src/pages/posts/Post.tsx の同コメントを参照。
        // 記事 → HomePage の戻り遷移時に Hero morph が起きるが、その間に
        // HomePage 全体が opacity 0 → 1 でフェードすると morph と被って
        // 不自然に動くため、初回マウント時のフェードを無効化する。
        <Transition
          as="div"
          show={true}
          appear={false}
          enter={fadeInEnter}
          enterFrom={fadeInEnterFrom}
          enterTo={fadeInEnterTo}
        >
          <HomePage
            posts={posts}
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            resurfaceEntry={resurfaceEntry}
          />
        </Transition>
      )}
    </Layout>
  );
};

export default Index;
