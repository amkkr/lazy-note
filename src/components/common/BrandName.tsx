import { css } from '../../../styled-system/css';

interface BrandNameProps {
  variant?: 'header' | 'footer';
  showIcon?: boolean;
}

export const BrandName = ({ variant = 'header', showIcon = true }: BrandNameProps) => {
  const isHeader = variant === 'header';
  
  return (
    <div className={css({
      fontSize: isHeader ? '20px' : '14px',
      fontWeight: 'bold',
      color: '#ffffff',
      ...(variant === 'footer' && {
        marginBottom: '4px'
      })
    })}>
      {showIcon && '✨ '}Creative Blog
    </div>
  );
};

