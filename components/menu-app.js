'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Download,
  ChevronLeft,
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
import { BRAND_MEDIA, getOptionImage, getProductMedia } from '@/lib/menu-media';
import { loadCatalog, normalizeCatalog, productForStore } from '@/lib/catalog-service';

const STORE_KEY = 'cpq_selected_store_v2';
const DELIVERY_CITY = 'Rolim de Moura';
const DELIVERY_STATE = 'RO';
const HERO_SLIDES = BRAND_MEDIA.heroSlides || [];
const PWA_DISMISS_KEY = 'cpq_pwa_install_dismissed_v1';

function normalizeOptions(options) {
  if (Array.isArray(options)) return options;
  if (!options) return [];
  try {
    return typeof options === 'string' ? JSON.parse(options) : [];
  } catch {
    return [];
  }
}

function normalizeLabel(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function visualVariants(product) {
  const name = normalizeLabel(product?.name);
  const options = normalizeOptions(product?.options);

  if (name === 'salgado assado') {
    const group = options.find((item) => item.name === 'Sabor');
    return (group?.values || []).map((value) => ({
      key: `${product.id}-sabor-${value.label}`,
      name: value.label,
      image: getOptionImage(product, 'Sabor', value.label),
      preset: { group: 'Sabor', label: value.label }
    }));
  }

  if (name === 'refrigerante') {
    const group = options.find((item) => item.name === 'Marca');
    return (group?.values || []).map((value) => ({
      key: `${product.id}-marca-${value.label}`,
      name: value.label,
      image: getOptionImage(product, 'Marca', value.label),
      preset: { group: 'Marca', label: value.label }
    }));
  }

  return [{ key: product.id, name: product.name, image: '', preset: null }];
}

function MenuMedia({ source, alt = '', className = '', priority = false, quality = 88, sizes = '(max-width: 680px) calc(100vw - 24px), (max-width: 960px) 50vw, 33vw', unoptimized = false }) {
  const [failed, setFailed] = useState(false);
  const src = failed ? '' : source;

  useEffect(() => {
    setFailed(false);
  }, [source]);

  if (!src) return <span className="mediaSkeleton" aria-hidden="true">🥐</span>;

  return (
    <Image
      className={`menuMedia ${className}`}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={quality}
      priority={priority}
      unoptimized={unoptimized}
      onError={() => setFailed(true)}
    />
  );
}

function ProductCard({ product, store, availability, onAdd, onDecrease, cartQuantity = 0, displayName = '', displayImage = '', preset = null }) {
  const storeProduct = productForStore(product, store, availability);
  const visualSlug = normalizeLabel(displayName || product.name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const media = getProductMedia(product);
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
      className={`productCard visual-${visualSlug} ${disabled ? 'unavailable' : ''} ${product.category_id === 'bebidas' ? 'coldCard' : ''}`}
      onPointerMove={tilt}
      onPointerLeave={reset}
    >
      <div className="productVisual">
        {(displayImage || media.image) ? <MenuMedia source={displayImage || media.image} alt={displayName || product.name} /> : <span className="productEmoji" aria-hidden="true">{product.emoji || '🥐'}</span>}
        {product.badge ? <span className="badge">{product.badge}</span> : null}
      </div>
      <div className="productBody">
        <h3>{displayName || product.name}</h3>
        <p>{product.description}</p>
        <div className="productFoot">
          <div className="price">
            {money(storeProduct.price)}
            {normalizeOptions(product.options).length ? <small>a partir de</small> : null}
          </div>
          {cartQuantity > 0 ? (
            <div className="productStepper" aria-label={`Quantidade de ${displayName || product.name}: ${cartQuantity}`}>
              <button type="button" className="productStepBtn" onClick={onDecrease} aria-label={`Remover uma unidade de ${displayName || product.name}`}>
                <Minus size={17} />
              </button>
              <strong className="productStepQty" aria-live="polite">{cartQuantity}</strong>
              <button type="button" className="productStepBtn productStepPlus" disabled={disabled} onClick={() => onAdd(product, storeProduct.price, preset)} aria-label={`Adicionar mais uma unidade de ${displayName || product.name}`}>
                <Plus size={17} />
              </button>
            </div>
          ) : (
            <button className="addBtn" disabled={disabled} onClick={() => onAdd(product, storeProduct.price, preset)} aria-label={disabled ? `${displayName || product.name} indisponível` : `Adicionar ${displayName || product.name}`}>
              {disabled ? <X size={18} /> : <Plus size={18} />}
              <span>{disabled ? 'Indisponível' : 'Adicionar'}</span>
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function MenuApp({ initialStore = '' }) {
  const [catalog, setCatalog] = useState(() => normalizeCatalog(DEMO_CATALOG));
  const [source, setSource] = useState('loading');
  const [heroIndex, setHeroIndex] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const heroTouchStart = useRef(null);
  const [storeId, setStoreId] = useState(initialStore);
  const [storeGateOpen, setStoreGateOpen] = useState(false);
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [customizing, setCustomizing] = useState(null);
  const [customBasePrice, setCustomBasePrice] = useState(0);
  const [selections, setSelections] = useState({});
  const [customPreview, setCustomPreview] = useState('');
  const [sending, setSending] = useState(false);
  const [locating, setLocating] = useState(false);
  const [installEvent, setInstallEvent] = useState(null);
  const [installVisible, setInstallVisible] = useState(false);
  const [installHelp, setInstallHelp] = useState(false);
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
    const saved = initialStore || window.localStorage.getItem(STORE_KEY) || '';
    if (initialStore) window.localStorage.setItem(STORE_KEY, initialStore);
    setStoreId(saved);
    setStoreGateOpen(!saved);

    async function refresh() {
      try {
        const data = await loadCatalog();
        if (!alive) return;
        setCatalog(data);
        setSource(data.source || 'supabase');
        const candidate = initialStore || window.localStorage.getItem(STORE_KEY) || '';
        if (candidate && !(data.stores || []).some((s) => s.id === candidate || s.slug === candidate)) {
          window.localStorage.removeItem(STORE_KEY);
          setStoreId('');
          setStoreGateOpen(true);
        }
      } catch (error) {
        console.error('Falha ao carregar catálogo:', error);
        if (alive) {
          setCatalog(normalizeCatalog(DEMO_CATALOG));
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
  }, [initialStore]);

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch((error) => console.warn('Falha ao registrar PWA:', error));
    }

    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const dismissed = window.localStorage.getItem(PWA_DISMISS_KEY) === '1';
    if (!standalone && !dismissed) setInstallVisible(true);

    const onInstallPrompt = (event) => {
      event.preventDefault();
      setInstallEvent(event);
      if (!dismissed && !standalone) setInstallVisible(true);
    };
    const onInstalled = () => {
      setInstallEvent(null);
      setInstallVisible(false);
      setInstallHelp(false);
    };

    window.addEventListener('beforeinstallprompt', onInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  useEffect(() => {
    if (heroPaused || HERO_SLIDES.length < 2) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => {
      setHeroIndex((current) => (current + 1) % HERO_SLIDES.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [heroPaused]);

  const stores = (catalog.stores || []).filter((s) => s.is_active !== false);
  const selectedStore = stores.find((s) => s.id === storeId || s.slug === storeId) || stores[0] || null;

  const products = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    const categoryRank = new Map(
      (catalog.categories || []).map((item, index) => [item.id, Number(item.sort_order ?? index)])
    );
    return (catalog.products || [])
      .filter((p) => p.active !== false && p.is_active !== false)
      .filter((p) => !['cappuccino', 'chocolate quente'].includes(normalizeLabel(p.name)))
      .filter((p) => category === 'all' || p.category_id === category)
      .filter((p) => !term || `${p.name} ${p.description || ''}`.toLocaleLowerCase('pt-BR').includes(term))
      .filter((p) => productForStore(p, selectedStore, catalog.availability || []).available)
      .sort((a, b) => {
        const byCategory = Number(categoryRank.get(a.category_id) ?? 999) - Number(categoryRank.get(b.category_id) ?? 999);
        return byCategory || Number(a.sort_order || 0) - Number(b.sort_order || 0);
      });
  }, [catalog, category, search, selectedStore]);

  const categories = (catalog.categories || []).slice().sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0));
  const productSections = category === 'all'
    ? categories
        .map((item) => ({ ...item, products: products.filter((product) => product.category_id === item.id) }))
        .filter((item) => item.products.length)
    : [{
        ...(categories.find((item) => item.id === category) || { id: category, name: 'Cardápio', icon: '•' }),
        products
      }];
  const displaySections = productSections.flatMap((section) => {
    const sectionKey = normalizeLabel(section.slug || section.name || section.id);
    if (sectionKey !== 'salgados') return [section];
    const assados = section.products.filter((product) => normalizeLabel(product.name).includes('assado'));
    const fritos = section.products.filter((product) => !normalizeLabel(product.name).includes('assado'));
    return [
      ...(assados.length ? [{ ...section, id: 'salgados-assados', name: 'Salgados assados', products: assados }] : []),
      ...(fritos.length ? [{ ...section, id: 'salgados-fritos', name: 'Salgados fritos', products: fritos }] : [])
    ];
  });
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

  function beginAdd(product, basePrice, preset = null) {
    const options = normalizeOptions(product.options);
    const media = getProductMedia(product);
    if (!options.length && media.gallery.length <= 1) {
      addToCart(product, basePrice, []);
      return;
    }
    const initial = {};
    options.forEach((group) => {
      if (group.required && group.values?.length) initial[group.name] = group.values[0];
    });
    if (preset?.group && preset?.label) {
      const targetGroup = options.find((group) => group.name === preset.group);
      const targetValue = targetGroup?.values?.find((value) => value.label === preset.label);
      if (targetGroup && targetValue) initial[targetGroup.name] = targetValue;
    }
    const initialOptionImage = options
      .map((group) => getOptionImage(product, group.name, initial[group.name]?.label))
      .find(Boolean);

    const missingRequired = options.find((group) => group.required && !initial[group.name]);
    if (preset && !missingRequired && options.length === 1) {
      addToCart(
        product,
        basePrice,
        options.filter((group) => initial[group.name]).map((group) => ({ group: group.name, value: initial[group.name] }))
      );
      return;
    }

    setCustomizing({ ...product, options, media });
    setCustomBasePrice(basePrice);
    setSelections(initial);
    setCustomPreview(initialOptionImage || media.image || '');
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
    setCustomPreview('');
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
  function cardQuantity(product, preset = null) {
    return cart.reduce((sum, item) => {
      if (item.product_id !== product.id) return sum;
      if (preset?.group && preset?.label) {
        const matchesPreset = (item.options || []).some((option) => option.group === preset.group && option.label === preset.label);
        return matchesPreset ? sum + item.qty : sum;
      }
      return sum + item.qty;
    }, 0);
  }

  function decreaseFromCard(product, preset = null) {
    const candidates = cart.filter((item) => {
      if (item.product_id !== product.id) return false;
      if (preset?.group && preset?.label) {
        return (item.options || []).some((option) => option.group === preset.group && option.label === preset.label);
      }
      return true;
    });
    const target = candidates[candidates.length - 1];
    if (target) changeQty(target.key, -1);
  }

  async function installApp() {
    if (installEvent) {
      installEvent.prompt();
      try {
        await installEvent.userChoice;
      } catch {}
      setInstallEvent(null);
      setInstallVisible(false);
      return;
    }
    setInstallHelp(true);
  }

  function dismissInstall() {
    window.localStorage.setItem(PWA_DISMISS_KEY, '1');
    setInstallVisible(false);
    setInstallHelp(false);
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
            <div className="brandMark"><MenuMedia source={BRAND_MEDIA.logo} alt="Casa do Pão de Queijo" priority sizes="54px" /></div>
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
          <div
            className="heroCard heroCarousel"
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
            onTouchStart={(event) => {
              heroTouchStart.current = event.changedTouches?.[0]?.clientX ?? null;
              setHeroPaused(true);
            }}
            onTouchEnd={(event) => {
              const start = heroTouchStart.current;
              const end = event.changedTouches?.[0]?.clientX ?? null;
              if (start != null && end != null && Math.abs(end - start) > 42) {
                setHeroIndex((current) => end < start
                  ? (current + 1) % HERO_SLIDES.length
                  : (current - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
              }
              heroTouchStart.current = null;
              setHeroPaused(false);
            }}
            onTouchCancel={() => {
              heroTouchStart.current = null;
              setHeroPaused(false);
            }}
          >
            <div className="heroSlides" aria-live="polite">
              {(HERO_SLIDES.length ? HERO_SLIDES : [{ image: BRAND_MEDIA.fachada, title: 'Quentinho, rápido e do seu jeito.', text: 'Escolha sua unidade e faça seu pedido.' }]).map((slide, index) => (
                <div
                  className={`heroSlide ${index === heroIndex ? 'active' : ''} ${slide.cold ? 'cold' : ''}`}
                  key={slide.image}
                  aria-hidden={index !== heroIndex}
                >
                  <MenuMedia
                    source={slide.image}
                    alt=""
                    priority={index === 0}
                    quality={95}
                    unoptimized
                    sizes="(max-width: 680px) calc(100vw - 20px), (max-width: 1500px) calc(100vw - 40px), 1460px"
                  />
                </div>
              ))}
            </div>
            {HERO_SLIDES.length > 1 ? (
              <>
                <button
                  type="button"
                  className="heroArrow heroArrowLeft"
                  aria-label="Banner anterior"
                  onClick={() => setHeroIndex((current) => (current - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  type="button"
                  className="heroArrow heroArrowRight"
                  aria-label="Próximo banner"
                  onClick={() => setHeroIndex((current) => (current + 1) % HERO_SLIDES.length)}
                >
                  <ChevronRight size={24} />
                </button>
                <div className="heroDots" role="tablist" aria-label="Destaques do cardápio">
                  {HERO_SLIDES.map((slide, index) => (
                    <button
                      type="button"
                      key={slide.image}
                      className={index === heroIndex ? 'active' : ''}
                      aria-label={`Ver destaque ${index + 1}: ${slide.title}`}
                      aria-selected={index === heroIndex}
                      role="tab"
                      onClick={() => setHeroIndex(index)}
                    />
                  ))}
                </div>
              </>
            ) : null}
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
        <div className="sectionHead menuOverview">
          <div><h2>Cardápio</h2><p>{products.length} opções disponíveis em {selectedStore?.short_name || 'sua unidade'}</p></div>
        </div>
        {source === 'fallback' ? <div className="notice" style={{ marginBottom: 12 }}>Exibindo a versão local do cardápio.</div> : null}
        {displaySections.length ? displaySections.map((section) => (
          <div className={`categorySection section-${section.id}`} key={section.id}>
            <div className="categorySectionHead">
              <span className="categoryAccent" aria-hidden="true" />
              <h3>{section.icon ? <span aria-hidden="true">{section.icon} </span> : null}{section.name}</h3>
              <span>{section.products.flatMap((product) => visualVariants(product)).length} {section.products.flatMap((product) => visualVariants(product)).length === 1 ? 'opção' : 'opções'}</span>
            </div>
            <div className="productGrid">
              {section.products.flatMap((product) =>
                visualVariants(product).map((variant) => (
                  <ProductCard
                    key={variant.key}
                    product={product}
                    displayName={variant.name}
                    displayImage={variant.image}
                    preset={variant.preset}
                    store={selectedStore}
                    availability={catalog.availability || []}
                    onAdd={beginAdd}
                    onDecrease={() => decreaseFromCard(product, variant.preset)}
                    cartQuantity={cardQuantity(product, variant.preset)}
                  />
                ))
              )}
            </div>
          </div>
        )) : <div className="empty">Nenhum produto encontrado nesta categoria.</div>}
      </section>

      {installVisible ? (
        <div className="pwaInstall" role="region" aria-label="Instalar aplicativo">
          <button className="pwaDismiss" type="button" onClick={dismissInstall} aria-label="Fechar aviso de instalação"><X size={15} /></button>
          <div className="pwaInstallIcon"><Download size={19} /></div>
          <div className="pwaInstallCopy">
            <strong>Instalar aplicativo</strong>
            <span>{installHelp ? 'No iPhone: toque em Compartilhar e depois “Adicionar à Tela de Início”.' : 'Acesse o cardápio mais rápido pelo celular.'}</span>
          </div>
          <button className="pwaInstallButton" type="button" onClick={installApp}>{installHelp ? 'Entendi' : 'Instalar'}</button>
        </div>
      ) : null}

      {itemCount > 0 ? (
        <button className="cartFloat" onClick={() => setCartOpen(true)}>
          <ShoppingBag size={20} /><span className="cartCount">{itemCount}</span><span>Ver pedido · {money(subtotal)}</span><ChevronRight size={18} />
        </button>
      ) : null}

      {storeGateOpen ? (
        <div className="storeGate">
          <div className="storeGateCard">
            <div className="gateBrand"><MenuMedia source={BRAND_MEDIA.logo} alt="Casa do Pão de Queijo" priority sizes="72px" /></div>
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
        <div className="modalWrap" onMouseDown={(e) => {
          if (e.target === e.currentTarget) {
            setCustomizing(null);
            setCustomPreview('');
          }
        }}>
          <div className="modal">
            <div className="modalHead"><div><h2>{customizing.name}</h2><small>Personalize seu pedido</small></div><button className="btn btnGhost iconBtn" onClick={() => { setCustomizing(null); setCustomPreview(''); }}><X size={18} /></button></div>
            <div className="modalBody">
              {customPreview || customizing.media?.image ? (
                <div className="customVisual"><MenuMedia source={customPreview || customizing.media?.image} alt={customizing.name} /></div>
              ) : null}
              {customizing.media?.gallery?.length > 1 ? (
                <div className="customThumbs">
                  {customizing.media.gallery.map((image, index) => (
                    <button type="button" className={`customThumb ${(customPreview || customizing.media.image) === image ? 'active' : ''}`} key={`${image}-${index}`} onClick={() => setCustomPreview(image)} aria-label={`Ver foto ${index + 1}`}>
                      <MenuMedia source={image} alt="" />
                    </button>
                  ))}
                </div>
              ) : null}
              {normalizeOptions(customizing.options).map((group) => (
                <div className="optionGroup" key={group.name}>
                  <h4>{group.name} {group.required ? <small>· obrigatório</small> : null}</h4>
                  <div className="optionList">
                    {(group.values || []).map((value, index, values) => {
                      const active = selections[group.name]?.label === value.label;
                      const optionImage = getOptionImage(customizing, group.name, value.label);
                      const showSection = value.section && (index === 0 || values[index - 1]?.section !== value.section);
                      return (
                        <div className="optionChoiceWrap" key={value.label}>
                          {showSection ? <div className="optionSubhead">{value.section}</div> : null}
                          <button className={`optionChoice ${active ? 'active' : ''}`} onClick={() => {
                            setSelections((current) => ({ ...current, [group.name]: value }));
                            if (optionImage) setCustomPreview(optionImage);
                          }}>
                            <span className="optionChoiceInfo">
                              {optionImage ? <span className="optionChoiceThumb"><MenuMedia source={optionImage} alt="" sizes="58px" /></span> : null}
                              <span>{active ? <Check size={16} style={{ verticalAlign: '-3px', marginRight: 6 }} /> : null}{value.label}</span>
                            </span>
                            <strong>{Number(value.price_delta || 0) ? `+ ${money(value.price_delta)}` : ''}</strong>
                          </button>
                        </div>
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

// redeploy-trigger-2026-09-30-0701
