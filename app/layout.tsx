import './globals.css';
import { Inter } from 'next/font/google';
import Sidebar from '@/components/Sidebar';
import { Toaster } from 'react-hot-toast';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8">{children}</main>
        </div>
        <Toaster 
          position="bottom-right"
          toastOptions={{
            style: {
              borderRadius: '10px',
              background: '#1E293B',
              color: '#fff',
            },
            position: 'bottom-right',
            offset: {
              x: 20,
              y: 20
            }
          }}
        />
      </body>
    </html>
  );
}