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
 * (認知負荷の局所化を優先)。`src/lib/milestones.ts` のような集約点を作ると、
 * 各 page を読む際に「この MILESTONES はどこから来てどう加工されたものか」を
 * 別ファイルまで追いかける必要が出るため、3 page で import 経路と narrowing
 * キャストを揃え、各 page の責務 (Coordinate / Resurface / AnchorPage のどれに
 * 渡すか) をその場で完結して読めるようにする。撤退の単位は docs/ANCHOR.md
 * 「撤退可能性」節のとおり **コンポーネント (Coordinate / Resurface) ごとの
 * `show` フラグ** が一次手段であり、JSON の `[]` 化は 3 経路まとめての停止 =
 * 二次手段である。
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
