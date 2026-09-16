import './globals.css';
import './menu-premium.css';

export const metadata = {
  title: 'Casa do Pão de Queijo | Cardápio',
  description: 'Peça pão de queijo, salgados, cafés e bebidas na Casa do Pão de Queijo.'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#f4a300'
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
