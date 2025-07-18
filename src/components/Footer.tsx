import { css } from '../../styled-system/css';
import { BrandName } from './common/BrandName';

export const Footer = () => {
  return (
    <footer className={css({
      background: '#f3f4f6',
      color: '#374151',
      padding: 'content',
      minHeight: 'header',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center'
    })}>
      <div className={css({
        fontSize: 'sm',
        fontWeight: '600',
        marginBottom: '4px',
        color: '#374151'
      })}>
        <BrandName variant="footer" />
      </div>
      <div className={css({
        color: '#9ca3af',
        fontSize: 'xs'
      })}>
        © 2025 Lazy Note. All rights reserved.
      </div>
    </footer>
  );
};

