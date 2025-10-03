import { LoadingSpinner } from "../components/common/LoadingSpinner";
import { Layout } from "../components/layouts/Layout";
import { HomePage } from "../components/pages/HomePage";
import { usePosts } from "../hooks/usePosts";

const Index = () => {
  const { posts, loading, currentPage, totalPages, setCurrentPage } =
    usePosts();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Layout postCount={posts.length}>
      <HomePage
        posts={posts}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
      />
    </Layout>
  );
};

export default Index;
