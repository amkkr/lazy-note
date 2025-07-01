import { Link } from 'react-router-dom';
import { css } from '../../styled-system/css';
import { container, grid } from '../../styled-system/patterns';
import { usePosts } from '../hooks/usePosts';
import { Layout } from '../components/Layout';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { EmptyState } from '../components/common/EmptyState';
import { MetaInfo } from '../components/common/MetaInfo';

const Index = () => {
  const { posts, loading } = usePosts();

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Layout postCount={posts.length}>
      <div className={container({ maxWidth: '6xl', py: '16' })}>
          {posts.length === 0 ? (
            <EmptyState
              icon="📝"
              title="新しい記事をお楽しみに"
              description="まもなく素晴らしい記事が公開される予定です。創造性に満ちたコンテンツをお届けします。"
            />
          ) : (
            <div className={grid({ columns: { base: 1, md: 2, lg: 3 }, gap: '8' })}>
              {posts.map((post) => (
                <article 
                  key={post.id}
                  className={css({
                    bg: 'white',
                    borderRadius: 'xl',
                    overflow: 'hidden',
                    shadow: 'card',
                    border: '1px solid',
                    borderColor: 'surface.200',
                    transition: 'all 0.3s ease',
                    transform: 'translateY(0)',
                    _hover: {
                      shadow: 'card-hover',
                      transform: 'translateY(-8px)',
                      borderColor: 'primary.300'
                    }
                  })}
                >
                  <div className={css({
                    h: '2',
                    bg: 'linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f97316 100%)'
                  })} />
                  
                  <div className={css({ p: '6' })}>
                    <Link 
                      to={`/posts/${post.id}`}
                      className={css({
                        display: 'block',
                        textDecoration: 'none',
                        color: 'inherit'
                      })}
                    >
                      <h2 className={css({
                        fontSize: 'xl',
                        fontWeight: 'bold',
                        color: 'secondary.800',
                        mb: '3',
                        lineHeight: '1.4',
                        _hover: {
                          color: 'primary.600'
                        }
                      })}>
                        {post.title || '無題の記事'}
                      </h2>
                    </Link>
                    
                    <MetaInfo
                      createdAt={post.createdAt}
                      author={post.author}
                      variant="card"
                    />
                  </div>
                </article>
              ))}
            </div>
          )}
      </div>
    </Layout>
  );
};

export default Index;

