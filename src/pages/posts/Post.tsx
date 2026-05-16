import { Transition } from "@headlessui/react";
import { useParams } from "react-router-dom";
import milestonesData from "../../../datasources/milestones.json";
import { FileQuestion } from "../../components/atoms/icons";
import { ArticleSkeleton } from "../../components/common/ArticleSkeleton";
import { EmptyState } from "../../components/common/EmptyState";
import { ReadingProgressBar } from "../../components/common/ReadingProgressBar";
import { Layout } from "../../components/layouts/Layout";
import { PostDetailPage } from "../../components/pages/PostDetailPage";
import { useAdjacentPosts } from "../../hooks/useAdjacentPosts";
import { usePost } from "../../hooks/usePost";
import type { Milestone } from "../../lib/anchors";
import {
  fadeInEnter,
  fadeInEnterFrom,
  fadeInEnterTo,
} from "../../styles/transitions";

/**
 * Coordinate (Issue #491) 用節目データ。
 *
 * `datasources/milestones.json` を JSON import で読み込む (Resurface 側
 * `pages/index.tsx` と同じ参照経路で揃える)。撤退方法・編集方法も同様で、
 * milestones.json の配列を `[]` にすれば全記事の Coordinate が消える。
 *
 * 型は `as readonly Milestone[]` で narrow する。`anchors.ts` 側に tone の
 * ランタイム検証はなく、不正値はサイレントに無視される (`computeCoordinates`
 * が tone:heavy 以外を Coordinate にし、表示層で更に tone:heavy を除外する)。
 */
const MILESTONES: readonly Milestone[] = milestonesData as readonly Milestone[];

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
          milestones={MILESTONES}
        />
      </Transition>
    </Layout>
  );
};

export default Post;
