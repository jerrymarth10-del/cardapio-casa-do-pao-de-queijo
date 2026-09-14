'use client';

import { DEMO_CATALOG } from '@/lib/catalog';
import { getSupabaseBrowser, hasSupabaseConfig } from '@/lib/supabase-browser';

const LOCAL_PREVIEW_KEY = 'cpq_catalog_preview_v2';

export function readLocalPreview() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LOCAL_PREVIEW_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeLocalPreview(catalog) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_PREVIEW_KEY, JSON.stringify(catalog));
  window.dispatchEvent(new Event('cpq:catalog-updated'));
}

export function clearLocalPreview() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(LOCAL_PREVIEW_KEY);
  window.dispatchEvent(new Event('cpq:catalog-updated'));
}

export async function loadCatalog() {
  if (!hasSupabaseConfig()) {
    return { ...(readLocalPreview() || DEMO_CATALOG), source: 'local' };
  }

  const supabase = getSupabaseBrowser();
  const [storesResult, categoriesResult, productsResult, availabilityResult] = await Promise.all([
    supabase.from('menu_stores').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('menu_categories').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('menu_products').select('*').eq('is_active', true).order('sort_order'),
    supabase.from('menu_store_products').select('*')
  ]);

  const firstError = [storesResult, categoriesResult, productsResult, availabilityResult].find((r) => r.error)?.error;
  if (firstError) throw firstError;

  return {
    stores: storesResult.data || [],
    categories: categoriesResult.data || [],
    products: productsResult.data || [],
    availability: availabilityResult.data || [],
    source: 'supabase'
  };
}

export function productForStore(product, store, availability = []) {
  if (!store) return { available: true, price: Number(product.base_price || 0) };
  const row = availability.find((item) => item.store_id === store.id && item.product_id === product.id);
  return {
    available: row ? row.available !== false : true,
    price: row?.price_override == null ? Number(product.base_price || 0) : Number(row.price_override)
  };
}
