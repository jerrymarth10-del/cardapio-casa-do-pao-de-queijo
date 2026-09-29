'use client';

import MenuApp from '@/components/menu-app';

export default function MenuEntry({ initialStore = '' }) {
  return <MenuApp initialStore={initialStore} />;
}
