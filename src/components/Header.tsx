import { css } from '../../styled-system/css';
import { BrandName } from './common/BrandName';

interface HeaderProps {
  postCount: number;
}

export const Header = ({ postCount }: HeaderProps) => {
  return (
    <header className={css({
      background: '#1f2937',
      color: 'white',
      paddingX: '32px',
      paddingY: 'content',
      minHeight: 'header',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    })}>
      <BrandName variant="header" />
      
      <div className={css({
        background: '#374151',
        color: 'white',
        padding: '8px 16px',
        borderRadius: '20px',
        fontSize: 'sm',
        fontWeight: 'bold',
        boxShadow: 'card'
      })}>
        📚 {postCount}記事
      </div>
    </header>
  );
};

