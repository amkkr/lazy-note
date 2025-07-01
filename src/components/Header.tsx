import { css } from '../../styled-system/css';
import { container } from '../../styled-system/patterns';
import { BrandName } from './common/BrandName';
import { GradientBox } from './common/GradientBox';

interface HeaderProps {
  postCount: number;
}

export const Header = ({ postCount }: HeaderProps) => {
  return (
    <GradientBox variant="primary" showPattern={true}>
      <div className={container({ maxWidth: '6xl', py: '4', position: 'relative' })}>
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
            {/* 記事数表示 - 小さなエンブレム風デザイン */}
            <div className={css({
              position: 'relative',
              bg: 'linear-gradient(45deg, rgba(102, 126, 234, 0.9) 0%, rgba(118, 75, 162, 0.8) 100%)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(102, 126, 234, 0.7)',
              borderRadius: '12px',
              transform: 'skew(6deg) rotate(1deg)',
              px: '3',
              py: '1',
              color: 'white',
              fontSize: 'xs',
              fontWeight: '600',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.4)',
              shadow: '0 2px 8px rgba(102, 126, 234, 0.3)',
              _after: {
                content: '""',
                position: 'absolute',
                top: '2px',
                left: '3px',
                width: '4px',
                height: '4px',
                bg: 'rgba(165, 180, 252, 0.9)',
                borderRadius: 'full',
                shadow: '0 0 6px rgba(165, 180, 252, 0.8)'
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

