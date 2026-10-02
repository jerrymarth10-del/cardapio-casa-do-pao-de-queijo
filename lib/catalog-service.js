'use client';

import { DEMO_CATALOG } from '@/lib/catalog';
import { getSupabaseBrowser, hasSupabaseConfig } from '@/lib/supabase-browser';

const LOCAL_PREVIEW_KEY = 'cpq_catalog_preview_v2';

const OFFICIAL_STORE_DATA = {
  'cidade-alta': {
    whatsapp: '5569993652228',
    address: 'Cidade Alta — em frente à Farmácia Economize',
    delivery_fee: 5
  },
  'norte-sul': {
    whatsapp: '5569993677137',
    address: 'Av. Norte-Sul, 4390 — em frente à Laranjas Rolim',
    delivery_fee: 5
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


function addSpecialProducts(products = []) {
  const result = [...products];
  const names = new Set(result.map((product) => normalizeLabel(product.name)));
  const beverageCategoryId = result.find((product) => ['refrigerante', 'tampico', 'gatorade', 'todinho'].includes(normalizeLabel(product.name)))?.category_id || 'bebidas';
  const cafeCategoryId = result.find((product) => ['cafe', 'cafe com leite'].includes(normalizeLabel(product.name)))?.category_id || 'cafes';

  if (!names.has('red bull')) {
    result.push({
      id: 'accccccc-cccc-4ccc-8ccc-cccccccccccc',
      category_id: beverageCategoryId,
      name: 'Red Bull',
      description: 'Red Bull tradicional, lata bem gelada.',
      base_price: 15,
      image_url: '',
      emoji: '⚡',
      badge: 'Geladinho',
      active: true,
      is_active: true,
      sort_order: 5,
      options: []
    });
  }

  if (!names.has('cafe aguia dourada')) {
    result.push({
      id: 'addddddd-dddd-4ddd-8ddd-dddddddddddd',
      category_id: cafeCategoryId,
      name: 'Café Águia Dourada',
      description: 'Pacote de café Águia Dourada.',
      base_price: 39.99,
      image_url: '',
      emoji: '☕',
      badge: 'Pacote',
      active: true,
      is_active: true,
      sort_order: 3,
      options: []
    });
  }

  return result;
}

export function normalizeProducts(products = []) {
  const normalized = products
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


      if (name === 'cafe') {
        return {
          ...product,
          base_price: 3,
          description: 'Café passado, servido quentinho. Escolha com ou sem açúcar.',
          options: [{
            name: 'Açúcar',
            required: true,
            type: 'single',
            values: [
              { label: 'Com açúcar', price_delta: 0 },
              { label: 'Sem açúcar', price_delta: 0 }
            ]
          }]
        };
      }

      if (name === 'risoles' || name === 'risoles fritos') {
        return {
          ...product,
          name: 'Pastelão massa seca',
          description: 'Pastelão massa seca crocante, frito na hora e bem recheado.',
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
          base_price: 6,
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
                { label: '1 L', price_delta: 4 },
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
              { label: '2 L', price_delta: 10 }
            ]
          }]
        };
      }

      return product;
    });
  return addSpecialProducts(normalized);
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
  const name = normalizeLabel(product?.name);
  const officialBasePrices = {
    'refrigerante': 6,
    'tampico': 6,
    'cafe': 3,
    'risoles': 8,
    'risoles fritos': 8,
    'pastelao massa seca': 8,
    'red bull': 15,
    'cafe aguia dourada': 39.99
  };
  const officialPrice = officialBasePrices[name];
  const exactBase = officialPrice == null ? Number(product.base_price || 0) : Number(officialPrice);
  if (!store) return { available: true, price: exactBase };
  const row = availability.find((item) => item.store_id === store.id && item.product_id === product.id);
  return {
    available: row ? row.available !== false : true,
    price: officialPrice == null
      ? (row?.price_override == null ? exactBase : Number(row.price_override))
      : exactBase
  };
}
