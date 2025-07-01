import { css } from '../../styled-system/css';
import { BrandName } from './common/BrandName';

export const Footer = () => {
  return (
    <footer className={css({
      background: '#1f2937',
      color: 'white',
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
        color: 'white'
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

