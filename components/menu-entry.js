'use client';

import MenuApp from '@/components/menu-app';

const ALLOWED = new Set(['norte-sul', 'cidade-alta']);

export default function MenuEntry({ initialStore = '' }) {
  const safeStore = ALLOWED.has(initialStore) ? initialStore : '';
  return <MenuApp initialStore={safeStore} />;
}
