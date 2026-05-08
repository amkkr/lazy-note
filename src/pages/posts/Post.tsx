import { Transition } from "@headlessui/react";
import { useParams } from "react-router-dom";
import { FileQuestion } from "../../components/atoms/icons";
import { ArticleSkeleton } from "../../components/common/ArticleSkeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { ReadingProgressBar } from "../../components/common/ReadingProgressBar";
import { Layout } from "../../components/layouts/Layout";
import { PostDetailPage } from "../../components/pages/PostDetailPage";
import { useAdjacentPosts } from "../../hooks/useAdjacentPosts";
import { usePost } from "../../hooks/usePost";
import {
  fadeInEnter,
  fadeInEnterFrom,
  fadeInEnterTo,
} from "../../styles/transitions";

const Post = () => {
  const { timestamp } = useParams<{ timestamp: string }>();
  const { post, loading, notFound } = usePost(timestamp);
  const { olderPost, newerPost } = useAdjacentPosts(timestamp);

  if (notFound || (!loading && !post)) {
    return (
      <EmptyState
        icon={FileQuestion}
        title="記事が見つかりません"
        description="お探しの記事は削除されたか、URLが間違っている可能性があります。"
        action={{
          label: "← 記事一覧に戻る",
          href: "/",
        }}
      />
    );
  }

  if (loading) {
    return (
      <Layout>
        <ArticleSkeleton />
      </Layout>
    );
  }

  if (!post) {
    return null;
  }

  return (
    <Layout>
      <ReadingProgressBar />
      {/*
       * appear=false に変更 (Issue #397 / DA 致命 3 対応)。
       *
       * View Transitions の Hero morph 中に内部要素が opacity 0 → 1 で
       * フェードインすると、morph 中のサイズ補間と重なって不自然に
       * 「フェードしながら位置が動く」アニメーションになる。
       * appear=false により初回マウント時のフェードを無効化し、VT 中の動きを
       * 純粋な morph に絞る。Calm 思想にも整合 (装飾フェードは過剰)。
       */}
      <Transition
        as="div"
        show={true}
        appear={false}
        enter={fadeInEnter}
        enterFrom={fadeInEnterFrom}
        enterTo={fadeInEnterTo}
      >
        <PostDetailPage
          post={post}
          olderPost={olderPost}
          newerPost={newerPost}
        />
      </Transition>
    </Layout>
  );
};

export default Post;
