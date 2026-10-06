import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import './globals.css';

export const metadata: Metadata = {
  title: 'Tracka. Promote your song',
  description: 'Book radio, TV, TikTok, YouTube, blogs, influencers and DJs in one campaign. Nobody gets paid until it is done.',
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#1F4D3A' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Outfit:wght@300;400;500;600;700&display=swap" />
      </head>
      <body>
        <Header />
        <main id="app">{children}</main>
        <footer className="sitefoot">
          <div className="in">
            <div>
              <strong className="wordmark" style={{ fontSize: 22 }}>
                Tracka<i>.</i>
              </strong>
              <p className="tagline">g e t &nbsp; y o u r &nbsp; s o n g &nbsp; h e a r d</p>
            </div>
            <nav aria-label="Footer">
              <Link href="/how">How it works</Link>
              <Link href="/marketplace">Marketplace</Link>
              <Link href="/sell">Sell on Tracka</Link>
              <Link href="/terms">Terms and conditions</Link>
            </nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
