import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getAllPosts, type Post } from '../lib/markdown';
import { css } from '../../styled-system/css';
import { container, vstack, hstack } from '../../styled-system/patterns';

const Index = () => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPosts = async () => {
      try {
        const allPosts = await getAllPosts();
        setPosts(allPosts);
      } catch (error) {
        console.error('Failed to load posts:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  if (loading) {
    return (
      <div className={container({ maxWidth: '4xl', py: '8' })}>
        <div className={css({ textAlign: 'center', py: '8' })}>
          読み込み中...
        </div>
      </div>
    );
  }

  return (
    <div className={container({ maxWidth: '4xl', py: '8' })}>
      <div className={vstack({ gap: '8', alignItems: 'stretch' })}>
        <header className={css({ textAlign: 'center', py: '8' })}>
          <h1 className={css({ 
            fontSize: '3xl', 
            fontWeight: 'bold',
            color: 'gray.900',
            mb: '4'
          })}>
            ブログ
          </h1>
          <p className={css({ 
            color: 'gray.600',
            fontSize: 'lg'
          })}>
            記事一覧
          </p>
        </header>

        <main>
          {posts.length === 0 ? (
            <div className={css({ 
              textAlign: 'center', 
              py: '12',
              color: 'gray.500'
            })}>
              記事がありません
            </div>
          ) : (
            <div className={vstack({ gap: '6', alignItems: 'stretch' })}>
              {posts.map((post) => (
                <article 
                  key={post.id}
                  className={css({
                    border: '1px solid',
                    borderColor: 'gray.200',
                    rounded: 'lg',
                    p: '6',
                    bg: 'white',
                    shadow: 'sm',
                    _hover: {
                      shadow: 'md',
                      transform: 'translateY(-1px)',
                      transition: 'all 0.2s'
                    }
                  })}
                >
                  <div className={vstack({ gap: '4', alignItems: 'stretch' })}>
                    <Link 
                      to={`/posts/${post.id}`}
                      className={css({
                        display: 'block',
                        textDecoration: 'none',
                        color: 'inherit',
                        _hover: { color: 'blue.600' }
                      })}
                    >
                      <h2 className={css({
                        fontSize: '2xl',
                        fontWeight: 'bold',
                        color: 'gray.900',
                        mb: '2'
                      })}>
                        {post.title}
                      </h2>
                    </Link>
                    
                    <div className={hstack({ gap: '4', justify: 'space-between' })}>
                      <div className={css({
                        color: 'gray.600',
                        fontSize: 'sm'
                      })}>
                        {post.createdAt}
                      </div>
                      <div className={css({
                        color: 'gray.600',
                        fontSize: 'sm'
                      })}>
                        {post.author}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default Index;