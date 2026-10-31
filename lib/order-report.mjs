// Reporting is based on recorded orders, never WhatsApp navigation.
export const TIME_ZONE = 'America/Porto_Velho';
export const STATUS_LABELS = Object.freeze({ new: 'Novo', accepted: 'Confirmado', preparing: 'Em preparação', ready: 'Pronto', out_for_delivery: 'Saiu para entrega', completed: 'Concluído', cancelled: 'Cancelado' });
export function localDay(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
export function periodBounds(start, end) {
  const valid = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && new Date(`${s}T12:00:00Z`).toISOString().slice(0, 10) === s;
  if (!valid(start) || !valid(end)) throw new Error('Informe datas válidas.');
  const from = new Date(`${start}T00:00:00-04:00`);
  const until = new Date(new Date(`${end}T00:00:00-04:00`).getTime() + 86400000);
  const days = (until - from) / 86400000;
  if (days < 1 || days > 366) throw new Error('Selecione um período de 1 a 366 dias.');
  return { from: from.toISOString(), until: until.toISOString() };
}
export function cents(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}
export function summarizeOrders(orders, { storeId = '', start = '', end = '', group = 'day' } = {}) {
  const selected = orders.filter(o => (!storeId || o.store_id === storeId) && (!start || localDay(o.created_at) >= start) && (!end || localDay(o.created_at) <= end));
  const statuses = Object.fromEntries(Object.keys(STATUS_LABELS).map(key => [key, 0]));
  const stores = new Map(), products = new Map(), payments = new Map(), series = new Map();
  let completedCents = 0, deliveryCents = 0;
  for (const order of selected) {
    if (order.status in statuses) statuses[order.status]++;
    const store = stores.get(order.store_id) || { id: order.store_id, count: 0, completedCents: 0 };
    store.count++;
    stores.set(store.id, store);
    if (order.status !== 'completed') continue;
    const amount = cents(order.total);
    completedCents += amount;
    deliveryCents += cents(order.delivery_fee);
    store.completedCents += amount;
    const payment = order.payment_method || 'Não informado';
    payments.set(payment, (payments.get(payment) || 0) + amount);
    let day = localDay(order.created_at);
    if (group === 'month') day = day.slice(0, 7);
    if (group === 'week') {
      const date = new Date(`${day}T12:00:00Z`);
      date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
      day = date.toISOString().slice(0, 10);
    }
    series.set(day, (series.get(day) || 0) + amount);
    for (const item of order.menu_order_items || []) {
      const key = item.product_id || item.product_name;
      const entry = products.get(key) || { name: item.product_name, quantity: 0, totalCents: 0 };
      entry.quantity += Number(item.quantity) || 0;
      entry.totalCents += cents(item.line_total);
      products.set(key, entry);
    }
  }
  return { count: selected.length, statuses, completedCents, deliveryCents, averageCents: statuses.completed ? Math.round(completedCents / statuses.completed) : 0,
    stores: [...stores.values()], products: [...products.values()].sort((a,b) => b.quantity - a.quantity), payments: [...payments.entries()], series: [...series.entries()].sort(([a],[b]) => a.localeCompare(b)) };
}
export function matchesOrder(order, search) {
  const term = String(search).trim().toLocaleLowerCase('pt-BR');
  if (!term) return true;
  const text = [order.customer_name, order.order_number, order.customer_phone].join(' ').toLocaleLowerCase('pt-BR');
  const digits = term.replace(/\D/g, '');
  return text.includes(term) || (digits.length >= 3 && /^[\d\s()+-]+$/.test(term) && String(order.customer_phone).replace(/\D/g, '').includes(digits));
}
function csvCell(value) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}
export function ordersCsv(orders, stores) {
  const money = value => (cents(value) / 100).toFixed(2).replace('.', ',');
  const rows = [['Pedido','Data local','Unidade','Modalidade','Status','Pagamento','Total bruto','Taxa de entrega']];
  for (const o of orders) rows.push([o.order_number, new Date(o.created_at).toLocaleString('pt-BR',{timeZone:TIME_ZONE}), stores.find(s=>s.id===o.store_id)?.short_name || o.store_id, o.fulfillment === 'delivery' ? 'Entrega' : 'Retirada', STATUS_LABELS[o.status] || o.status, o.payment_method, money(o.total), money(o.delivery_fee)]);
  return '\uFEFF' + rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
// Fetch every page in the selected period; never report a truncated list as a total.
export async function fetchPeriodOrders(supabase, { start, end, storeId = '' }, snapshot = new Date().toISOString()) {
  const { from, until } = periodBounds(start, end);
  const pageSize = 250;
  const rows = [];
  for (let offset = 0; ; offset += pageSize) {
    let query = supabase.from('menu_orders').select('*,menu_order_items(*)').gte('created_at',from).lt('created_at',until).lte('created_at',snapshot).order('created_at',{ascending:false}).order('id',{ascending:false}).range(offset,offset+pageSize-1);
    if (storeId) query = query.eq('store_id',storeId);
    const { data, error } = await query;
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) return rows;
    if (rows.length >= 25000) throw new Error('Período com muitos pedidos. Selecione um intervalo menor para obter o relatório completo.');
  }
}
