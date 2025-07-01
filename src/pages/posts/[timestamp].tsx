import { useParams, Link } from 'react-router-dom';
import { css } from '../../../styled-system/css';
import { usePost } from '../../hooks/usePost';
import { Layout } from '../../components/Layout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { MetaInfo } from '../../components/common/MetaInfo';

const PostDetail = () => {
  const { timestamp } = useParams<{ timestamp: string }>();
  const { post, loading, notFound } = usePost(timestamp);

  if (loading) {
    return <LoadingSpinner message="記事を読み込み中..." />;
  }

  if (notFound || !post) {
    return (
      <EmptyState
        icon="😕"
        title="記事が見つかりません"
        description="お探しの記事は削除されたか、URLが間違っている可能性があります。"
        action={{
          label: "← 記事一覧に戻る",
          href: "/"
        }}
      />
    );
  }

  return (
    <Layout showHeader={false}>
      <div className={css({ 
        background: '#f9fafb',
        minHeight: '100vh'
      })}>
        {/* Navigation */}
        <nav className={css({
          background: 'white',
          borderBottom: '1px solid',
          borderColor: 'surface.200',
          padding: 'content'
        })}>
          <Link 
            to="/"
            className={css({
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              color: 'primary.600',
              fontSize: 'sm',
              fontWeight: '600',
              textDecoration: 'none',
              '&:hover': {
                color: 'primary.700'
              }
            })}
          >
            ← Creative Blog に戻る
          </Link>
        </nav>

      <div className={css({
        maxWidth: 'article',
        margin: '0 auto',
        padding: 'content'
      })}>
        <article className={css({
          background: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: 'card-hover',
          border: '1px solid',
          borderColor: 'surface.200'
        })}>
          {/* Article Header with Gradient */}
          <header className={css({
            background: 'gradients.primary',
            color: 'white',
            padding: 'section'
          })}>
            <h1 className={css({
              fontSize: '3xl',
              fontWeight: 'bold',
              lineHeight: '1.2',
              marginBottom: 'card'
            })}>
              {post.title || '無題の記事'}
            </h1>
            
            <MetaInfo
              createdAt={post.createdAt}
              author={post.author}
              variant="header"
            />
          </header>

          {/* Article Content */}
          <main className={css({
            padding: 'section',
            lineHeight: '1.7',
            fontSize: 'base',
            color: 'secondary.700',
            '& h1, & h2, & h3': {
              color: '#1f2937',
              fontWeight: 'bold',
              marginTop: '32px',
              marginBottom: '16px'
            },
            '& h1': { fontSize: '28px' },
            '& h2': { fontSize: '24px' },
            '& h3': { fontSize: '20px' },
            '& p': {
              marginBottom: '16px'
            },
            '& ul, & ol': {
              paddingLeft: '24px',
              marginBottom: '16px'
            },
            '& li': {
              marginBottom: '8px'
            },
            '& a': {
              color: '#667eea',
              textDecoration: 'underline',
              '&:hover': {
                color: '#4f46e5'
              }
            },
            '& code': {
              background: '#f3f4f6',
              color: '#e11d48',
              padding: '2px 6px',
              borderRadius: '4px',
              fontSize: '14px'
            },
            '& pre': {
              background: '#1f2937',
              color: 'white',
              padding: '24px',
              borderRadius: '8px',
              overflow: 'auto',
              margin: '24px 0'
            }
          })}>
            <div dangerouslySetInnerHTML={{ __html: post.content }} />
          </main>
        </article>
        </div>
      </div>
    </Layout>
  );
};

export default PostDetail;

