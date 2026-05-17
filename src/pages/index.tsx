import { Transition } from "@headlessui/react";
import { useMemo } from "react";
import milestonesData from "../../datasources/milestones.json";
import { CardSkeleton } from "../components/common/CardSkeleton";
import { Layout } from "../components/layouts/Layout";
import { HomePage } from "../components/pages/HomePage";
import { usePosts } from "../hooks/usePosts";
import type { Milestone } from "../lib/anchors";
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
 * Resurface (Issue #492 / N-5) で「節目記念日 (milestoneAnniversary)」の発火に
 * 使用する。Coordinate (Issue #491) / AnchorPage (Issue #493) と同じ JSON を
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
 * ランタイム検証 (Issue #547):
 * - `as readonly Milestone[]` の型キャスト**ではなく**、`parseMilestones`
 *   (`src/lib/milestonesSchema.ts`) で lenient 検証する。`tone` の値域外
 *   (例: `"happy"`) や `date` の形式違反などの不正要素はランタイムで除外される。
 * - 結果として Resurface の節目記念日経路にも不正データが渡らない (= 沈黙トリガー
 *   の誤発火を防ぐ)。
 * - 厳密な検出 (CI で PR をブロック) は `src/lib/__tests__/milestonesSchema.test.ts`
 *   の `validateMilestonesStrict` 経由で別途担保する。
 *
 * 撤退方法: `datasources/milestones.json` の配列を `[]` にすれば節目記念日が
 * 発火しなくなる (沈黙トリガーと暦の節目は引き続き機能する)。編集方法は
 * `docs/MILESTONES.md` を参照する。
 */
const MILESTONES: readonly Milestone[] = parseMilestones(milestonesData);

/**
 * 今日の日付を JST 暦上の YYYY-MM-DD として返す。
 *
 * React コンポーネント内でしか呼ばないため副作用は許容する。
 * テストで時間を固定する場合は `selectResurfaced` の第 3 引数 today に直接
 * 文字列を渡せばよく、本ヘルパーは production 専用。
 */
const getTodayJst = (): string => {
  const now = new Date();
  // JST (+09:00) でカレンダー日付を取り出す
  const jstOffsetMs = 9 * 60 * 60 * 1000;
  const jst = new Date(now.getTime() + jstOffsetMs);
  const y = String(jst.getUTCFullYear()).padStart(4, "0");
  const m = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

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
      selectResurfaced(allPosts, MILESTONES, getTodayJst(), {
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
