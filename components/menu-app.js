'use client';

import Image from 'next/image';
import { useEffect, useMemo, useState } from 'react';
import {
  Check,
  ChevronRight,
  LocateFixed,
  MapPin,
  Minus,
  PackageCheck,
  Plus,
  Search,
  ShoppingBag,
  Store,
  Truck,
  X
} from 'lucide-react';
import { DEMO_CATALOG, money } from '@/lib/catalog';
import { loadCatalog, productForStore } from '@/lib/catalog-service';

const STORE_KEY = 'cpq_selected_store_v2';
const DELIVERY_CITY = 'Rolim de Moura';
const DELIVERY_STATE = 'RO';

function normalizeOptions(options) {
  if (Array.isArray(options)) return options;
  if (!options) return [];
  try {
    return typeof options === 'string' ? JSON.parse(options) : [];
  } catch {
    return [];
  }
}

function ProductCard({ product, store, availability, onAdd }) {
  const storeProduct = productForStore(product, store, availability);
  const disabled = !storeProduct.available;

  function tilt(event) {
    if (typeof window === 'undefined' || !window.matchMedia('(hover: hover)').matches) return;
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    el.style.setProperty('--ry', `${(px - 0.5) * 8}deg`);
    el.style.setProperty('--rx', `${(0.5 - py) * 8}deg`);
  }

  function reset(event) {
    event.currentTarget.style.setProperty('--ry', '0deg');
    event.currentTarget.style.setProperty('--rx', '0deg');
  }

  return (
    <article
      className={`productCard ${disabled ? 'unavailable' : ''}`}
      onPointerMove={tilt}
      onPointerLeave={reset}
    >
      <div className="productVisual">
        {product.image_url ? (
          <Image
            src={product.image_url}
            alt={product.name}
            fill
            unoptimized={String(product.image_url).startsWith('data:')}
            sizes="(max-width: 620px) 116px, (max-width: 900px) 50vw, 33vw"
          />
        ) : (
          <span className="productEmoji" aria-hidden="true">{product.emoji || '🥐'}</span>
        )}
        {product.badge ? <span className="badge">{product.badge}</span> : null}
      </div>
      <div className="productBody">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="productFoot">
          <div className="price">
            {money(storeProduct.price)}
            {normalizeOptions(product.options).length ? <small>a partir de</small> : null}
          </div>
          <button className="addBtn" disabled={disabled} onClick={() => onAdd(product, storeProduct.price)} aria-label={`Adicionar ${product.name}`}>
            {disabled ? <X size={18} /> : <Plus size={20} />}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function MenuApp() {
  const [catalog, setCatalog] = useState(DEMO_CATALOG);
  const [source, setSource] = useState('loading');
  const [storeId, setStoreId] = useState('');
  const [storeGateOpen, setStoreGateOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customizing, setCustomizing] = useState(null);
  const [customBasePrice, setCustomBasePrice] = useState(0);
  const [selections, setSelections] = useState({});
  const [sending, setSending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    fulfillment: 'pickup',
    street: '',
    neighborhood: '',
    number: '',
    complement: '',
    reference: '',
    cep: '',
    city: DELIVERY_CITY,
    state: DELIVERY_STATE,
    location_url: '',
    payment_method: 'pix',
    notes: ''
  });

  useEffect(() => {
    let alive = true;
    const saved = window.localStorage.getItem(STORE_KEY) || '';
    setStoreId(saved);
    setStoreGateOpen(!saved);

    async function refresh() {
      try {
        const data = await loadCatalog();
        if (!alive) return;
        setCatalog(data);
        setSource(data.source || 'supabase');
        const candidate = window.localStorage.getItem(STORE_KEY) || '';
        if (candidate && !(data.stores || []).some((s) => s.id === candidate || s.slug === candidate)) {
          window.localStorage.removeItem(STORE_KEY);
          setStoreId('');
          setStoreGateOpen(true);
        }
      } catch (error) {
        console.error('Falha ao carregar catálogo:', error);
        if (alive) {
          setCatalog(DEMO_CATALOG);
          setSource('fallback');
        }
      }
    }

    refresh();
    const onLocalUpdate = () => refresh();
    window.addEventListener('cpq:catalog-updated', onLocalUpdate);
    return () => {
      alive = false;
      window.removeEventListener('cpq:catalog-updated', onLocalUpdate);
    };
  }, []);

  const stores = (catalog.stores || []).filter((s) => s.is_active !== false);
  const selectedStore = stores.find((s) => s.id === storeId || s.slug === storeId) || stores[0] || null;

  const products = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    return (catalog.products || [])
      .filter((p) => p.active !== false && p.is_active !== false)
      .filter((p) => category === 'all' || p.category_id === category)
      .filter((p) => !term || `${p.name} ${p.description || ''}`.toLocaleLowerCase('pt-BR').includes(term))
      .filter((p) => productForStore(p, selectedStore, catalog.availability || []).available)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  }, [catalog, category, search, selectedStore]);

  const categories = (catalog.categories || []).slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const itemCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.unit_price * item.qty, 0);
  const deliveryFee = form.fulfillment === 'delivery' ? Number(selectedStore?.delivery_fee || 0) : 0;
  const total = subtotal + deliveryFee;

  function chooseStore(store) {
    setStoreId(store.id);
    window.localStorage.setItem(STORE_KEY, store.id);
    setStoreGateOpen(false);
    setCart([]);
    setForm((f) => ({ ...f, fulfillment: store.pickup_enabled === false ? 'delivery' : 'pickup' }));
  }

  function beginAdd(product, basePrice) {
    const options = normalizeOptions(product.options);
    if (!options.length) {
      addToCart(product, basePrice, []);
      return;
    }
    setCustomizing({ ...product, options });
    setCustomBasePrice(basePrice);
    const initial = {};
    options.forEach((group) => {
      if (group.required && group.values?.length) initial[group.name] = group.values[0];
    });
    setSelections(initial);
  }

  function addToCart(product, basePrice, selected) {
    const unitPrice = Number(basePrice) + selected.reduce((sum, item) => sum + Number(item.value?.price_delta || 0), 0);
    const optionText = selected.map((item) => `${item.group}: ${item.value.label}`).join(' • ');
    const key = `${product.id}::${optionText}`;
    setCart((current) => {
      const found = current.find((item) => item.key === key);
      if (found) return current.map((item) => item.key === key ? { ...item, qty: item.qty + 1 } : item);
      return [...current, {
        key,
        product_id: product.id,
        name: product.name,
        emoji: product.emoji || '🥐',
        qty: 1,
        unit_price: unitPrice,
        options: selected.map((item) => ({ group: item.group, label: item.value.label, price_delta: Number(item.value?.price_delta || 0) }))
      }];
    });
    setCustomizing(null);
  }

  function confirmCustom() {
    if (!customizing) return;
    const groups = normalizeOptions(customizing.options);
    const missing = groups.find((g) => g.required && !selections[g.name]);
    if (missing) return;
    addToCart(
      customizing,
      customBasePrice,
      groups.filter((g) => selections[g.name]).map((g) => ({ group: g.name, value: selections[g.name] }))
    );
  }

  function changeQty(key, delta) {
    setCart((current) => current
      .map((item) => item.key === key ? { ...item, qty: item.qty + delta } : item)
      .filter((item) => item.qty > 0));
  }

  function captureLocation() {
    if (!navigator.geolocation) {
      window.alert('Este navegador não disponibiliza localização. O endereço continua suficiente para fazer o pedido.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setForm((f) => ({ ...f, location_url: `https://www.google.com/maps?q=${latitude},${longitude}` }));
        setLocating(false);
      },
      () => {
        setLocating(false);
        window.alert('Não foi possível obter a localização. Você pode continuar normalmente usando somente o endereço.');
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
    );
  }

  async function finishOrder(event) {
    event.preventDefault();
    if (!selectedStore || !cart.length || sending) return;
    if (!form.name.trim() || !form.phone.trim()) {
      window.alert('Informe seu nome e telefone.');
      return;
    }
    if (form.fulfillment === 'delivery' && (!form.street.trim() || !form.neighborhood.trim() || !form.number.trim())) {
      window.alert('Para entrega, informe rua/avenida, bairro e número.');
      return;
    }
    const whatsapp = String(selectedStore.whatsapp || '').replace(/\D/g, '');
    if (!whatsapp) {
      window.alert('O WhatsApp desta unidade ainda não foi configurado.');
      return;
    }

    setSending(true);
    let orderNumber = '';
    let trackingToken = '';
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          store_id: selectedStore.id,
          customer: form,
          items: cart.map(({ product_id, name, qty, unit_price, options }) => ({ product_id, name, qty, unit_price, options })),
          subtotal,
          delivery_fee: deliveryFee,
          total
        })
      });
      if (response.ok) {
        const saved = await response.json();
        orderNumber = saved.order_number || '';
        trackingToken = saved.tracking_token || '';
      }
    } catch (error) {
      console.warn('Pedido seguirá apenas via WhatsApp:', error);
    }

    const trackingUrl = trackingToken ? `${window.location.origin}/pedido/${trackingToken}` : '';
    const deliveryAddress = `${form.street}, ${form.number} — ${form.neighborhood}${form.complement ? ` — ${form.complement}` : ''} — ${DELIVERY_CITY}/${DELIVERY_STATE}${form.cep ? ` — CEP ${form.cep}` : ''}`;
    const lines = [
      '🧀 *CASA DO PÃO DE QUEIJO*',
      `🏪 Unidade: *${selectedStore.short_name || selectedStore.name}*`,
      orderNumber ? `🧾 Pedido: *${orderNumber}*` : '',
      '',
      '*ITENS*',
      ...cart.flatMap((item) => [
        `• ${item.qty}x ${item.name} — ${money(item.unit_price * item.qty)}`,
        item.options?.length ? `  ${item.options.map((o) => `${o.group}: ${o.label}`).join(' | ')}` : ''
      ]).filter(Boolean),
      '',
      `Subtotal: ${money(subtotal)}`,
      form.fulfillment === 'delivery' ? `Entrega: ${money(deliveryFee)}` : 'Retirada na loja',
      `*Total: ${money(total)}*`,
      '',
      `👤 ${form.name}`,
      `📱 ${form.phone}`,
      `💳 Pagamento: ${form.payment_method}`,
      form.fulfillment === 'delivery' ? `📍 Endereço: ${deliveryAddress}` : `📍 Retirada: ${selectedStore.address}`,
      form.reference ? `🏠 Referência: ${form.reference}` : '',
      form.location_url ? `🗺️ Localização GPS: ${form.location_url}` : '',
      form.notes ? `📝 Observação: ${form.notes}` : '',
      trackingUrl ? `🔎 Acompanhar pedido: ${trackingUrl}` : ''
    ].filter(Boolean);

    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
    setSending(false);
    window.location.href = url;
  }

  const selectedOptionsPrice = customizing
    ? customBasePrice + Object.values(selections).reduce((sum, value) => sum + Number(value?.price_delta || 0), 0)
    : 0;

  return (
    <main className="shell">
      <header className="topbar">
        <div className="container topbarInner">
          <div className="brand">
            <div className="brandMark">🧀</div>
            <div className="brandText">
              <strong>Casa do Pão de Queijo</strong>
              <span>{selectedStore?.short_name || 'Escolha sua unidade'} · Rolim de Moura</span>
            </div>
          </div>
          <div className="headerActions">
            <button className="btn btnGhost" onClick={() => setStoreGateOpen(true)}><Store size={17} /><span>Trocar loja</span></button>
            <button className="btn btnPrimary iconBtn" onClick={() => setCartOpen(true)} aria-label="Abrir carrinho"><ShoppingBag size={18} /></button>
          </div>
        </div>
      </header>

      <section className="hero">
        <div className="container">
          <div className="heroCard">
            <div className="heroCopy">
              <span className="eyebrow"><PackageCheck size={14} /> pedido direto da loja</span>
              <h1>Quentinho, rápido e do seu jeito.</h1>
              <p>Escolha sua unidade em Rolim de Moura, monte o pedido e envie direto para o WhatsApp da loja certa.</p>
            </div>
            <div className="heroStat">
              <span className="bigEmoji">🥐</span>
              <strong>Feito para pedir fácil</strong>
              <span>Sem cadastro obrigatório e com retirada ou entrega.</span>
            </div>
          </div>

          <div className="storeStrip">
            {stores.map((store) => (
              <button key={store.id} className={`storePill ${selectedStore?.id === store.id ? 'active' : ''}`} onClick={() => chooseStore(store)}>
                <strong>{store.short_name || store.name}</strong>
                <span><MapPin size={12} style={{ verticalAlign: '-2px', marginRight: 4 }} />{store.address}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="toolbar">
        <div className="container">
          <div className="searchRow">
            <div className="searchBox"><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar pão de queijo, café, refrigerante..." /></div>
          </div>
          <div className="categoryRow">
            <button className={`categoryBtn ${category === 'all' ? 'active' : ''}`} onClick={() => setCategory('all')}>Todos</button>
            {categories.map((item) => (
              <button key={item.id} className={`categoryBtn ${category === item.id ? 'active' : ''}`} onClick={() => setCategory(item.id)}>{item.icon || '•'} {item.name}</button>
            ))}
          </div>
        </div>
      </section>

      <section className="container">
        <div className="sectionHead">
          <div><h2>Cardápio</h2><p>{products.length} opções disponíveis em {selectedStore?.short_name || 'sua unidade'}</p></div>
        </div>
        {source === 'fallback' ? <div className="notice" style={{ marginBottom: 12 }}>Exibindo a versão local do cardápio.</div> : null}
        {products.length ? (
          <div className="productGrid">
            {products.map((product) => <ProductCard key={product.id} product={product} store={selectedStore} availability={catalog.availability || []} onAdd={beginAdd} />)}
          </div>
        ) : <div className="empty">Nenhum produto encontrado nesta categoria.</div>}
      </section>

      {itemCount > 0 ? (
        <button className="cartFloat" onClick={() => setCartOpen(true)}>
          <ShoppingBag size={20} /><span className="cartCount">{itemCount}</span><span>Ver pedido · {money(subtotal)}</span><ChevronRight size={18} />
        </button>
      ) : null}

      {storeGateOpen ? (
        <div className="storeGate">
          <div className="storeGateCard">
            <span className="eyebrow" style={{ color: '#9a5b00' }}><Store size={14} /> duas unidades em Rolim de Moura</span>
            <h1>Onde você quer pedir?</h1>
            <p>Seu pedido será enviado automaticamente para o WhatsApp da unidade escolhida.</p>
            <div className="storeChoices">
              {stores.map((store) => (
                <button key={store.id} className="storeChoice" onClick={() => chooseStore(store)}>
                  <strong>{store.short_name || store.name}</strong>
                  <span>{store.address}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {customizing ? (
        <div className="modalWrap" onMouseDown={(e) => e.target === e.currentTarget && setCustomizing(null)}>
          <div className="modal">
            <div className="modalHead"><div><h2>{customizing.name}</h2><small>Personalize seu pedido</small></div><button className="btn btnGhost iconBtn" onClick={() => setCustomizing(null)}><X size={18} /></button></div>
            <div className="modalBody">
              {normalizeOptions(customizing.options).map((group) => (
                <div className="optionGroup" key={group.name}>
                  <h4>{group.name} {group.required ? <small>· obrigatório</small> : null}</h4>
                  <div className="optionList">
                    {(group.values || []).map((value) => {
                      const active = selections[group.name]?.label === value.label;
                      return (
                        <button key={value.label} className={`optionChoice ${active ? 'active' : ''}`} onClick={() => setSelections((s) => ({ ...s, [group.name]: value }))}>
                          <span>{active ? <Check size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} /> : null}{value.label}</span>
                          <strong>{Number(value.price_delta || 0) ? `+ ${money(value.price_delta)}` : ''}</strong>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
              <button className="btn btnBrand" style={{ width: '100%', marginTop: 8 }} onClick={confirmCustom}>Adicionar · {money(selectedOptionsPrice)}</button>
            </div>
          </div>
        </div>
      ) : null}

      {cartOpen ? <div className="backdrop" onClick={() => setCartOpen(false)} /> : null}
      {cartOpen ? (
        <aside className="drawer">
          <div className="drawerHead"><div><h2>Seu pedido</h2><small>{selectedStore?.short_name}</small></div><button className="btn btnGhost iconBtn" onClick={() => setCartOpen(false)}><X size={18} /></button></div>
          <div className="drawerBody">
            {cart.length ? cart.map((item) => (
              <div className="cartItem" key={item.key}>
                <div><strong>{item.emoji} {item.name}</strong>{item.options?.length ? <small>{item.options.map((o) => `${o.group}: ${o.label}`).join(' · ')}</small> : null}<div className="qty"><button onClick={() => changeQty(item.key, -1)}><Minus size={14} /></button><strong>{item.qty}</strong><button onClick={() => changeQty(item.key, 1)}><Plus size={14} /></button></div></div>
                <strong>{money(item.unit_price * item.qty)}</strong>
              </div>
            )) : <div className="empty">Seu carrinho está vazio.</div>}

            {cart.length ? (
              <form onSubmit={finishOrder}>
                <div className="summary">
                  <div className="summaryLine"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
                  <div className="summaryLine"><span>Entrega</span><strong>{form.fulfillment === 'delivery' ? money(deliveryFee) : 'Grátis'}</strong></div>
                  <div className="summaryLine total"><span>Total</span><span>{money(total)}</span></div>
                </div>

                <div className="segmented" style={{ marginBottom: 12 }}>
                  <button type="button" className={form.fulfillment === 'pickup' ? 'active' : ''} disabled={selectedStore?.pickup_enabled === false} onClick={() => setForm((f) => ({ ...f, fulfillment: 'pickup' }))}><Store size={15} /> Retirada</button>
                  <button type="button" className={form.fulfillment === 'delivery' ? 'active' : ''} disabled={selectedStore?.delivery_enabled === false} onClick={() => setForm((f) => ({ ...f, fulfillment: 'delivery' }))}><Truck size={15} /> Entrega</button>
                </div>

                <div className="formGrid">
                  <div className="field"><label>Nome *</label><input required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} /></div>
                  <div className="field"><label>WhatsApp *</label><input required inputMode="tel" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} /></div>

                  {form.fulfillment === 'delivery' ? <>
                    <div className="field full"><label>Rua / Avenida *</label><input required placeholder="Ex.: Av. 25 de Agosto" value={form.street} onChange={(e) => setForm((f) => ({ ...f, street: e.target.value }))} /></div>
                    <div className="field"><label>Bairro *</label><input required value={form.neighborhood} onChange={(e) => setForm((f) => ({ ...f, neighborhood: e.target.value }))} /></div>
                    <div className="field"><label>Número *</label><input required inputMode="numeric" value={form.number} onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))} /></div>
                    <div className="field"><label>Cidade / UF</label><input value={`${DELIVERY_CITY} - ${DELIVERY_STATE}`} readOnly /></div>
                    <div className="field"><label>CEP (opcional)</label><input inputMode="numeric" placeholder="76940-000" value={form.cep} onChange={(e) => setForm((f) => ({ ...f, cep: e.target.value }))} /></div>
                    <div className="field"><label>Complemento (opcional)</label><input placeholder="Apto, bloco, fundos..." value={form.complement} onChange={(e) => setForm((f) => ({ ...f, complement: e.target.value }))} /></div>
                    <div className="field full"><label>Ponto de referência (opcional)</label><input placeholder="Ex.: próximo ao mercado..." value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} /></div>
                    <div className="field full">
                      <label>Localização GPS (opcional)</label>
                      <div className="notice" style={{ marginBottom: 8 }}>O endereço acima é obrigatório. A localização é opcional e só será usada se você tocar no botão e autorizar.</div>
                      {form.location_url ? <div className="notice" style={{ marginBottom: 8 }}>✓ Localização adicionada ao pedido.</div> : null}
                      <button type="button" className="btn btnGhost" onClick={captureLocation} disabled={locating}>
                        <LocateFixed size={16} /> {locating ? 'Obtendo localização...' : form.location_url ? 'Atualizar minha localização' : 'Usar minha localização'}
                      </button>
                    </div>
                  </> : null}

                  <div className="field full"><label>Forma de pagamento</label><select value={form.payment_method} onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}><option value="pix">PIX</option><option value="dinheiro">Dinheiro</option><option value="cartao">Cartão na entrega/retirada</option></select></div>
                  <div className="field full"><label>Observação</label><textarea placeholder="Ex.: troco para R$ 50..." value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} /></div>
                </div>

                {!selectedStore?.whatsapp ? <div className="notice" style={{ marginTop: 12 }}>O WhatsApp desta unidade precisa ser configurado antes de receber pedidos.</div> : null}
                <button className="btn btnBrand" disabled={sending || !selectedStore?.whatsapp} style={{ width: '100%', minHeight: 52, marginTop: 14 }} type="submit">{sending ? 'Preparando pedido...' : 'Enviar pedido no WhatsApp'}</button>
              </form>
            ) : null}
          </div>
        </aside>
      ) : null}
    </main>
  );
}
