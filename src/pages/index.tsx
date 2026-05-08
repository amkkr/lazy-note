import { Transition } from "@headlessui/react";
import { CardSkeleton } from "../components/common/CardSkeleton";
import { Layout } from "../components/layouts/Layout";
import { HomePage } from "../components/pages/HomePage";
import { usePosts } from "../hooks/usePosts";
import {
  fadeInEnter,
  fadeInEnterFrom,
  fadeInEnterTo,
} from "../styles/transitions";

const Index = () => {
  const {
    posts,
    loading,
    currentPage,
    totalPages,
    totalPosts,
    setCurrentPage,
  } = usePosts();

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
          />
        </Transition>
      )}
    </Layout>
  );
};

export default Index;
