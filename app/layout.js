import './globals.css';
import './menu-premium.css';
import './menu-gallery.css';
import './menu-mobile-v3.css';
import './menu-luxury-v2.css';
import './menu-mobile-white-v4.css';
import './hero-carousel-final.css';

export const metadata = {
  title: 'Casa do Pão de Queijo | Cardápio',
  description: 'Peça pão de queijo, salgados, cafés e bebidas na Casa do Pão de Queijo.',
  applicationName: 'Casa do Pão de Queijo',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/pwa-icon-512.png', sizes: '512x512', type: 'image/png' }
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }]
  },
  appleWebApp: {
    capable: true,
    title: 'Pão de Queijo',
    statusBarStyle: 'default'
  }
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f47a18'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
