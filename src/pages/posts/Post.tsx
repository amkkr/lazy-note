import { useParams } from "react-router-dom";
import { EmptyState } from "../../components/common/EmptyState";
import { LoadingSpinner } from "../../components/common/LoadingSpinner";
import { ReadingProgressBar } from "../../components/common/ReadingProgressBar";
import { Layout } from "../../components/layouts/Layout";
import { PostDetailPage } from "../../components/pages/PostDetailPage";
import { usePost } from "../../hooks/usePost";

const Post = () => {
  const { timestamp } = useParams<{ timestamp: string }>();
  const { post, loading, notFound } = usePost(timestamp);

  if (loading) {
    return <LoadingSpinner message="記事を読み込み中..." />;
  }

  if (notFound || !post) {
    return (
      <EmptyState
        icon="😕"
        title="記事が見つかりません"
        description="お探しの記事は削除されたか、URLが間違っている可能性があります。"
        action={{
          label: "← 記事一覧に戻る",
          href: "/",
        }}
      />
    );
  }

  return (
    <Layout>
      <ReadingProgressBar />
      <PostDetailPage post={post} />
    </Layout>
  );
};

export default Post;
