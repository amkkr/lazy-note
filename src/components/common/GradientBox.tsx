import type { ReactNode } from 'react';
import { css } from '../../../styled-system/css';

interface GradientBoxProps {
  children: ReactNode;
  variant?: 'primary' | 'accent';
  showPattern?: boolean;
  className?: string;
}

export const GradientBox = ({ 
  children, 
  variant = 'primary', 
  showPattern = false,
  className = ''
}: GradientBoxProps) => {
  const gradients = {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    accent: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
  };

  return (
    <div className={css({
      background: gradients[variant],
      position: 'relative',
      overflow: 'hidden'
    }) + (className ? ` ${className}` : '')}>
      {showPattern && (
        <div className={css({
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.1"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
          opacity: '0.3'
        })} />
      )}
      <div className={css({ position: 'relative' })}>
        {children}
      </div>
    </div>
  );
};

