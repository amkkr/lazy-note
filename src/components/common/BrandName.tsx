import { css } from '../../../styled-system/css';

interface BrandNameProps {
  variant?: 'header' | 'footer';
  showIcon?: boolean;
}

export const BrandName = ({ variant = 'header', showIcon = true }: BrandNameProps) => {
  const isHeader = variant === 'header';
  
  return (
    <div className={css({
      fontSize: isHeader ? 'xl' : 'sm',
      fontWeight: isHeader ? 'bold' : '600',
      color: isHeader ? 'white' : '#ffffff',
      ...(isHeader && {
        textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
        letterSpacing: 'tight'
      }),
      ...(variant === 'footer' && {
        mb: '1'
      })
    })}>
      {showIcon && '✨ '}Creative Blog
    </div>
  );
};

