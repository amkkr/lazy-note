import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Index from '../index';
import * as usePostsHook from '../../hooks/usePosts';

// usePostsカスタムフックをモック
vi.mock('../../hooks/usePosts');

const mockUsePosts = vi.mocked(usePostsHook.usePosts);

// テスト用のモックデータ
const mockPosts = [
  {
    id: '20240102120000',
    title: '2つ目の記事',
    createdAt: '2024-01-02 12:00',
    content: '<p>2つ目の記事の内容です。</p>',
    author: '花子',
    rawContent: '# 2つ目の記事\n\n## 投稿日時\n- 2024-01-02 12:00\n\n## 筆者名\n- 花子\n\n## 本文\n2つ目の記事の内容です。',
  },
  {
    id: '20240101100000',
    title: '最初の記事',
    createdAt: '2024-01-01 10:00',
    content: '<p>最初の記事の内容です。</p>',
    author: '太郎',
    rawContent: '# 最初の記事\n\n## 投稿日時\n- 2024-01-01 10:00\n\n## 筆者名\n- 太郎\n\n## 本文\n最初の記事の内容です。',
  },
];

// テスト用のラッパーコンポーネント
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('Indexコンポーネント', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('読み込み中の状態を表示する', async () => {
    // usePostsでローディング状態をモック
    mockUsePosts.mockReturnValue({
      posts: [],
      loading: true,
      error: null
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('記事一覧を正しく表示する', async () => {
    mockUsePosts.mockReturnValue({
      posts: mockPosts,
      loading: false,
      error: null
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    // ブランド名の確認
    expect(screen.getAllByText('✨ Creative Blog')).toHaveLength(2); // ヘッダーとフッター

    // 記事タイトルの確認
    expect(screen.getByRole('heading', { name: '2つ目の記事' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '最初の記事' })).toBeInTheDocument();

    // 投稿日時の確認
    expect(screen.getByText('2024-01-02 12:00')).toBeInTheDocument();
    expect(screen.getByText('2024-01-01 10:00')).toBeInTheDocument();

    // 筆者名の確認
    expect(screen.getByText('花子')).toBeInTheDocument();
    expect(screen.getByText('太郎')).toBeInTheDocument();
  });

  it('記事がない場合に適切なメッセージを表示する', async () => {
    mockUsePosts.mockReturnValue({
      posts: [],
      loading: false,
      error: null
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    expect(screen.getByText('新しい記事をお楽しみに')).toBeInTheDocument();
  });

  it('記事の読み込みでエラーが発生した場合に記事なしメッセージを表示する', async () => {
    mockUsePosts.mockReturnValue({
      posts: [],
      loading: false,
      error: 'ネットワークエラー'
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    expect(screen.getByText('新しい記事をお楽しみに')).toBeInTheDocument();
  });

  it('記事のリンクが正しく設定されている', async () => {
    mockUsePosts.mockReturnValue({
      posts: mockPosts,
      loading: false,
      error: null
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    const firstPostLink = screen.getByRole('link', { name: '2つ目の記事' });
    const secondPostLink = screen.getByRole('link', { name: '最初の記事' });

    expect(firstPostLink).toHaveAttribute('href', '/posts/20240102120000');
    expect(secondPostLink).toHaveAttribute('href', '/posts/20240101100000');
  });

  it('記事が投稿日時の新しい順でソートされている', async () => {
    mockUsePosts.mockReturnValue({
      posts: mockPosts,
      loading: false,
      error: null
    });

    render(
      <TestWrapper>
        <Index />
      </TestWrapper>
    );

    const articles = screen.getAllByRole('article');
    expect(articles).toHaveLength(2);

    // 最初の記事（新しい方）が上に表示されていることを確認
    const firstArticle = articles[0];
    const secondArticle = articles[1];

    expect(firstArticle).toHaveTextContent('2つ目の記事');
    expect(firstArticle).toHaveTextContent('2024-01-02 12:00');
    expect(secondArticle).toHaveTextContent('最初の記事');
    expect(secondArticle).toHaveTextContent('2024-01-01 10:00');
  });
});