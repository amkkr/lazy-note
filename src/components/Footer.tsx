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
        ✨ Creative Blog
      </div>
      <div className={css({
        color: '#9ca3af',
        fontSize: 'xs'
      })}>
        © 2025 Creative Blog. All rights reserved.
      </div>
    </footer>
  );
};

