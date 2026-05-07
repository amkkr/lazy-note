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
        <Transition
          as="div"
          show={true}
          appear={true}
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
