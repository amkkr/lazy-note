import { Transition } from "@headlessui/react";
import { css } from "../../styled-system/css";
import { CardSkeleton } from "../components/common/CardSkeleton";
import { Layout } from "../components/layouts/Layout";
import { HomePage } from "../components/pages/HomePage";
import { usePosts } from "../hooks/usePosts";

const enterStyles = css({ transition: "all 0.3s ease" });
const enterFromStyles = css({ opacity: 0, transform: "translateY(8px)" });
const enterToStyles = css({ opacity: 1, transform: "translateY(0)" });

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
        <Transition
          as="div"
          show={true}
          appear={true}
          enter={enterStyles}
          enterFrom={enterFromStyles}
          enterTo={enterToStyles}
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
