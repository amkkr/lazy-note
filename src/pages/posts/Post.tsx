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
import { SITE_NAME } from "../../lib/i18nLiterals";
import { parseMilestones } from "../../lib/milestonesSchema";
import {
  fadeInEnter,
  fadeInEnterFrom,
  fadeInEnterTo,
} from "../../styles/transitions";

/**
 * 節目データ (`datasources/milestones.json`)。
 *
 * このページでは Coordinate (Issue #491) で「記事ごとの個人史座標」を算出するために
 * 使用する。
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
 * このページでの実害: 不正要素が除外されることで、Coordinate に渡る前に弾かれる。
 *
 * 撤退方法: `datasources/milestones.json` の配列を `[]` にすれば全記事の
 * Coordinate が消える。編集方法は `docs/MILESTONES.md` を参照する。
 */
const MILESTONES: readonly Milestone[] = parseMilestones(milestonesData);

/**
 * Post ページの記事未検出時 EmptyState の表示文言定数 (Issue #753 7-b)。
 *
 * Issue #629 / #694 / #695 のロードマップに沿って、表示文言を JSX 直書きから
 * ファイル内トップレベル定数に外出しし、HomePage / PostDetailPage / Coordinate /
 * AnchorPage と方針を揃える。単一ファイル完結のため i18nLiterals.ts ではなく
 * ファイル内ローカル定数とする (`i18nLiterals.ts` 基準に沿う)。リテラル定数には
 * `as const` を付与して literal type を温存する。
 */
const POST_NOT_FOUND_TITLE = "記事が見つかりません" as const;
const POST_NOT_FOUND_DESCRIPTION =
  "お探しの記事は削除されたか、URLが間違っている可能性があります。" as const;
const POST_NOT_FOUND_ACTION_LABEL = "← 記事一覧に戻る" as const;

/**
 * 記事未検出時の `<title>` 文言 (React 19 ネイティブ metadata)。
 *
 * PostDetailPage が描画する `${記事タイトル} | Lazy Note` と同じサフィックス
 * 体系で、未検出 EmptyState 経路でもブラウザタブ / 共有カードに何のページか
 * 伝わるようにする。テンプレートリテラル 1 文字列で構築する (React 19 の
 * `<title>` は単一テキスト子のみ許容)。
 *
 * **ロード前 (loading 中) はあえて `<title>` を描画しない**: SPA 内遷移では
 * 直前ページの `<title>` がそのまま残り、初回ロード時は `index.html` の静的
 * `<title>Lazy Note</title>` (初期フォールバック) が効く。loading 用の
 * 専用タイトルを足すと一瞬チラつくため、解決後 (記事 or 未検出) に初めて
 * `<title>` を確定させる方針とする。
 */
const POST_NOT_FOUND_DOCUMENT_TITLE =
  `${POST_NOT_FOUND_TITLE} | ${SITE_NAME}` as const;

const Post = () => {
  const { timestamp } = useParams<{ timestamp: string }>();
  const { post, loading, notFound } = usePost(timestamp);
  const { olderPost, newerPost } = useAdjacentPosts(timestamp);

  if (notFound || (!loading && !post)) {
    return (
      <>
        {/* React 19 ネイティブ Document Metadata。未検出時もタブ文言を確定
            させる (1 ルート 1 タイトル。EmptyState は単独描画なので他の
            <title> と共存しない)。 */}
        <title>{POST_NOT_FOUND_DOCUMENT_TITLE}</title>
        <EmptyState
          icon={FileQuestion}
          title={POST_NOT_FOUND_TITLE}
          description={POST_NOT_FOUND_DESCRIPTION}
          action={{
            label: POST_NOT_FOUND_ACTION_LABEL,
            href: "/",
          }}
        />
      </>
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
