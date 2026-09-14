'use client';

import MenuApp from '@/components/menu-app';

const STORE_KEY = 'cpq_selected_store_v2';
const ALLOWED = new Set(['norte-sul', 'cidade-alta']);

export default function MenuEntry({ initialStore = '' }) {
  if (typeof window !== 'undefined' && ALLOWED.has(initialStore)) {
    window.localStorage.setItem(STORE_KEY, initialStore);
  }

  return <MenuApp />;
}
