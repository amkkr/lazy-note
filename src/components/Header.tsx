import { css } from '../../styled-system/css';
import { BrandName } from './common/BrandName';
import { GradientBox } from './common/GradientBox';

interface HeaderProps {
  postCount: number;
}

export const Header = ({ postCount }: HeaderProps) => {
  return (
    <GradientBox variant="primary" showPattern={true}>
      <div className={css({
        maxWidth: '6xl',
        mx: 'auto',
        py: '4',
        px: '32px',
        position: 'relative'
      })}>
        <div className={css({
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '62px'
        })}>
          <BrandName variant="header" />
          
          <div className={css({
            display: 'flex',
            gap: '3',
            alignItems: 'center'
          })}>
            {/* 記事数表示 - 目立つエンブレム風デザイン */}
            <div className={css({
              position: 'relative',
              bg: 'linear-gradient(45deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.8) 100%)',
              backdropFilter: 'blur(10px)',
              border: '2px solid rgba(102, 126, 234, 0.8)',
              borderRadius: '16px',
              transform: 'skew(6deg) rotate(1deg)',
              px: '5',
              py: '2',
              color: 'white',
              fontSize: 'sm',
              fontWeight: '700',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.5)',
              shadow: '0 4px 12px rgba(102, 126, 234, 0.4), 0 2px 6px rgba(102, 126, 234, 0.3)',
              _after: {
                content: '""',
                position: 'absolute',
                top: '3px',
                left: '4px',
                width: '6px',
                height: '6px',
                bg: 'rgba(165, 180, 252, 0.9)',
                borderRadius: 'full',
                shadow: '0 0 8px rgba(165, 180, 252, 0.9)'
              }
            })}>
              <span className={css({ transform: 'skew(-6deg) rotate(-1deg)', display: 'inline-block' })}>
                📚 {postCount}
              </span>
            </div>
          </div>
        </div>
      </div>
    </GradientBox>
  );
};

