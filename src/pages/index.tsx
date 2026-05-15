import { Transition } from "@headlessui/react";
import { useMemo } from "react";
import { CardSkeleton } from "../components/common/CardSkeleton";
import { Layout } from "../components/layouts/Layout";
import { HomePage } from "../components/pages/HomePage";
import { usePosts } from "../hooks/usePosts";
import type { Milestone } from "../lib/anchors";
import { selectResurfaced } from "../lib/resurface";
import {
  fadeInEnter,
  fadeInEnterFrom,
  fadeInEnterTo,
} from "../styles/transitions";

/**
 * 現在の Resurface 用節目データ。
 *
 * Issue #492 (N-5) 時点では `datasources/milestones.json` がまだ存在しないため
 * (Issue #489 で別途追加予定) 空配列で動かす。空配列でも沈黙トリガー (=最も
 * 重要な顔) と暦の節目は機能する。節目記念日 (= milestoneAnniversary) は
 * milestones が登録された後で初めて発火する。
 *
 * milestones.json が追加されたタイミング (#489 完了後) で本配列を JSON import
 * に差し替える。
 */
const MILESTONES: readonly Milestone[] = [];

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
  // - milestones は空配列 (#489 完了後に差し替え)
  // - today は JST 暦の YYYY-MM-DD
  // - loading 中は計算しない (allPosts が空 → null になるため低コストではあるが、
  //   allPosts が解決した瞬間に再計算したいので useMemo で deps に入れる)
  const resurfaceEntry = useMemo(
    () => selectResurfaced(allPosts, MILESTONES, getTodayJst()),
    [allPosts],
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
