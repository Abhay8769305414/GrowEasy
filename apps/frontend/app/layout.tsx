import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'GrowEasy CSV Importer — AI-powered CRM Import',
  description:
    'Upload a CSV file and let AI automatically extract, map, and normalize your contacts directly into your CRM. Powered by Gemini 2.5 Flash.',
  keywords: ['CRM', 'CSV import', 'AI', 'contacts', 'GrowEasy'],
  openGraph: {
    title: 'GrowEasy CSV Importer',
    description: 'AI-powered CRM CSV import tool',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
