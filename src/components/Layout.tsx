import type { ReactNode } from 'react';
import { css } from '../../styled-system/css';
import { Header } from './Header';
import { Footer } from './Footer';

interface LayoutProps {
  children: ReactNode;
  postCount?: number;
  showHeader?: boolean;
}

export const Layout = ({ children, postCount = 0, showHeader = true }: LayoutProps) => {
  return (
    <div className={css({
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column'
    })}>
      {showHeader && (
        <div className={css({
          position: 'sticky',
          top: 0,
          zIndex: 10
        })}>
          <Header postCount={postCount} />
        </div>
      )}
      
      <main className={css({
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
      })}>
        {children}
      </main>
      
      <div className={css({
        position: 'sticky',
        bottom: 0,
        zIndex: 10
      })}>
        <Footer />
      </div>
    </div>
  );
};

