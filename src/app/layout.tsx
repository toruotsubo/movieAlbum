import type { Metadata } from 'next';
import './globals.css';
import { AppProvider } from '@/components/AppProvider';

export const metadata: Metadata = {
  title: 'movieAlbum',
  description: 'Electron + Next.js による動画管理デスクトップアプリケーション',
  icons: {
    icon: '/icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem('movie_album_theme');var isDark=t==='light'?false:true;document.documentElement.classList.toggle('dark',isDark);document.documentElement.style.colorScheme=isDark?'dark':'light';}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 antialiased selection:bg-blue-500 selection:text-white transition-colors duration-150">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
