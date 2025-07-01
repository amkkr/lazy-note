import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getPost, type Post } from '../../lib/markdown';
import { css } from '../../../styled-system/css';
import { container, vstack, hstack } from '../../../styled-system/patterns';

const PostDetail = () => {
  const { timestamp } = useParams<{ timestamp: string }>();
  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    const loadPost = async () => {
      if (!timestamp) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      try {
        const postData = await getPost(timestamp);
        if (postData) {
          setPost(postData);
        } else {
          setNotFound(true);
        }
      } catch (error) {
        console.error('Failed to load post:', error);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [timestamp]);

  if (loading) {
    return (
      <div className={container({ maxWidth: '4xl', py: '8' })}>
        <div className={css({ textAlign: 'center', py: '8' })}>
          読み込み中...
        </div>
      </div>
    );
  }

  if (notFound || !post) {
    return (
      <div className={container({ maxWidth: '4xl', py: '8' })}>
        <div className={vstack({ gap: '4', alignItems: 'center', py: '8' })}>
          <div className={css({
            fontSize: '2xl',
            fontWeight: 'bold',
            color: 'gray.900'
          })}>
            記事が見つかりません
          </div>
          <Link 
            to="/"
            className={css({
              color: 'blue.600',
              textDecoration: 'underline',
              _hover: { color: 'blue.800' }
            })}
          >
            記事一覧に戻る
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={container({ maxWidth: '4xl', py: '8' })}>
      <div className={vstack({ gap: '8', alignItems: 'stretch' })}>
        <nav className={css({ py: '4' })}>
          <Link 
            to="/"
            className={css({
              color: 'blue.600',
              textDecoration: 'underline',
              _hover: { color: 'blue.800' }
            })}
          >
            ← 記事一覧に戻る
          </Link>
        </nav>

        <article className={css({
          bg: 'white',
          rounded: 'lg',
          p: '8',
          shadow: 'sm',
          border: '1px solid',
          borderColor: 'gray.200'
        })}>
          <header className={vstack({ gap: '4', alignItems: 'stretch', mb: '8' })}>
            <h1 className={css({
              fontSize: '3xl',
              fontWeight: 'bold',
              color: 'gray.900',
              lineHeight: '1.2'
            })}>
              {post.title}
            </h1>
            
            <div className={hstack({ gap: '6', justify: 'space-between' })}>
              <div className={css({
                color: 'gray.600',
                fontSize: 'sm'
              })}>
                投稿日時: {post.createdAt}
              </div>
              <div className={css({
                color: 'gray.600',
                fontSize: 'sm'
              })}>
                筆者: {post.author}
              </div>
            </div>
            
            <hr className={css({
              borderColor: 'gray.200',
              my: '4'
            })} />
          </header>

          <main 
            className={css({
              prose: true,
              maxWidth: 'none',
              '& h1, & h2, & h3, & h4, & h5, & h6': {
                color: 'gray.900',
                fontWeight: 'bold',
                mt: '6',
                mb: '4'
              },
              '& h1': { fontSize: '2xl' },
              '& h2': { fontSize: 'xl' },
              '& h3': { fontSize: 'lg' },
              '& p': {
                mb: '4',
                lineHeight: '1.7',
                color: 'gray.700'
              },
              '& ul, & ol': {
                pl: '6',
                mb: '4'
              },
              '& li': {
                mb: '2',
                color: 'gray.700'
              },
              '& code': {
                bg: 'gray.100',
                px: '2',
                py: '1',
                rounded: 'sm',
                fontSize: 'sm',
                fontFamily: 'mono'
              },
              '& strong': {
                fontWeight: 'bold',
                color: 'gray.900'
              },
              '& em': {
                fontStyle: 'italic'
              },
              '& blockquote': {
                borderLeft: '4px solid',
                borderColor: 'gray.300',
                pl: '4',
                py: '2',
                my: '4',
                bg: 'gray.50',
                fontStyle: 'italic'
              }
            })}
            dangerouslySetInnerHTML={{ __html: post.content }}
          />
        </article>
      </div>
    </div>
  );
};

export default PostDetail;