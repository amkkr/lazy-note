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
        maxWidth: 'container',
        margin: '0 auto',
        padding: 'content'
      })}>
          {posts.length === 0 ? (
            <EmptyState
              icon="📝"
              title="新しい記事をお楽しみに"
              description="まもなく素晴らしい記事が公開される予定です。創造性に満ちたコンテンツをお届けします。"
            />
          ) : (
            <div className={css({
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: 'card'
            })}>
              {posts.map((post) => (
                <article 
                  key={post.id}
                  className={css({
                    background: 'white',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    boxShadow: 'card',
                    border: '1px solid',
                    borderColor: 'surface.200',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 'card-hover'
                    }
                  })}
                >
                  <div className={css({
                    height: '4px',
                    background: 'gradients.cardStripe'
                  })} />
                  
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
                        color: 'secondary.700',
                        marginBottom: '12px',
                        lineHeight: '1.4',
                        '&:hover': {
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

