import { render, screen, within } from "@testing-library/react";
import { axe } from "jest-axe";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { Milestone } from "../../../lib/anchors";
import type { PostSummary } from "../../../lib/markdown";
import { buildPulseForbiddenVocabRegex } from "../../../test/forbiddenVocab";
import { AnchorPage } from "../AnchorPage";

/**
 * AnchorPage (Issue #493 / Phase 2 of Anchor) のテスト。
 *
 * 「個人史タイムライン」ページのため、Coordinate (顔1) と Resurface (顔3) の
 * 思想とは異なる切り口で:
 * - tone:heavy は `showHeavy` の二相ポリシーで扱う (Issue #839):
 *   - 読者面 (`showHeavy={false}` = デフォルト): heavy の節目・座標を抑制する
 *     (ナビ統合で /anchor が読者導線化したため、重い節目を不意に出さない配慮)。
 *   - 運営者面 (`showHeavy={true}`): heavy も含めて全件表示する (運用画面の
 *     透明性 = 全件確認)。
 *   抑制は anchors.ts の `excludeTones` を再利用する (表示層に tone 比較を
 *   持ち込まない)。本ファイルは両相を Tripwire で固定する。
 * - 各記事の座標を控えめに一覧表示する (過剰可視化禁止 = グラフ/統計なし)
 * - 空状態は穏やかに表示する (「データなし」のような断定的表現を避ける)
 *
 * テストはコンポーネント単体に props を渡して回帰させる。読み込み (usePosts /
 * JSON import) は親 (`pages/anchor.tsx`) 側の責務として AnchorPage は純粋に
 * レンダリングに専念する設計とする (HomePage / Resurface と同じ責務分離)。
 */

const baseMilestones: readonly Milestone[] = [
  { date: "2025-08-05", label: "休職開始", tone: "heavy" },
  { date: "2025-08-26", label: "サイト開設", tone: "neutral" },
  { date: "2025-09-05", label: "社会復帰", tone: "light" },
];

const basePosts: PostSummary[] = [
  {
    id: "20250826031705",
    title: "最初の記事",
    createdAt: "2025-08-26",
    author: "amkkr",
    excerpt: "本サイト最初の記事",
    readingTimeMinutes: 1,
  },
  {
    id: "20250905120000",
    title: "復帰の記事",
    createdAt: "2025-09-05",
    author: "amkkr",
    excerpt: "社会復帰当日の記事",
    readingTimeMinutes: 1,
  },
];

/**
 * 個別の PostSummary を組み立てるヘルパー。
 *
 * id ごとに異なるタイトル・excerpt を与えたい Tripwire 系テスト (= 入力順保持
 * テスト等) の重複コードを削減する。id 以外は必要なフィールドだけを overrides で
 * 渡し、未指定は無害なダミー値で埋める。
 */
const buildPostSummary = (
  overrides: Partial<PostSummary> & { id: string },
): PostSummary => ({
  title: `記事 ${overrides.id}`,
  createdAt: "",
  author: "amkkr",
  excerpt: "",
  readingTimeMinutes: 1,
  ...overrides,
});

describe("AnchorPage", () => {
  describe("節目一覧", () => {
    it("showHeavy 指定時は登録された全ての節目を一覧表示できる", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} showHeavy />
        </MemoryRouter>,
      );

      // heavy を含む 3 件すべてを描画する (運用全件確認なので隠さない)
      const milestoneList = screen.getByRole("list", { name: "節目一覧" });
      const items = within(milestoneList).getAllByRole("listitem");
      expect(items).toHaveLength(3);

      expect(within(milestoneList).getByText(/休職開始/)).toBeInTheDocument();
      expect(within(milestoneList).getByText(/サイト開設/)).toBeInTheDocument();
      expect(within(milestoneList).getByText(/社会復帰/)).toBeInTheDocument();
    });

    it("showHeavy 指定時は各節目に登録日を併記できる", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} showHeavy />
        </MemoryRouter>,
      );

      const milestoneList = screen.getByRole("list", { name: "節目一覧" });
      // 2025-08-05 は heavy 節目 (休職開始) の登録日。showHeavy で表示される。
      expect(within(milestoneList).getByText(/2025-08-05/)).toBeInTheDocument();
      expect(within(milestoneList).getByText(/2025-08-26/)).toBeInTheDocument();
      expect(within(milestoneList).getByText(/2025-09-05/)).toBeInTheDocument();
    });

    it("節目が 0 件のとき穏やかな空状態として表示される", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={[]} />
        </MemoryRouter>,
      );

      // 「データがありません」「エラー」のような断定的文言ではなく、
      // 寄り添う文言として「まだ節目が記録されていません」を表示する
      expect(
        screen.getByText(/まだ節目が記録されていません/),
      ).toBeInTheDocument();
      // 節目リスト自体は描画されない
      expect(
        screen.queryByRole("list", { name: "節目一覧" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("各記事の座標一覧", () => {
    it("各記事のタイトルを表示できる", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      expect(within(postSection).getByText("最初の記事")).toBeInTheDocument();
      expect(within(postSection).getByText("復帰の記事")).toBeInTheDocument();
    });

    it("showHeavy 指定時は各記事の座標 (heavy 含む) を一覧表示できる", () => {
      // 復帰の記事 (2025-09-05 公開) は全 3 節目より後 or 同日のため、
      // 「休職開始 から 31 日目」「サイト開設 から 10 日目」「社会復帰 から 0 日目」
      // が描画される。showHeavy では heavy も隠さない。
      // 最初の記事 (2025-08-26 公開) は「休職開始 から 21 日目」「サイト開設 から 0 日目」
      // (社会復帰は未来のため除外)。
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} showHeavy />
        </MemoryRouter>,
      );

      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      // heavy を含む節目ラベルが両記事に現れる (休職開始: 2 記事に登場)
      // - 最初の記事 (2025-08-26 公開): 「休職開始 から 21 日目」
      // - 復帰の記事 (2025-09-05 公開): 「休職開始 から 31 日目」
      const heavyMatches = within(postSection).getAllByText(/休職開始/);
      expect(heavyMatches).toHaveLength(2);
      // 復帰記事のみ 2025-09-05 当日に到達するため、社会復帰は 1 記事に出る
      expect(within(postSection).getByText(/社会復帰/)).toBeInTheDocument();
      // 復帰記事には「31 日目」が出る (休職開始から 31 日)
      expect(within(postSection).getByText(/31 日目/)).toBeInTheDocument();
    });

    /**
     * 1 記事分の座標表示を期待行と比較する補助関数。
     *
     * 各記事 li 内の座標は `[data-tone]` 属性付き span として描画されるため、
     * それを **index 順に** 取り出して tone と表示文言を完全一致で照合する
     * (= 件数・順序・tone・テキストの同時固定)。
     */
    const verifyPostCoordinates = (
      postItem: HTMLLIElement,
      expectedRows: readonly {
        label: string;
        tone: Milestone["tone"];
        daysSince: number;
      }[],
    ): void => {
      const coordinateSpans = postItem.querySelectorAll("[data-tone]");
      expect(coordinateSpans).toHaveLength(expectedRows.length);

      for (const [index, row] of expectedRows.entries()) {
        const span = coordinateSpans[index];
        expect(span?.getAttribute("data-tone")).toBe(row.tone);
        expect(span?.textContent).toBe(
          `${row.label} から ${row.daysSince} 日目`,
        );
      }
    };

    /**
     * 座標行の描画順・完全一致テキストの Tripwire。
     *
     * 上の「showHeavy 指定時は各記事の座標 (heavy 含む) を一覧表示できる」は
     * 個別の regex 照合なので、`entry.coordinates` を reverse / re-sort する変更を
     * 素通りさせてしまう。本テストは各記事の座標 span を index 順に完全一致で
     * 照合し、「computeCoordinates が返した順序 (= milestones の入力順) をそのまま
     * 描画する」契約を構造的に固定する。
     *
     * 期待値は手計算 (baseMilestones = 休職開始 2025-08-05 / サイト開設 2025-08-26 /
     * 社会復帰 2025-09-05、AnchorPage は showHeavy で heavy も表示する):
     * - 最初の記事 (2025-08-26 公開): 休職開始 = 8/5 → 8/26 で 21 日目 /
     *   サイト開設 = 同日で 0 日目 / 社会復帰 (2025-09-05) は未来のため除外
     * - 復帰の記事 (2025-09-05 公開): 休職開始 = 8/5 → 9/5 で 26 + 5 = 31 日目 /
     *   サイト開設 = 8/26 → 9/5 で 5 + 5 = 10 日目 / 社会復帰 = 同日で 0 日目
     */
    it("showHeavy 指定時の各記事の座標を milestones の入力順どおり完全一致で描画する", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} showHeavy />
        </MemoryRouter>,
      );

      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });

      const getPostItem = (postId: string): HTMLLIElement => {
        const postItem = postSection.querySelector<HTMLLIElement>(
          `li[data-post-id="${postId}"]`,
        );
        if (postItem === null) {
          throw new Error(`postItem for ${postId} not found`);
        }
        return postItem;
      };

      // 最初の記事 (2025-08-26 公開)
      verifyPostCoordinates(getPostItem("20250826031705"), [
        { label: "休職開始", tone: "heavy", daysSince: 21 },
        { label: "サイト開設", tone: "neutral", daysSince: 0 },
      ]);

      // 復帰の記事 (2025-09-05 公開)
      verifyPostCoordinates(getPostItem("20250905120000"), [
        { label: "休職開始", tone: "heavy", daysSince: 31 },
        { label: "サイト開設", tone: "neutral", daysSince: 10 },
        { label: "社会復帰", tone: "light", daysSince: 0 },
      ]);
    });

    it("座標 0 件の記事は穏やかな空状態を表示する", () => {
      // 全節目より前 (2025-08-04 以前) に公開された記事の場合、座標は 0 件になる
      const earlyPost: PostSummary = {
        id: "20250801000000",
        title: "節目より前の記事",
        createdAt: "2025-08-01",
        author: "amkkr",
        excerpt: "節目以前",
        readingTimeMinutes: 1,
      };

      render(
        <MemoryRouter>
          <AnchorPage posts={[earlyPost]} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 「該当する節目はまだありません」のような穏やかな表現を出す
      expect(
        screen.getByText(/まだ通過した節目はありません/),
      ).toBeInTheDocument();
    });

    it("記事が 0 件のとき穏やかな空状態として表示される", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={[]} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 「記事がありません」のような断定ではなく、寄り添う文言にする
      expect(screen.getByText(/まだ記事がありません/)).toBeInTheDocument();
      // 各記事の座標 region 自体は出さない
      expect(
        screen.queryByRole("region", { name: "各記事の座標" }),
      ).not.toBeInTheDocument();
    });

    it("publishedAt 推定不可な id の記事 (テスト用 id 等) はスキップして描画しない", () => {
      // YYYYMMDDhhmmss 形式でない id は inferPublishedAt が undefined を返すため、
      // 座標を計算できない。AnchorPage はそのような記事を素直にスキップする。
      const invalidPost: PostSummary = {
        id: "test-invalid-id",
        title: "壊れた id の記事",
        createdAt: "2025-09-05",
        author: "amkkr",
        excerpt: "テスト",
        readingTimeMinutes: 1,
      };

      render(
        <MemoryRouter>
          <AnchorPage
            posts={[invalidPost, ...basePosts]}
            milestones={baseMilestones}
          />
        </MemoryRouter>,
      );

      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      // 壊れた id の記事は描画されない
      expect(
        within(postSection).queryByText("壊れた id の記事"),
      ).not.toBeInTheDocument();
      // 正常な記事は描画される
      expect(within(postSection).getByText("最初の記事")).toBeInTheDocument();
    });
  });

  describe("publishedAt 推定不可な記事のスキップ件数注記 (Issue #544)", () => {
    it("スキップ対象が 0 件のとき注記は表示しない", () => {
      // basePosts は 2 件とも YYYYMMDDhhmmss 形式の正常 id なので、
      // スキップは発生しない。このとき注記は描画されない。
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      expect(
        screen.queryByText(/publishedAt 推定不可でスキップした記事/),
      ).not.toBeInTheDocument();
      // role="note" でも検出されないこと (= ノイズ削減の意図)
      expect(screen.queryByRole("note")).not.toBeInTheDocument();
    });

    it("スキップ対象が 1 件のとき件数注記を表示する", () => {
      const invalidPost: PostSummary = {
        id: "test-invalid-id",
        title: "壊れた id の記事",
        createdAt: "2025-09-05",
        author: "amkkr",
        excerpt: "テスト",
        readingTimeMinutes: 1,
      };

      render(
        <MemoryRouter>
          <AnchorPage
            posts={[invalidPost, ...basePosts]}
            milestones={baseMilestones}
          />
        </MemoryRouter>,
      );

      // 注記が role="note" として検出できる
      const note = screen.getByRole("note");
      expect(note).toBeInTheDocument();
      expect(note).toHaveTextContent(
        "publishedAt 推定不可でスキップした記事: 1 件",
      );
    });

    it("スキップ対象が複数件のとき件数を正しく集計して表示する", () => {
      const invalidPosts: PostSummary[] = [
        {
          id: "test-invalid-1",
          title: "壊れた id 1",
          createdAt: "2025-09-05",
          author: "amkkr",
          excerpt: "テスト1",
          readingTimeMinutes: 1,
        },
        {
          id: "broken",
          title: "壊れた id 2",
          createdAt: "2025-09-05",
          author: "amkkr",
          excerpt: "テスト2",
          readingTimeMinutes: 1,
        },
        {
          id: "12345",
          title: "桁数が足りない id",
          createdAt: "2025-09-05",
          author: "amkkr",
          excerpt: "テスト3",
          readingTimeMinutes: 1,
        },
      ];

      render(
        <MemoryRouter>
          <AnchorPage
            posts={[...invalidPosts, ...basePosts]}
            milestones={baseMilestones}
          />
        </MemoryRouter>,
      );

      const note = screen.getByRole("note");
      expect(note).toHaveTextContent(
        "publishedAt 推定不可でスキップした記事: 3 件",
      );
    });

    it("全記事が publishedAt 推定不可のとき空 list を出さず穏やかな空状態テキストにフォールバックする", () => {
      // 全 posts が壊れた id の場合、`postEntries.length === 0` となる。
      // ここで空 `<ul>` を描画すると「各記事の座標」見出し + 空 list + 注記の
      // 不自然な画面になるため、フォールバックとして 1 行の空状態テキスト
      // (= 全件スキップである事実を件数とともに伝える) のみを出す。
      const invalidPosts: PostSummary[] = [
        {
          id: "test-invalid-1",
          title: "壊れた id 1",
          createdAt: "2025-09-05",
          author: "amkkr",
          excerpt: "テスト1",
          readingTimeMinutes: 1,
        },
        {
          id: "test-invalid-2",
          title: "壊れた id 2",
          createdAt: "2025-09-05",
          author: "amkkr",
          excerpt: "テスト2",
          readingTimeMinutes: 1,
        },
      ];

      render(
        <MemoryRouter>
          <AnchorPage posts={invalidPosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 各記事の座標 section 自体は出る (posts.length > 0 なので)
      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      expect(postSection).toBeInTheDocument();
      // フォールバックテキストが描画される
      const note = within(postSection).getByRole("note");
      expect(note).toHaveTextContent(
        "全記事が publishedAt 推定不可のためスキップしました (2 件)",
      );
      // 空 `<ul>` (= 各記事を並べる list) は出さない
      expect(within(postSection).queryByRole("list")).not.toBeInTheDocument();
      // 通常の件数注記 (「publishedAt 推定不可でスキップした記事: N 件」) は出さない
      // (= フォールバックテキストに件数を埋め込んでいるため二重表示を避ける)
      expect(
        within(postSection).queryByText(
          /publishedAt 推定不可でスキップした記事:/,
        ),
      ).not.toBeInTheDocument();
    });

    it("posts が 0 件のとき注記そのものを出さない (各記事の座標 section ごと非表示のため)", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={[]} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 各記事の座標 region 自体が出ないため、注記も同伴して出ない
      expect(screen.queryByRole("note")).not.toBeInTheDocument();
      expect(
        screen.queryByText(/publishedAt 推定不可でスキップした記事/),
      ).not.toBeInTheDocument();
    });
  });

  describe("過剰可視化の禁止", () => {
    it("投稿頻度に関する文言を含まない", () => {
      const { container } = render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 「投稿頻度」「平均間隔」「ペース」など Pulse を切った思想に反する語彙
      // が AnchorPage には現れない。語彙の網羅は src/test/forbiddenVocab.ts に
      // 集約してあり、Coordinate / Resurface / HomePage と共通の禁則語彙集を
      // 参照する (Issue #540)。
      const text = container.textContent ?? "";
      expect(text).not.toMatch(buildPulseForbiddenVocabRegex());
    });

    it("グラフ要素 (canvas) を含まない", () => {
      const { container } = render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 統計グラフのような視覚化を出さないため、canvas は描画しない。
      // svg は将来 Lucide 等の小型アイコン (Calendar, Clock 等) を追加した
      // 際に false positive となるためここでは検査しない (アイコンとしての
      // svg は許容)。Recharts / Chart.js のような可視化ライブラリの混入は
      // 「依存追加禁止」の別ルートで検知する方針。
      expect(container.querySelector("canvas")).toBeNull();
    });
  });

  describe("a11y", () => {
    it("ページの見出し階層を構築できる (h1 が 1 件存在する)", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // ページのトップは h1 ("Anchor") から始まる
      const h1 = screen.getByRole("heading", { level: 1 });
      expect(h1).toBeInTheDocument();
    });

    it("axe a11y 違反が 0 件である", async () => {
      const { container } = render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it("空状態でも axe a11y 違反が 0 件である", async () => {
      const { container } = render(
        <MemoryRouter>
          <AnchorPage posts={[]} milestones={[]} />
        </MemoryRouter>,
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe("デザイントークン (Tripwire)", () => {
    it("showHeavy 指定時は節目一覧の各 li が tone を data-tone 属性として宣言する", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} showHeavy />
        </MemoryRouter>,
      );

      const milestoneList = screen.getByRole("list", { name: "節目一覧" });
      const items = within(milestoneList).getAllByRole("listitem");
      // 入力順 (heavy / neutral / light) と同じ並び
      expect(items[0]).toHaveAttribute("data-tone", "heavy");
      expect(items[1]).toHaveAttribute("data-tone", "neutral");
      expect(items[2]).toHaveAttribute("data-tone", "light");
    });
  });

  /**
   * Issue #566: 各記事の座標セクションでの表示順 Tripwire。
   *
   * AnchorPage.tsx の JSDoc 契約 (「入力 posts 配列の順序をそのまま保持して描画する」
   * = 内部で id / 日付でソートしない) を、入力順が呼び出し側 (= pages/anchor.tsx)
   * が決めた順序のまま DOM に反映されることで構造的に担保する。
   *
   * 同ファイルの「節目一覧の各 li が tone を data-tone 属性として宣言する」テスト
   * (= milestones 側の入力順保持 Tripwire) と対称的に、本テストは posts 側の
   * 入力順保持 Tripwire として位置づける。
   *
   * **本テストが検証するのは AnchorPage が posts を内部で再ソートしないこと**で
   * あり、使用する id は実在記事である必要はない (id の大小関係のみが本テストの
   * 意味を成す)。そのため入力は合成 id (2024 年台 = 実記事と衝突しない) を使う。
   *
   * 失敗が示唆する変更:
   * - AnchorPage 内部で posts を reverse / re-sort するコードが混入した
   * - AnchorPage の表示順契約自体を意図的に変更した
   *   (= JSDoc 契約 + pages/anchor.tsx の sort + 本テストを同時に更新する必要)
   */
  describe("posts 入力順保持 (Tripwire / Issue #566)", () => {
    it("逆順 (B, A) で渡したとき DOM 出現順も逆順 (B → A) になる", () => {
      // Issue #566 受け入れ基準: 「posts を [id=B, id=A] (id 順不同) の順で
      // 渡したとき、リスト DOM の出現順が B → A であること」を直接 assert する。
      // ここでは id の大小関係を明示するため A < B (id 昇順比較で A が小さい)
      // となる 2 件を用意し、「id 降順 (B → A) で渡したら DOM も B → A」を
      // 検証する (= AnchorPage が id 昇順へ並び替えると失敗する)。
      //
      // Issue #624 AC3 / PR #617 M3: 順序検証は `data-post-id` 構造属性ベース
      // で行う。textContent 経由のタイトル文字列マッチに比べ、ID は post の
      // 一次キーであり、タイトル文言変更や i18n 化・サニタイズ追加といった
      // 表示加工に左右されない構造的根拠で順序を固定できる。
      const postA = buildPostSummary({
        id: "20240101000000",
        title: "記事 A (id 小)",
        createdAt: "2024-01-01",
        excerpt: "id 小",
      });
      const postB = buildPostSummary({
        id: "20241231000000",
        title: "記事 B (id 大)",
        createdAt: "2024-12-31",
        excerpt: "id 大",
      });

      render(
        <MemoryRouter>
          <AnchorPage
            posts={[postB, postA]}
            milestones={baseMilestones}
            showHeavy
          />
        </MemoryRouter>,
      );

      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      const postList = within(postSection).getByRole("list");
      const items = within(postList).getAllByRole("listitem");

      expect(items).toHaveLength(2);
      // 入力順 [B, A] と完全一致 (内部で reverse / 再 sort されていない)
      // `data-post-id` の出現順を post.id 列として直接比較する
      const postIdOrder = items.map((li) => li.getAttribute("data-post-id"));
      expect(postIdOrder).toEqual([postB.id, postA.id]);
    });

    it("publishedAt 推定不可な記事をスキップしても、残った記事間の入力相対順を保つ", () => {
      // (スキップ自体の検証は同ファイルの別テストで済んでいる。本テストは
      // スキップ後の残余配列の順序保持のみを対象とする。)
      // 入力配列に壊れた id を混ぜても、スキップ後の残余配列順 (= 入力相対順)
      // を AnchorPage 内部で並び替えないことを検証する。
      // [B, invalid, A] と渡したら、DOM は [B, A] となる (invalid 除外、残余は
      // 入力相対順保持)。「スキップ後の整列に乗じて id 順へ並び替える」コード
      // 混入を検知する。
      //
      // Issue #624 AC3 / PR #617 M3: 順序検証は上の test 同様 `data-post-id`
      // 構造属性ベースで行う。
      const postA = buildPostSummary({
        id: "20240101000000",
        title: "記事 A (id 小)",
        createdAt: "2024-01-01",
        excerpt: "id 小",
      });
      const postB = buildPostSummary({
        id: "20241231000000",
        title: "記事 B (id 大)",
        createdAt: "2024-12-31",
        excerpt: "id 大",
      });
      const invalidPost = buildPostSummary({
        id: "test-invalid",
        title: "壊れた id (スキップ対象)",
        createdAt: "2024-06-01",
        excerpt: "推定不可",
      });

      render(
        <MemoryRouter>
          <AnchorPage
            posts={[postB, invalidPost, postA]}
            milestones={baseMilestones}
            showHeavy
          />
        </MemoryRouter>,
      );

      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      const postList = within(postSection).getByRole("list");
      const items = within(postList).getAllByRole("listitem");

      // invalid をスキップした 2 件のみ描画される (= 残余配列の順序保持の前提)
      expect(items).toHaveLength(2);
      // 入力相対順 [B, A] が DOM 出現順に保持される
      // `data-post-id` の出現順を post.id 列として直接比較する
      const postIdOrder = items.map((li) => li.getAttribute("data-post-id"));
      expect(postIdOrder).toEqual([postB.id, postA.id]);
    });
  });

  describe("showHeavy による heavy 抑制 (Issue #839)", () => {
    it("showHeavy 未指定 (デフォルト) のとき data-tone=heavy の要素を一切描画しない", () => {
      const { container } = render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // 節目一覧の li と各記事の座標 span の両方を含め、heavy は 1 件も出ない。
      // (座標側の抑制が「最重要・落とし穴」: computeCoordinates にも excludeTones
      //  を渡さないと座標 span に heavy が残ってしまう)
      expect(container.querySelector('[data-tone="heavy"]')).toBeNull();
    });

    it("showHeavy 未指定のとき節目一覧から heavy 節目 (休職開始) を抑制する", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      const milestoneList = screen.getByRole("list", { name: "節目一覧" });
      const items = within(milestoneList).getAllByRole("listitem");
      // heavy (休職開始) を抑制し、neutral / light の 2 件のみ残る
      expect(items).toHaveLength(2);
      expect(
        within(milestoneList).queryByText(/休職開始/),
      ).not.toBeInTheDocument();
      expect(within(milestoneList).getByText(/サイト開設/)).toBeInTheDocument();
      expect(within(milestoneList).getByText(/社会復帰/)).toBeInTheDocument();
    });

    it("showHeavy 未指定のとき各記事の座標から heavy 座標 (休職開始) を抑制する", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      // 休職開始 (heavy) は各記事の座標一覧にも出ない (= 座標側抑制)
      expect(
        within(postSection).queryByText(/休職開始/),
      ).not.toBeInTheDocument();
      expect(postSection.querySelector('[data-tone="heavy"]')).toBeNull();
      // neutral 座標 (サイト開設) は両記事に残る
      expect(
        within(postSection).getAllByText(/サイト開設/).length,
      ).toBeGreaterThan(0);
    });

    it("showHeavy={true} のとき heavy 節目・heavy 座標を負回帰として表示する", () => {
      const { container } = render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} showHeavy />
        </MemoryRouter>,
      );

      // 負回帰: showHeavy で data-tone=heavy が (節目 li / 座標 span に) 復活する
      expect(container.querySelector('[data-tone="heavy"]')).not.toBeNull();
      const milestoneList = screen.getByRole("list", { name: "節目一覧" });
      expect(within(milestoneList).getByText(/休職開始/)).toBeInTheDocument();
      const postSection = screen.getByRole("region", {
        name: "各記事の座標",
      });
      expect(
        within(postSection).getAllByText(/休職開始/).length,
      ).toBeGreaterThan(0);
    });
  });

  describe("サイトの読み方 説明 (Issue #839)", () => {
    it("『サイトの読み方』を伝える説明文を冒頭に表示する", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      expect(screen.getByText(/サイトの読み方/)).toBeInTheDocument();
    });

    it("説明文 (reading-guide) が Pulse 禁則語彙に該当しない", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // テスト名どおり「説明文 (ANCHOR_PAGE_READING_GUIDE) 段落」のみにスコープを
      // 絞る (ページ全体の禁則語彙検査は別テスト "投稿頻度に関する文言を含まない"
      // が担う)。Footer.test.tsx が link.textContent でスコープを絞るのと同じ流儀。
      const readingGuide = screen.getByText(/サイトの読み方/);
      const text = readingGuide.textContent ?? "";
      expect(text).not.toMatch(buildPulseForbiddenVocabRegex());
    });
  });

  describe("Document Metadata (React 19 ネイティブ metadata)", () => {
    it("robots メタタグに noindex,follow を出力できる (クローラ制御 / Issue #839)", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      const robots = document.head.querySelector('meta[name="robots"]');
      expect(robots).not.toBeNull();
      expect(robots?.getAttribute("content")).toBe("noindex,follow");
    });

    it("ページ名とサイト名を連結した document.title にできる", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      // `Anchor | Lazy Note` 形式 (テンプレートリテラル 1 文字列)。
      expect(document.title).toBe("Anchor | Lazy Note");
    });

    it("description メタタグを head に 1 つだけ出力できる", () => {
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      const metas = document.head.querySelectorAll('meta[name="description"]');
      expect(metas).toHaveLength(1);
      expect(metas[0]?.getAttribute("content")).toBe(
        "登録された節目と、各記事の座標を一覧表示します。",
      );
    });

    it("ページ最上位で title を 1 つだけ描画する (複数 title を hoist しない)", () => {
      // View Transition 共存検証: 1 ルート 1 タイトルの設計確認。
      render(
        <MemoryRouter>
          <AnchorPage posts={basePosts} milestones={baseMilestones} />
        </MemoryRouter>,
      );

      expect(document.head.querySelectorAll("title")).toHaveLength(1);
    });
  });
});
