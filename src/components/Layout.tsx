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
        <Header postCount={postCount} />
      )}
      
      <main className={css({
        flex: 1
      })}>
        {children}
      </main>
      
      <Footer />
    </div>
  );
};

