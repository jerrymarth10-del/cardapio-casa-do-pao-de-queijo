import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

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

  // O pedido continua pelo WhatsApp mesmo antes de o banco ser conectado.
  if (!url || !secret) {
    return Response.json({ order_number: number, persisted: false });
  }

  // Esta chave existe somente no runtime do servidor da Vercel e nunca vai ao navegador.
  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const requestedItems = Array.isArray(payload.items) ? payload.items.filter((item) => item?.product_id && Number(item?.qty) > 0) : [];
  if (!payload.store_id || !requestedItems.length) return Response.json({ error: 'Pedido sem itens ou unidade.' }, { status: 400 });

  const productIds = [...new Set(requestedItems.map((item) => item.product_id))];
  const [{ data: store, error: storeError }, { data: products, error: productsError }, { data: availability, error: availabilityError }] = await Promise.all([
    supabase.from('menu_stores').select('*').eq('id', payload.store_id).eq('is_active', true).maybeSingle(),
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
    const selected = Array.isArray(requested.options) ? requested.options : [];
    const unit = Math.max(0, base + optionDelta(safeOptions(product.options), selected));
    validatedItems.push({
      id: crypto.randomUUID(),
      product_id: product.id,
      product_name: product.name,
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
  const customer = payload.customer || {};

  const { error: orderError } = await supabase.from('menu_orders').insert({
    id: orderId,
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
  return Response.json({ order_number: number, persisted: !itemsError });
}
