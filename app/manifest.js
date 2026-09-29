export default function manifest() {
  return {
    name: 'Casa do Pão de Queijo',
    short_name: 'Pão de Queijo',
    description: 'Cardápio e pedidos da Casa do Pão de Queijo.',
    id: '/',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#f47a18',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ]
  };
}
