import { Transition } from "@headlessui/react";
import { useParams } from "react-router-dom";
import { css } from "../../../styled-system/css";
import { ArticleSkeleton } from "../../components/common/ArticleSkeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { ReadingProgressBar } from "../../components/common/ReadingProgressBar";
import { Layout } from "../../components/layouts/Layout";
import { PostDetailPage } from "../../components/pages/PostDetailPage";
import { usePost } from "../../hooks/usePost";

const enterStyles = css({ transition: "all 0.3s ease" });
const enterFromStyles = css({ opacity: 0, transform: "translateY(8px)" });
const enterToStyles = css({ opacity: 1, transform: "translateY(0)" });

const Post = () => {
  const { timestamp } = useParams<{ timestamp: string }>();
  const { post, loading, notFound } = usePost(timestamp);

  if (notFound || (!loading && !post)) {
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
      <Transition
        as="div"
        show={true}
        appear={true}
        enter={enterStyles}
        enterFrom={enterFromStyles}
        enterTo={enterToStyles}
      >
        <PostDetailPage post={post} />
      </Transition>
    </Layout>
  );
};

export default Post;
