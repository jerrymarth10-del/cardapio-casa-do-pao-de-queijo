'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Boxes,
  ClipboardList,
  ImagePlus,
  LayoutDashboard,
  LogOut,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Store,
  Trash2,
  X
} from 'lucide-react';
import { DEMO_CATALOG, money } from '@/lib/catalog';
import { clearLocalPreview, loadCatalog, writeLocalPreview } from '@/lib/catalog-service';
import { getSupabaseBrowser, hasSupabaseConfig } from '@/lib/supabase-browser';

const emptyProduct = {
  id: '', name: '', description: '', category_id: '', base_price: 0, image_url: '', emoji: '🥐', badge: '', sort_order: 100, is_active: true, active: true, options: []
};
const emptyCategory = { id: '', name: '', icon: '•', sort_order: 100, is_active: true };

function safeOptions(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { return typeof raw === 'string' ? JSON.parse(raw) : []; } catch { return []; }
}

function slugify(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function Modal({ title, onClose, children }) {
  return (
    <div className="modalWrap" onMouseDown={(e) => e.currentTarget === e.target && onClose()}>
      <div className="modal">
        <div className="modalHead"><h2>{title}</h2><button className="btn btnGhost iconBtn" onClick={onClose}><X size={18} /></button></div>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const cloud = hasSupabaseConfig();
  const supabase = cloud ? getSupabaseBrowser() : null;
  const [tab, setTab] = useState('overview');
  const [catalog, setCatalog] = useState(DEMO_CATALOG);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(!cloud);
  const [session, setSession] = useState(null);
  const [authError, setAuthError] = useState('');
  const [login, setLogin] = useState({ email: '', password: '' });
  const [productEditor, setProductEditor] = useState(null);
  const [categoryEditor, setCategoryEditor] = useState(null);
  const [storeEditor, setStoreEditor] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function verifyAdmin(userId) {
    if (!cloud || !userId) return !cloud;
    const { data, error } = await supabase.from('menu_admins').select('user_id').eq('user_id', userId).maybeSingle();
    if (error || !data) return false;
    return true;
  }

  async function refresh() {
    setLoading(true);
    try {
      if (!cloud) {
        const data = await loadCatalog();
        setCatalog(data);
        setOrders([]);
        return;
      }
      const [stores, categories, products, availability, orderRows] = await Promise.all([
        supabase.from('menu_stores').select('*').order('sort_order'),
        supabase.from('menu_categories').select('*').order('sort_order'),
        supabase.from('menu_products').select('*').order('sort_order'),
        supabase.from('menu_store_products').select('*'),
        supabase.from('menu_orders').select('*').order('created_at', { ascending: false }).limit(100)
      ]);
      const error = [stores, categories, products, availability, orderRows].find((r) => r.error)?.error;
      if (error) throw error;
      setCatalog({ stores: stores.data || [], categories: categories.data || [], products: products.data || [], availability: availability.data || [], source: 'supabase' });
      setOrders(orderRows.data || []);
    } catch (error) {
      console.error(error);
      window.alert(`Falha ao atualizar painel: ${error.message || error}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    if (!cloud) {
      refresh();
      return () => { mounted = false; };
    }

    async function init() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const current = data.session || null;
      setSession(current);
      if (current?.user) {
        const ok = await verifyAdmin(current.user.id);
        if (mounted) setAuthorized(ok);
        if (ok) await refresh();
      }
      setLoading(false);
    }
    init();
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, next) => {
      if (!mounted) return;
      setSession(next);
      if (!next?.user) {
        setAuthorized(false);
        return;
      }
      const ok = await verifyAdmin(next.user.id);
      setAuthorized(ok);
      if (ok) await refresh();
    });
    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signIn(event) {
    event.preventDefault();
    setAuthError('');
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: login.email.trim(), password: login.password });
    if (error) {
      setAuthError(error.message);
      setLoading(false);
      return;
    }
    const ok = await verifyAdmin(data.user?.id);
    if (!ok) {
      await supabase.auth.signOut();
      setAuthError('Este usuário existe, mas não tem permissão de administrador deste cardápio.');
      setLoading(false);
      return;
    }
    setAuthorized(true);
    await refresh();
  }

  async function logout() {
    if (cloud) await supabase.auth.signOut();
    setAuthorized(false);
    setSession(null);
  }

  function persistLocal(next) {
    setCatalog(next);
    writeLocalPreview({ stores: next.stores, categories: next.categories, products: next.products, availability: next.availability || [] });
  }

  async function saveProduct(event) {
    event.preventDefault();
    if (!productEditor?.name?.trim() || !productEditor?.category_id) return;
    setSaving(true);
    try {
      const payload = {
        ...productEditor,
        name: productEditor.name.trim(),
        base_price: Number(productEditor.base_price || 0),
        sort_order: Number(productEditor.sort_order || 0),
        options: safeOptions(productEditor.options),
        is_active: productEditor.is_active !== false
      };
      delete payload.active;
      if (!cloud) {
        const id = payload.id || `local-${slugify(payload.name)}-${Date.now()}`;
        const products = catalog.products.some((p) => p.id === id)
          ? catalog.products.map((p) => p.id === id ? { ...payload, id, active: payload.is_active } : p)
          : [...catalog.products, { ...payload, id, active: payload.is_active }];
        persistLocal({ ...catalog, products });
      } else {
        const dbPayload = { ...payload };
        if (!dbPayload.id) delete dbPayload.id;
        const { error } = await supabase.from('menu_products').upsert(dbPayload);
        if (error) throw error;
        await refresh();
      }
      setProductEditor(null);
    } catch (error) {
      window.alert(error.message || 'Não foi possível salvar o produto.');
    } finally { setSaving(false); }
  }

  async function deleteProduct(product) {
    if (!window.confirm(`Remover “${product.name}” do cardápio?`)) return;
    if (!cloud) {
      persistLocal({ ...catalog, products: catalog.products.filter((p) => p.id !== product.id), availability: (catalog.availability || []).filter((a) => a.product_id !== product.id) });
      return;
    }
    const { error } = await supabase.from('menu_products').delete().eq('id', product.id);
    if (error) window.alert(error.message); else refresh();
  }

  async function saveCategory(event) {
    event.preventDefault();
    if (!categoryEditor?.name?.trim()) return;
    setSaving(true);
    try {
      if (!cloud) {
        const id = categoryEditor.id || `local-cat-${slugify(categoryEditor.name)}-${Date.now()}`;
        const item = { ...categoryEditor, id, sort_order: Number(categoryEditor.sort_order || 0) };
        const categories = catalog.categories.some((c) => c.id === id) ? catalog.categories.map((c) => c.id === id ? item : c) : [...catalog.categories, item];
        persistLocal({ ...catalog, categories });
      } else {
        const payload = { ...categoryEditor, name: categoryEditor.name.trim(), slug: slugify(categoryEditor.name), sort_order: Number(categoryEditor.sort_order || 0) };
        if (!payload.id) delete payload.id;
        const { error } = await supabase.from('menu_categories').upsert(payload);
        if (error) throw error;
        await refresh();
      }
      setCategoryEditor(null);
    } catch (error) { window.alert(error.message); }
    finally { setSaving(false); }
  }

  async function deleteCategory(item) {
    if (catalog.products.some((p) => p.category_id === item.id)) {
      window.alert('Mova ou remova os produtos desta categoria antes de excluí-la.');
      return;
    }
    if (!window.confirm(`Excluir a categoria “${item.name}”?`)) return;
    if (!cloud) {
      persistLocal({ ...catalog, categories: catalog.categories.filter((c) => c.id !== item.id) });
      return;
    }
    const { error } = await supabase.from('menu_categories').delete().eq('id', item.id);
    if (error) window.alert(error.message); else refresh();
  }

  async function saveStore(event) {
    event.preventDefault();
    if (!storeEditor) return;
    setSaving(true);
    try {
      const payload = {
        ...storeEditor,
        delivery_fee: Number(storeEditor.delivery_fee || 0),
        sort_order: Number(storeEditor.sort_order || 0),
        whatsapp: String(storeEditor.whatsapp || '').replace(/\D/g, '')
      };
      if (!cloud) {
        persistLocal({ ...catalog, stores: catalog.stores.map((s) => s.id === payload.id ? payload : s) });
      } else {
        const { error } = await supabase.from('menu_stores').update(payload).eq('id', payload.id);
        if (error) throw error;
        await refresh();
      }
      setStoreEditor(null);
    } catch (error) { window.alert(error.message); }
    finally { setSaving(false); }
  }

  async function uploadProductImage(file) {
    if (!file || !productEditor) return;
    if (!cloud) {
      const reader = new FileReader();
      reader.onload = () => setProductEditor((p) => ({ ...p, image_url: reader.result }));
      reader.readAsDataURL(file);
      return;
    }
    setUploading(true);
    try {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `${crypto.randomUUID()}.${extension}`;
      const { error } = await supabase.storage.from('menu-products').upload(path, file, { cacheControl: '3600', upsert: false });
      if (error) throw error;
      const { data } = supabase.storage.from('menu-products').getPublicUrl(path);
      setProductEditor((p) => ({ ...p, image_url: data.publicUrl }));
    } catch (error) { window.alert(error.message); }
    finally { setUploading(false); }
  }

  async function updateOrderStatus(order, status) {
    if (!cloud) return;
    const { error } = await supabase.from('menu_orders').update({ status }).eq('id', order.id);
    if (error) window.alert(error.message); else setOrders((rows) => rows.map((r) => r.id === order.id ? { ...r, status } : r));
  }

  const stats = useMemo(() => ({
    products: catalog.products?.length || 0,
    activeProducts: catalog.products?.filter((p) => p.is_active !== false && p.active !== false).length || 0,
    stores: catalog.stores?.filter((s) => s.is_active !== false).length || 0,
    newOrders: orders.filter((o) => o.status === 'new').length
  }), [catalog, orders]);

  if (cloud && (!session || !authorized)) {
    return (
      <main className="loginWrap">
        <form className="loginCard" onSubmit={signIn}>
          <div className="brandMark" style={{ marginBottom: 14 }}>🧀</div>
          <h1>Painel do cardápio</h1>
          <p>Entre com o e-mail autorizado para gerenciar produtos, lojas e pedidos.</p>
          <div className="adminForm">
            <div className="field"><label>E-mail</label><input type="email" required value={login.email} onChange={(e) => setLogin((v) => ({ ...v, email: e.target.value }))} /></div>
            <div className="field"><label>Senha</label><input type="password" required value={login.password} onChange={(e) => setLogin((v) => ({ ...v, password: e.target.value }))} /></div>
            {authError ? <div className="notice">{authError}</div> : null}
            <button className="btn btnBrand" disabled={loading} type="submit">{loading ? 'Entrando...' : 'Entrar no painel'}</button>
          </div>
        </form>
      </main>
    );
  }

  return (
    <main className="adminShell">
      <header className="adminTop">
        <div className="container">
          <div className="adminBrand"><strong>🧀 Casa do Pão de Queijo</strong><span>Administração do cardápio</span></div>
          <div style={{ display: 'flex', gap: 8 }}><button className="btn btnGhost" onClick={refresh}><RefreshCw size={16} /> Atualizar</button>{cloud ? <button className="btn btnGhost" onClick={logout}><LogOut size={16} /> Sair</button> : null}</div>
        </div>
      </header>

      <div className="container adminLayout">
        <aside className="adminSide">
          <nav className="adminNav">
            <button className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}><LayoutDashboard size={16} style={{ verticalAlign: '-3px', marginRight: 7 }} />Visão geral</button>
            <button className={tab === 'products' ? 'active' : ''} onClick={() => setTab('products')}><Boxes size={16} style={{ verticalAlign: '-3px', marginRight: 7 }} />Produtos</button>
            <button className={tab === 'categories' ? 'active' : ''} onClick={() => setTab('categories')}><Settings2 size={16} style={{ verticalAlign: '-3px', marginRight: 7 }} />Categorias</button>
            <button className={tab === 'stores' ? 'active' : ''} onClick={() => setTab('stores')}><Store size={16} style={{ verticalAlign: '-3px', marginRight: 7 }} />Lojas</button>
            <button className={tab === 'orders' ? 'active' : ''} onClick={() => setTab('orders')}><ClipboardList size={16} style={{ verticalAlign: '-3px', marginRight: 7 }} />Pedidos</button>
          </nav>
        </aside>

        <section className="adminMain">
          {!cloud ? <div className="notice" style={{ marginBottom: 14 }}><strong>Modo de prévia local.</strong> As mudanças funcionam neste navegador para testar o painel. Quando o Supabase do cardápio for conectado, o mesmo painel passa a salvar para todos os clientes.</div> : null}

          {tab === 'overview' ? <>
            <div className="adminTitle"><div><h1>Visão geral</h1><p>Controle rápido das duas unidades e do catálogo.</p></div></div>
            <div className="stats">
              <div className="stat"><span>Produtos</span><strong>{stats.products}</strong></div>
              <div className="stat"><span>Ativos</span><strong>{stats.activeProducts}</strong></div>
              <div className="stat"><span>Unidades ativas</span><strong>{stats.stores}</strong></div>
              <div className="stat"><span>Novos pedidos</span><strong>{stats.newOrders}</strong></div>
            </div>
            <div className="panel"><div className="panelHead"><h2>Unidades</h2></div><div className="tableWrap"><table className="dataTable"><thead><tr><th>Loja</th><th>Endereço</th><th>WhatsApp</th><th>Entrega</th></tr></thead><tbody>{catalog.stores.map((s) => <tr key={s.id}><td><strong>{s.short_name || s.name}</strong></td><td>{s.address}</td><td>{s.whatsapp || 'Não configurado'}</td><td>{money(s.delivery_fee)}</td></tr>)}</tbody></table></div></div>
          </> : null}

          {tab === 'products' ? <>
            <div className="adminTitle"><div><h1>Produtos</h1><p>Cadastre, edite, pause e remova itens.</p></div><button className="btn btnBrand" onClick={() => setProductEditor({ ...emptyProduct, category_id: catalog.categories[0]?.id || '' })}><Plus size={17} /> Novo produto</button></div>
            <div className="panel"><div className="tableWrap"><table className="dataTable"><thead><tr><th>Produto</th><th>Categoria</th><th>Preço</th><th>Status</th><th></th></tr></thead><tbody>{catalog.products.map((p) => <tr key={p.id}><td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><div className="previewThumb">{p.image_url ? <img src={p.image_url} alt="" /> : p.emoji || '🥐'}</div><div><strong>{p.name}</strong><div style={{ color: '#8a817b', fontSize: 11 }}>{p.description}</div></div></div></td><td>{catalog.categories.find((c) => c.id === p.category_id)?.name || '—'}</td><td><strong>{money(p.base_price)}</strong></td><td><span className={`status ${(p.is_active === false || p.active === false) ? 'off' : ''}`}>{(p.is_active === false || p.active === false) ? 'Pausado' : 'Ativo'}</span></td><td><div className="tableActions"><button className="miniBtn" onClick={() => setProductEditor({ ...p, is_active: p.is_active ?? p.active ?? true, options: safeOptions(p.options) })}>Editar</button><button className="miniBtn" onClick={() => deleteProduct(p)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div></div>
          </> : null}

          {tab === 'categories' ? <>
            <div className="adminTitle"><div><h1>Categorias</h1><p>Organize o cardápio na ordem que preferir.</p></div><button className="btn btnBrand" onClick={() => setCategoryEditor({ ...emptyCategory })}><Plus size={17} /> Nova categoria</button></div>
            <div className="panel"><div className="tableWrap"><table className="dataTable"><thead><tr><th>Categoria</th><th>Ordem</th><th>Produtos</th><th></th></tr></thead><tbody>{catalog.categories.map((c) => <tr key={c.id}><td><strong>{c.icon || '•'} {c.name}</strong></td><td>{c.sort_order}</td><td>{catalog.products.filter((p) => p.category_id === c.id).length}</td><td><div className="tableActions"><button className="miniBtn" onClick={() => setCategoryEditor({ ...c })}>Editar</button><button className="miniBtn" onClick={() => deleteCategory(c)}><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></div></div>
          </> : null}

          {tab === 'stores' ? <>
            <div className="adminTitle"><div><h1>Lojas</h1><p>Defina WhatsApp, endereço, entrega e disponibilidade de cada unidade.</p></div></div>
            <div className="panel"><div className="tableWrap"><table className="dataTable"><thead><tr><th>Unidade</th><th>Endereço</th><th>WhatsApp</th><th>Taxa</th><th></th></tr></thead><tbody>{catalog.stores.map((s) => <tr key={s.id}><td><strong>{s.short_name || s.name}</strong></td><td>{s.address}</td><td>{s.whatsapp || 'Cadastrar'}</td><td>{money(s.delivery_fee)}</td><td><div className="tableActions"><button className="miniBtn" onClick={() => setStoreEditor({ ...s })}>Editar</button></div></td></tr>)}</tbody></table></div></div>
          </> : null}

          {tab === 'orders' ? <>
            <div className="adminTitle"><div><h1>Pedidos</h1><p>Histórico recebido pelo cardápio online.</p></div></div>
            {!cloud ? <div className="empty">Os pedidos aparecerão aqui quando o banco do cardápio estiver conectado.</div> : <div className="panel"><div className="tableWrap"><table className="dataTable"><thead><tr><th>Pedido</th><th>Cliente</th><th>Unidade</th><th>Total</th><th>Status</th></tr></thead><tbody>{orders.map((o) => <tr key={o.id}><td><strong>{o.order_number}</strong><div style={{ fontSize: 11, color: '#837b76' }}>{new Date(o.created_at).toLocaleString('pt-BR')}</div></td><td>{o.customer_name}<div style={{ fontSize: 11, color: '#837b76' }}>{o.customer_phone}</div></td><td>{catalog.stores.find((s) => s.id === o.store_id)?.short_name || '—'}</td><td><strong>{money(o.total)}</strong></td><td><select value={o.status} onChange={(e) => updateOrderStatus(o, e.target.value)}><option value="new">Novo</option><option value="accepted">Aceito</option><option value="preparing">Preparando</option><option value="ready">Pronto</option><option value="out_for_delivery">Saiu para entrega</option><option value="completed">Concluído</option><option value="cancelled">Cancelado</option></select></td></tr>)}</tbody></table></div></div>}
          </> : null}
        </section>
      </div>

      {productEditor ? <Modal title={productEditor.id ? 'Editar produto' : 'Novo produto'} onClose={() => setProductEditor(null)}>
        <form className="adminForm" onSubmit={saveProduct}>
          <div className="adminGrid2"><div className="field"><label>Nome *</label><input required value={productEditor.name} onChange={(e) => setProductEditor((p) => ({ ...p, name: e.target.value }))} /></div><div className="field"><label>Categoria *</label><select required value={productEditor.category_id} onChange={(e) => setProductEditor((p) => ({ ...p, category_id: e.target.value }))}>{catalog.categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
          <div className="field"><label>Descrição</label><textarea value={productEditor.description || ''} onChange={(e) => setProductEditor((p) => ({ ...p, description: e.target.value }))} /></div>
          <div className="adminGrid3"><div className="field"><label>Preço base</label><input type="number" min="0" step="0.01" value={productEditor.base_price} onChange={(e) => setProductEditor((p) => ({ ...p, base_price: e.target.value }))} /></div><div className="field"><label>Emoji/fallback</label><input value={productEditor.emoji || ''} onChange={(e) => setProductEditor((p) => ({ ...p, emoji: e.target.value }))} /></div><div className="field"><label>Ordem</label><input type="number" value={productEditor.sort_order || 0} onChange={(e) => setProductEditor((p) => ({ ...p, sort_order: e.target.value }))} /></div></div>
          <div className="adminGrid2"><div className="field"><label>Selo</label><input placeholder="Ex.: Mais vendido" value={productEditor.badge || ''} onChange={(e) => setProductEditor((p) => ({ ...p, badge: e.target.value }))} /></div><div className="field"><label>Status</label><select value={productEditor.is_active === false ? 'off' : 'on'} onChange={(e) => setProductEditor((p) => ({ ...p, is_active: e.target.value === 'on' }))}><option value="on">Ativo</option><option value="off">Pausado</option></select></div></div>
          <div className="field"><label>Foto do produto</label><input type="file" accept="image/*" onChange={(e) => uploadProductImage(e.target.files?.[0])} />{uploading ? <small>Enviando imagem...</small> : null}{productEditor.image_url ? <small>Imagem pronta para salvar.</small> : null}</div>
          <div className="field"><label>Opções e sabores (JSON avançado)</label><textarea style={{ minHeight: 140, fontFamily: 'monospace', fontSize: 12 }} value={JSON.stringify(safeOptions(productEditor.options), null, 2)} onChange={(e) => setProductEditor((p) => ({ ...p, options: e.target.value }))} /></div>
          <button className="btn btnBrand" disabled={saving} type="submit"><Save size={17} /> {saving ? 'Salvando...' : 'Salvar produto'}</button>
        </form>
      </Modal> : null}

      {categoryEditor ? <Modal title={categoryEditor.id ? 'Editar categoria' : 'Nova categoria'} onClose={() => setCategoryEditor(null)}><form className="adminForm" onSubmit={saveCategory}><div className="field"><label>Nome *</label><input required value={categoryEditor.name} onChange={(e) => setCategoryEditor((v) => ({ ...v, name: e.target.value }))} /></div><div className="adminGrid2"><div className="field"><label>Ícone</label><input value={categoryEditor.icon || ''} onChange={(e) => setCategoryEditor((v) => ({ ...v, icon: e.target.value }))} /></div><div className="field"><label>Ordem</label><input type="number" value={categoryEditor.sort_order || 0} onChange={(e) => setCategoryEditor((v) => ({ ...v, sort_order: e.target.value }))} /></div></div><button className="btn btnBrand" disabled={saving} type="submit"><Save size={17} /> Salvar categoria</button></form></Modal> : null}

      {storeEditor ? <Modal title={`Editar ${storeEditor.short_name || storeEditor.name}`} onClose={() => setStoreEditor(null)}><form className="adminForm" onSubmit={saveStore}><div className="field"><label>Nome curto</label><input value={storeEditor.short_name || ''} onChange={(e) => setStoreEditor((v) => ({ ...v, short_name: e.target.value }))} /></div><div className="field"><label>Endereço</label><input value={storeEditor.address || ''} onChange={(e) => setStoreEditor((v) => ({ ...v, address: e.target.value }))} /></div><div className="adminGrid2"><div className="field"><label>WhatsApp com DDD</label><input inputMode="tel" value={storeEditor.whatsapp || ''} onChange={(e) => setStoreEditor((v) => ({ ...v, whatsapp: e.target.value }))} /></div><div className="field"><label>Taxa de entrega</label><input type="number" min="0" step="0.01" value={storeEditor.delivery_fee || 0} onChange={(e) => setStoreEditor((v) => ({ ...v, delivery_fee: e.target.value }))} /></div></div><div className="field"><label>Link da localização</label><input value={storeEditor.location_url || ''} onChange={(e) => setStoreEditor((v) => ({ ...v, location_url: e.target.value }))} /></div><div className="adminGrid3"><label><input type="checkbox" checked={storeEditor.is_active !== false} onChange={(e) => setStoreEditor((v) => ({ ...v, is_active: e.target.checked }))} /> Loja ativa</label><label><input type="checkbox" checked={storeEditor.pickup_enabled !== false} onChange={(e) => setStoreEditor((v) => ({ ...v, pickup_enabled: e.target.checked }))} /> Retirada</label><label><input type="checkbox" checked={storeEditor.delivery_enabled !== false} onChange={(e) => setStoreEditor((v) => ({ ...v, delivery_enabled: e.target.checked }))} /> Entrega</label></div><button className="btn btnBrand" disabled={saving} type="submit"><Save size={17} /> Salvar unidade</button></form></Modal> : null}

      {!cloud ? <button className="cartFloat" style={{ right: 18, left: 'auto' }} onClick={() => { if (window.confirm('Restaurar o catálogo de demonstração deste navegador?')) { clearLocalPreview(); window.location.reload(); } }}><RefreshCw size={18} /> Restaurar prévia</button> : null}
    </main>
  );
}
