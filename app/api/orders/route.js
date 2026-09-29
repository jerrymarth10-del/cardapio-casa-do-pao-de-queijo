import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

const STORE_ID_ALIASES = {
  'cidade-alta': '11111111-1111-4111-8111-111111111111',
  'norte-sul': '22222222-2222-4222-8222-222222222222'
};

const PRODUCT_ID_ALIASES = {
  'pao-queijo-tradicional': 'a1111111-1111-4111-8111-111111111111',
  'pao-queijo-recheado': 'a2222222-2222-4222-8222-222222222222',
  'salgado-assado': 'a3333333-3333-4333-8333-333333333333',
  'risoles': 'a4444444-4444-4444-8444-444444444444',
  'cafe': 'a5555555-5555-4555-8555-555555555555',
  'cafe-com-leite': 'a6666666-6666-4666-8666-666666666666',
  'todinho': 'a7777777-7777-4777-8777-777777777777',
  'refrigerante': 'a8888888-8888-4888-8888-888888888888',
  'tampico': 'a9999999-9999-4999-8999-999999999999',
  'gatorade': 'abbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
};

function orderNumber() {
  const now = new Date();
  const stamp = `${String(now.getFullYear()).slice(-2)}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `CPQ-${stamp}-${suffix}`;
}

function safeOptions(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { return typeof raw === 'string' ? JSON.parse(raw) : []; } catch { return []; }
}

function normalizeLabel(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function orderProductView(product) {
  const name = normalizeLabel(product?.name);

  if (name === 'pao de queijo recheado') {
    return {
      name: product.name,
      options: [{
        name: 'Recheio',
        required: true,
        type: 'single',
        values: [
          { label: 'Calabresa', price_delta: 0 },
          { label: 'Frango com catupiry', price_delta: 0 },
          { label: 'Catupiry puro', price_delta: 0 },
          { label: 'Doce de leite', price_delta: 0 },
          { label: 'Goiabada', price_delta: 0 },
          { label: 'Nutella', price_delta: 0 }
        ]
      }]
    };
  }

  if (name === 'risoles' || name === 'risoles fritos') {
    return {
      name: 'Pastel de vento',
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
      name: product.name,
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
      name: product.name,
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

  return { name: product.name, options: safeOptions(product.options) };
}

function validatedSelections(productOptions, requestedOptions) {
  const selected = [];
  for (const group of productOptions || []) {
    const requested = (requestedOptions || []).find((item) => item?.group === group.name);
    const value = requested ? (group.values || []).find((item) => item.label === requested.label) : null;
    if (group.required && !value) return null;
    if (value) {
      selected.push({
        group: group.name,
        label: value.label,
        price_delta: Number(value.price_delta || 0)
      });
    }
  }
  return selected;
}

function optionDelta(productOptions, selectedOptions) {
  let total = 0;
  for (const selected of selectedOptions || []) {
    const group = productOptions.find((item) => item.name === selected.group);
    if (!group) continue;
    const value = (group.values || []).find((item) => item.label === selected.label);
    if (value) total += Number(value.price_delta || 0);
  }
  return total;
}

export async function POST(request) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: 'Pedido inválido.' }, { status: 400 });
  }

  const number = orderNumber();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;

  if (!url || !secret) {
    return Response.json({ order_number: number, persisted: false });
  }

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const requestedItems = Array.isArray(payload.items)
    ? payload.items
        .filter((item) => item?.product_id && Number(item?.qty) > 0)
        .map((item) => ({ ...item, product_id: PRODUCT_ID_ALIASES[item.product_id] || item.product_id }))
    : [];
  const requestedStoreId = STORE_ID_ALIASES[payload.store_id] || payload.store_id;
  if (!requestedStoreId || !requestedItems.length) return Response.json({ error: 'Pedido sem itens ou unidade.' }, { status: 400 });

  const productIds = [...new Set(requestedItems.map((item) => item.product_id))];
  const [{ data: store, error: storeError }, { data: products, error: productsError }, { data: availability, error: availabilityError }] = await Promise.all([
    supabase.from('menu_stores').select('*').eq('id', requestedStoreId).eq('is_active', true).maybeSingle(),
    supabase.from('menu_products').select('*').in('id', productIds).eq('is_active', true),
    supabase.from('menu_store_products').select('*').eq('store_id', payload.store_id).in('product_id', productIds)
  ]);

  if (storeError || productsError || availabilityError || !store) {
    return Response.json({ error: 'Não foi possível validar o cardápio.' }, { status: 400 });
  }

  const productMap = new Map((products || []).map((product) => [product.id, product]));
  const availabilityMap = new Map((availability || []).map((row) => [row.product_id, row]));
  const validatedItems = [];

  for (const requested of requestedItems) {
    const product = productMap.get(requested.product_id);
    if (!product) continue;
    const storeProduct = availabilityMap.get(product.id);
    if (storeProduct?.available === false) continue;
    const qty = Math.max(1, Math.min(99, Math.floor(Number(requested.qty) || 1)));
    const base = storeProduct?.price_override == null ? Number(product.base_price || 0) : Number(storeProduct.price_override);
    const publicProduct = orderProductView(product);
    const selected = validatedSelections(publicProduct.options, Array.isArray(requested.options) ? requested.options : []);
    if (selected == null) continue;
    const unit = Math.max(0, base + optionDelta(publicProduct.options, selected));
    validatedItems.push({
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: publicProduct.name,
      quantity: qty,
      unit_price: unit,
      options: selected,
      line_total: unit * qty
    });
  }

  if (!validatedItems.length) return Response.json({ error: 'Nenhum item disponível.' }, { status: 400 });

  const subtotal = validatedItems.reduce((sum, item) => sum + item.line_total, 0);
  const fulfillment = payload.customer?.fulfillment === 'delivery' ? 'delivery' : 'pickup';
  const deliveryFee = fulfillment === 'delivery' ? Number(store.delivery_fee || 0) : 0;
  const total = subtotal + deliveryFee;
  const orderId = crypto.randomUUID();
  const trackingToken = crypto.randomUUID();
  const customer = payload.customer || {};

  const { error: orderError } = await supabase.from('menu_orders').insert({
    id: orderId,
    public_token: trackingToken,
    order_number: number,
    store_id: store.id,
    customer_name: String(customer.name || '').slice(0, 120),
    customer_phone: String(customer.phone || '').slice(0, 40),
    fulfillment,
    address: fulfillment === 'delivery' ? {
      street: String(customer.street || '').slice(0, 180),
      neighborhood: String(customer.neighborhood || '').slice(0, 120),
      number: String(customer.number || '').slice(0, 30),
      complement: String(customer.complement || '').slice(0, 120),
      reference: String(customer.reference || '').slice(0, 180)
    } : {},
    location_url: String(customer.location_url || '').slice(0, 500),
    payment_method: String(customer.payment_method || '').slice(0, 40),
    notes: String(customer.notes || '').slice(0, 500),
    subtotal,
    delivery_fee: deliveryFee,
    total,
    status: 'new'
  });

  if (orderError) {
    console.error('menu_orders insert:', orderError.message);
    return Response.json({ error: 'Falha ao registrar pedido.' }, { status: 500 });
  }

  const { error: itemsError } = await supabase.from('menu_order_items').insert(
    validatedItems.map((item) => ({ ...item, order_id: orderId }))
  );

  if (itemsError) console.error('menu_order_items insert:', itemsError.message);
  return Response.json({ order_number: number, tracking_token: trackingToken, persisted: !itemsError });
}
