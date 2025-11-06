import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'オストル | Ostle',
  description: 'シンプルな抽象戦略ゲーム「オストル」をブラウザでプレイ',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}


