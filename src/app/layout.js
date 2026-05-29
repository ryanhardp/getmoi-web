import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Getmoi Workspace',
  description: 'Sistem Kasir & Gudang Getmoi',
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-pink-50 text-gray-800 antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  );
}