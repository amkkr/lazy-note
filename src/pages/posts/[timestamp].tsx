import { useParams, Link } from 'react-router-dom';
import { css } from '../../../styled-system/css';
import { container } from '../../../styled-system/patterns';
import { usePost } from '../../hooks/usePost';
import { Layout } from '../../components/Layout';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import { EmptyState } from '../../components/common/EmptyState';
import { MetaInfo } from '../../components/common/MetaInfo';
import { GradientBox } from '../../components/common/GradientBox';

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
      <div className={css({ bg: 'surface.50', flex: 1 })}>
        {/* Navigation */}
        <nav className={css({
          bg: 'white',
          borderBottom: '1px solid',
          borderColor: 'surface.200',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          backdropFilter: 'blur(10px)'
        })}>
          <div className={container({ maxWidth: '6xl', py: '4' })}>
            <Link 
              to="/"
              className={css({
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2',
                color: 'primary.600',
                fontSize: 'sm',
                fontWeight: '600',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
                _hover: {
                  color: 'primary.700',
                  transform: 'translateX(-2px)'
                }
              })}
            >
              ← Creative Blog に戻る
            </Link>
          </div>
        </nav>

      <div className={container({ maxWidth: '4xl', py: '12' })}>
        <article className={css({
          bg: 'white',
          borderRadius: '2xl',
          overflow: 'hidden',
          shadow: 'card',
          border: '1px solid',
          borderColor: 'surface.200'
        })}>
          {/* Article Header with Gradient */}
          <GradientBox variant="primary" showPattern={true} className={css({
            color: 'white',
            p: '12'
          })}>
            
            <div>
              <h1 className={css({
                fontSize: { base: '2xl', md: '4xl' },
                fontWeight: 'bold',
                lineHeight: '1.2',
                mb: '6',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              })}>
                {post.title || '無題の記事'}
              </h1>
              
              <MetaInfo
                createdAt={post.createdAt}
                author={post.author}
                variant="header"
              />
            </div>
          </GradientBox>

          {/* Article Content */}
          <main className={css({
            p: '12',
            maxWidth: 'none',
            lineHeight: '1.8',
            fontSize: { base: 'lg', md: 'xl' },
            color: 'secondary.700',
            '& h1, & h2, & h3, & h4, & h5, & h6': {
              color: 'secondary.900',
              fontWeight: 'bold',
              mt: '8',
              mb: '4',
              lineHeight: '1.3'
            },
            '& h1': { fontSize: '3xl' },
            '& h2': { 
              fontSize: '2xl',
              borderBottom: '2px solid',
              borderColor: 'primary.100',
              pb: '2'
            },
            '& h3': { fontSize: 'xl' },
            '& p': {
              mb: '6',
              lineHeight: '1.8'
            },
            '& ul, & ol': {
              pl: '8',
              mb: '6',
              '& li': {
                mb: '3',
                position: 'relative',
                '&::marker': {
                  color: 'primary.600'
                }
              }
            },
            '& code': {
              bg: 'surface.100',
              color: 'accent.700',
              px: '3',
              py: '1',
              borderRadius: 'md',
              fontSize: 'sm',
              fontFamily: 'mono',
              fontWeight: '600'
            },
            '& pre': {
              bg: 'secondary.900',
              color: 'white',
              p: '6',
              borderRadius: 'lg',
              overflow: 'auto',
              my: '6',
              '& code': {
                bg: 'transparent',
                color: 'inherit',
                p: 0,
                fontSize: 'sm'
              }
            },
            '& strong': {
              fontWeight: 'bold',
              color: 'secondary.900'
            },
            '& em': {
              fontStyle: 'italic',
              color: 'accent.600'
            },
            '& blockquote': {
              borderLeft: '4px solid',
              borderColor: 'primary.400',
              pl: '6',
              py: '4',
              my: '6',
              bg: 'primary.50',
              borderRadius: 'md',
              fontStyle: 'italic',
              position: 'relative',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: '4',
                left: '4',
                width: '8',
                height: '8',
                bg: 'primary.400',
                borderRadius: 'full'
              }
            },
            '& a': {
              color: 'primary.600',
              fontWeight: '600',
              textDecoration: 'underline',
              textDecorationColor: 'primary.300',
              textUnderlineOffset: '2px',
              _hover: {
                color: 'primary.700',
                textDecorationColor: 'primary.600'
              }
            },
            '& table': {
              width: 'full',
              borderCollapse: 'collapse',
              my: '6',
              border: '1px solid',
              borderColor: 'surface.300',
              borderRadius: 'lg',
              overflow: 'hidden'
            },
            '& th': {
              bg: 'surface.100',
              p: '4',
              textAlign: 'left',
              fontWeight: '600',
              borderBottom: '1px solid',
              borderColor: 'surface.300'
            },
            '& td': {
              p: '4',
              borderBottom: '1px solid',
              borderColor: 'surface.200'
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

