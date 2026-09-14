import MenuEntry from '@/components/menu-entry';

export default async function HomePage({ searchParams }) {
  const params = await searchParams;
  const initialStore = typeof params?.loja === 'string' ? params.loja : '';
  return <MenuEntry initialStore={initialStore} />;
}
