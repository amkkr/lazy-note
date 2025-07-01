import { css } from '../../../styled-system/css';

interface MetaInfoProps {
  createdAt?: string;
  author?: string;
  variant?: 'card' | 'header';
}

export const MetaInfo = ({ createdAt, author, variant = 'card' }: MetaInfoProps) => {
  const isHeader = variant === 'header';
  
  const baseStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '2',
    fontSize: 'sm',
    fontWeight: isHeader ? '500' : 'normal'
  };

  const containerStyles = isHeader ? {
    ...baseStyles,
    bg: 'rgba(255, 255, 255, 0.2)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: 'full',
    px: '4',
    py: '2'
  } : {
    ...baseStyles,
    color: 'secondary.600'
  };

  return (
    <div className={css({
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '4',
      ...(variant === 'card' && {
        mt: '4',
        pt: '4',
        borderTop: '1px solid',
        borderColor: 'surface.200'
      }),
      ...(variant === 'header' && {
        flexDirection: { base: 'column', sm: 'row' },
        alignItems: { base: 'flex-start', sm: 'center' }
      })
    })}>
      <div className={css(containerStyles)}>
        <span>📅</span>
        <span>{createdAt || '日付未設定'}</span>
      </div>
      <div className={css(containerStyles)}>
        <span>✍️</span>
        <span>{author || '匿名'}</span>
      </div>
    </div>
  );
};

