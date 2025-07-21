import { Link } from 'react-router-dom';
import { css } from '../../styled-system/css';
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
      <div className={css({
        maxWidth: '900px',
        margin: '0 auto',
        padding: 'content',
        paddingX: '32px'
      })}>
          {posts.length === 0 ? (
            <EmptyState
              icon="📝"
              title="新しい記事をお楽しみに"
              description="まもなく素晴らしい記事が公開される予定です。創造性に満ちたコンテンツをお届けします。"
            />
          ) : (
            <div className={css({
              display: 'flex',
              flexDirection: 'column',
              gap: '32px',
              paddingTop: '12px'
            })}>
              {posts.map((post) => (
                <article 
                  key={post.id}
                  className={css({
                    background: 'bg.1',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: 'card',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 'card-hover'
                    }
                  })}
                >
                  <div className={css({ 
                    padding: 'card',
                    paddingBottom: '16px',
                    paddingX: '12px',
                    borderBottom: '1px solid',
                    borderColor: 'surface.200'
                  })}>
                    <MetaInfo
                      createdAt={post.createdAt}
                      author={post.author}
                      variant="card"
                    />
                  </div>
                  
                  <div className={css({ padding: 'card' })}>
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
                        color: 'fg.1',
                        lineHeight: '1.4',
                        margin: '0 12px 12px 12px',
                        '&:hover': {
                          color: 'blue.light'
                        }
                      })}>
                        {post.title || '無題の記事'}
                      </h2>
                    </Link>
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

