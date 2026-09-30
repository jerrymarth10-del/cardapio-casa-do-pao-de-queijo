'use client';

import { DEMO_CATALOG } from '@/lib/catalog';
import { getSupabaseBrowser, hasSupabaseConfig } from '@/lib/supabase-browser';

const LOCAL_PREVIEW_KEY = 'cpq_catalog_preview_v2';

const OFFICIAL_STORE_DATA = {
  'cidade-alta': {
    whatsapp: '5569993652228',
    address: 'Cidade Alta — em frente à Farmácia Economize'
  },
  'norte-sul': {
    whatsapp: '5569993677137',
    address: 'Av. Norte-Sul, 4390 — em frente à Laranjas Rolim'
  }
};

function normalizeStores(stores = []) {
  return stores.map((store) => {
    const official = OFFICIAL_STORE_DATA[store.slug];
    return official ? { ...store, ...official } : store;
  });
}

function normalizeLabel(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function normalizeProducts(products = []) {
  return products
    .filter((product) => !['cappuccino', 'chocolate quente'].includes(normalizeLabel(product.name)))
    .map((product) => {
      const name = normalizeLabel(product.name);

      if (name === 'pao de queijo recheado') {
        return {
          ...product,
          description: 'Escolha um recheio salgado ou doce.',
          options: [{
            name: 'Recheio',
            required: true,
            type: 'single',
            values: [
              { label: 'Calabresa', price_delta: 0, section: 'Salgados' },
              { label: 'Frango com catupiry', price_delta: 0, section: 'Salgados' },
              { label: 'Catupiry puro', price_delta: 0, section: 'Salgados' },
              { label: 'Doce de leite', price_delta: 0, section: 'Doces' },
              { label: 'Goiabada', price_delta: 0, section: 'Doces' },
              { label: 'Nutella', price_delta: 0, section: 'Doces' }
            ]
          }]
        };
      }

      if (name === 'risoles' || name === 'risoles fritos') {
        return {
          ...product,
          name: 'Pastel de vento',
          description: 'Pastel de vento crocante, frito na hora e bem recheado.',
          options: [{
            name: 'Sabor',
            required: true,
            type: 'single',
            values: [
              { label: 'Frango com catupiry', price_delta: 0 },
              { label: 'Carne', price_delta: 0 },
              { label: 'Queijo com presunto', price_delta: 0 }
            ]
          }]
        };
      }

      if (name === 'refrigerante') {
        return {
          ...product,
          description: 'Escolha seu refrigerante e o tamanho.',
          options: [
            {
              name: 'Marca',
              required: true,
              type: 'single',
              values: [
                { label: 'Coca-Cola', price_delta: 0 },
                { label: 'Fanta laranja', price_delta: 0 },
                { label: 'Guaraná Antarctica', price_delta: 0 },
                { label: 'Pepsi', price_delta: 0 },
                { label: 'Pepsi Limão', price_delta: 0 }
              ]
            },
            {
              name: 'Tamanho',
              required: true,
              type: 'single',
              values: [
                { label: '350 ml', price_delta: 0 },
                { label: '600 ml', price_delta: 2 },
                { label: '1 L', price_delta: 6 },
                { label: '2 L', price_delta: 9 }
              ]
            }
          ]
        };
      }

      if (name === 'gatorade') {
        return {
          ...product,
          description: 'Escolha o sabor/cor disponível.',
          options: [{
            name: 'Sabor',
            required: true,
            type: 'single',
            values: [
              { label: 'Vermelho', price_delta: 0 },
              { label: 'Amarelo', price_delta: 0 },
              { label: 'Laranja', price_delta: 0 },
              { label: 'Azul', price_delta: 0 }
            ]
          }]
        };
      }

      if (name === 'tampico') {
        return {
          ...product,
          base_price: 6,
          description: 'Escolha o tamanho.',
          options: [{
            name: 'Tamanho',
            required: true,
            type: 'single',
            values: [
              { label: '250 ml', price_delta: 0 },
              { label: '450 ml', price_delta: 2 },
              { label: '1 L', price_delta: 6 },
              { label: '2 L', price_delta: 9 }
            ]
          }]
        };
      }

      return product;
    });
}

export function normalizeCatalog(catalog = {}) {
  return {
    ...catalog,
    stores: normalizeStores(catalog.stores || []),
    products: normalizeProducts(catalog.products || [])
  };
}

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
    const localCatalog = readLocalPreview() || DEMO_CATALOG;
    return { ...normalizeCatalog(localCatalog), source: 'local' };
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
    stores: normalizeStores(storesResult.data || []),
    categories: categoriesResult.data || [],
    products: normalizeProducts(productsResult.data || []),
    availability: availabilityResult.data || [],
    source: 'supabase'
  };
}

export function productForStore(product, store, availability = []) {
  const isTampico = normalizeLabel(product?.name) === 'tampico';
  const exactBase = isTampico ? 6 : Number(product.base_price || 0);
  if (!store) return { available: true, price: exactBase };
  const row = availability.find((item) => item.store_id === store.id && item.product_id === product.id);
  return {
    available: row ? row.available !== false : true,
    price: isTampico ? 6 : (row?.price_override == null ? exactBase : Number(row.price_override))
  };
}
