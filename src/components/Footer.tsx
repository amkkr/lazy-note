import { css } from '../../styled-system/css';
import { BrandName } from './common/BrandName';

export const Footer = () => {
  return (
    <footer className={css({
      bg: '#1f2937',
      color: 'white',
      height: '70px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    })}>
      <div className={css({
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center'
      })}>
          <BrandName variant="footer" />
          <div className={css({
            color: '#9ca3af',
            fontSize: 'xs'
          })}>
            © 2025 Creative Blog. All rights reserved.
          </div>
      </div>
    </footer>
  );
};

