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
 * 節目データ (`datasources/milestones.json`)。
 *
 * Coordinate (Issue #491) で「記事ごとの個人史座標」を算出するために使用する。
 * Resurface (Issue #492) / AnchorPage (Issue #493) と同じ JSON を共有しているが、
 * Issue #546 の判断で **集約せず各 page で個別 import** する設計を採用している
 * (撤退性 > DRY)。`src/lib/milestones.ts` のような集約点を作ると 1 行修正が
 * 3 page に同時影響し、page 単位での段階的撤退 (例: Post だけ `[]` にして
 * Coordinate だけ止める等) が困難になるため。詳細は Issue #546 / docs/ANCHOR.md
 * 「撤退性」節を参照。
 *
 * `as readonly Milestone[]` キャストは tsconfig.json の resolveJsonModule:true で
 * 取得される widen された型 (例: `tone: string`) を `Milestone`
 * (`tone: "neutral" | "light" | "heavy"`) に narrowing するため。
 * JSON データの妥当性は datasources 側で人手担保しており (`docs/MILESTONES.md`)、
 * `anchors.ts` 側にランタイム検証はない (将来 Issue #547 で Zod 等の導入を検討中)。
 * 不正な tone はサイレントに無視される (`computeCoordinates` が tone:heavy 以外を
 * Coordinate にし、表示層で更に tone:heavy を除外する)。
 *
 * 撤退方法: `datasources/milestones.json` の配列を `[]` にすれば全記事の
 * Coordinate が消える。編集方法は `docs/MILESTONES.md` を参照する。
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
