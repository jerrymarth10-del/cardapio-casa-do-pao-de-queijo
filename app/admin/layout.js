import Link from 'next/link';

export default function AdminLayout({ children }) {
  return (
    <>
      {children}
      <nav style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 150, display: 'flex', gap: 6, padding: 6, borderRadius: 14, background: 'rgba(21,18,15,.92)', boxShadow: '0 12px 30px rgba(0,0,0,.18)' }}>
        <Link href="/admin" style={{ color: 'white', fontSize: 12, fontWeight: 800, padding: '8px 10px', borderRadius: 9 }}>Painel</Link>
        <Link href="/admin/estoque" style={{ color: 'white', fontSize: 12, fontWeight: 800, padding: '8px 10px', borderRadius: 9 }}>Estoque por loja</Link>
      </nav>
    </>
  );
}
