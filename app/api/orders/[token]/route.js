import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';

export async function GET(_request, context) {
  const { token } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(String(token || ''))) {
    return Response.json({ error: 'Código de acompanhamento inválido.' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secret) {
    return Response.json({ error: 'Acompanhamento ainda não configurado.' }, { status: 503 });
  }

  const supabase = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: order, error } = await supabase
    .from('menu_orders')
    .select('order_number,store_id,status,total,fulfillment,created_at,updated_at')
    .eq('public_token', token)
    .maybeSingle();

  if (error || !order) {
    return Response.json({ error: 'Pedido não encontrado.' }, { status: 404 });
  }

  const { data: store } = await supabase
    .from('menu_stores')
    .select('short_name,name,address')
    .eq('id', order.store_id)
    .maybeSingle();

  return Response.json({
    order_number: order.order_number,
    status: order.status,
    total: order.total,
    fulfillment: order.fulfillment,
    created_at: order.created_at,
    updated_at: order.updated_at,
    store: store ? { name: store.short_name || store.name, address: store.address } : null
  });
}
