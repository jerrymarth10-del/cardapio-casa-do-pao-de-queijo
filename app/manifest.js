export default function manifest() {
  return {
    name: 'Casa do Pão de Queijo',
    short_name: 'Pão de Queijo',
    description: 'Cardápio e pedidos da Casa do Pão de Queijo.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fff9ee',
    theme_color: '#f4a300',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ]
  };
}
