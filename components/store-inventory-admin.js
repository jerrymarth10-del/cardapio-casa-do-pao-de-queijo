'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Check, Save, Store, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { money } from '@/lib/catalog';
import { getSupabaseBrowser, hasSupabaseConfig } from '@/lib/supabase-browser';

export default function StoreInventoryAdmin() {
  const router = useRouter();
  const cloud = hasSupabaseConfig();
  const supabase = cloud ? getSupabaseBrowser() : null;
  const [stores, setStores] = useState([]);
  const [products, setProducts] = useState([]);
  const [rows, setRows] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;

    async function init() {
      if (!cloud) {
        if (alive) {
          setMessage('Conecte o Supabase do cardápio para controlar disponibilidade e preço por loja.');
          setLoading(false);
        }
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) {
        router.replace('/admin');
        return;
      }

      const { data: admin } = await supabase.from('menu_admins').select('user_id').eq('user_id', userId).maybeSingle();
      if (!admin) {
        await supabase.auth.signOut();
        router.replace('/admin');
        return;
      }

      const [storeResult, productResult, availabilityResult] = await Promise.all([
        supabase.from('menu_stores').select('*').order('sort_order'),
        supabase.from('menu_products').select('id,name,base_price,is_active,sort_order').order('sort_order'),
        supabase.from('menu_store_products').select('*')
      ]);

      const error = [storeResult, productResult, availabilityResult].find((result) => result.error)?.error;
      if (error) {
        if (alive) {
          setMessage(error.message || 'Não foi possível carregar o estoque.');
          setLoading(false);
        }
        return;
      }

      const nextRows = {};
      for (const product of productResult.data || []) {
        for (const store of storeResult.data || []) {
          const existing = (availabilityResult.data || []).find((item) => item.product_id === product.id && item.store_id === store.id);
          nextRows[`${product.id}:${store.id}`] = {
            product_id: product.id,
            store_id: store.id,
            available: existing ? existing.available !== false : true,
            price_override: existing?.price_override ?? ''
          };
        }
      }

      if (alive) {
        setStores(storeResult.data || []);
        setProducts(productResult.data || []);
        setRows(nextRows);
        setLoading(false);
      }
    }

    init();
    return () => { alive = false; };
  }, [cloud, router, supabase]);

  const activeCount = useMemo(() => Object.values(rows).filter((row) => row.available).length, [rows]);

  function updateRow(productId, storeId, patch) {
    const key = `${productId}:${storeId}`;
    setRows((current) => ({ ...current, [key]: { ...current[key], ...patch } }));
    setMessage('');
  }

  async function saveAll() {
    if (!cloud || !supabase) return;
    setSaving(true);
    setMessage('');
    try {
      const payload = Object.values(rows).map((row) => ({
        store_id: row.store_id,
        product_id: row.product_id,
        available: Boolean(row.available),
        price_override: row.price_override === '' || row.price_override == null ? null : Number(row.price_override)
      }));
      const invalid = payload.find((row) => row.price_override != null && (!Number.isFinite(row.price_override) || row.price_override < 0));
      if (invalid) throw new Error('Existe um preço inválido. Use apenas valores iguais ou maiores que zero.');
      const { error } = await supabase.from('menu_store_products').upsert(payload, { onConflict: 'store_id,product_id' });
      if (error) throw error;
      setMessage('Disponibilidade e preços por loja salvos com sucesso.');
    } catch (error) {
      setMessage(error.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="adminShell">
      <header className="adminTop">
        <div className="container">
          <div className="adminBrand"><strong>🧀 Estoque por unidade</strong><span>Controle o que aparece em cada loja</span></div>
          <button className="btn btnGhost" onClick={() => router.push('/admin')}><ArrowLeft size={16} /> Voltar</button>
        </div>
      </header>

      <div className="container" style={{ padding: '24px 0 90px' }}>
        <div className="adminTitle">
          <div>
            <h1>Disponibilidade e preço</h1>
            <p>Você pode pausar um produto somente em uma unidade ou definir um preço diferente nela.</p>
          </div>
          <button className="btn btnBrand" onClick={saveAll} disabled={loading || saving || !cloud}><Save size={17} /> {saving ? 'Salvando...' : 'Salvar alterações'}</button>
        </div>

        {message ? <div className="notice" style={{ marginBottom: 14 }}>{message}</div> : null}

        {loading ? <div className="empty">Carregando produtos e unidades...</div> : null}
        {!loading && cloud ? <>
          <div className="stats">
            <div className="stat"><span>Produtos cadastrados</span><strong>{products.length}</strong></div>
            <div className="stat"><span>Unidades</span><strong>{stores.length}</strong></div>
            <div className="stat"><span>Combinações disponíveis</span><strong>{activeCount}</strong></div>
            <div className="stat"><span>Preço personalizado</span><strong>{Object.values(rows).filter((row) => row.price_override !== '' && row.price_override != null).length}</strong></div>
          </div>

          <div className="panel">
            <div className="tableWrap">
              <table className="dataTable">
                <thead>
                  <tr>
                    <th>Produto</th>
                    <th>Preço padrão</th>
                    {stores.map((store) => <th key={store.id}>{store.short_name || store.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td><strong>{product.name}</strong>{product.is_active === false ? <div style={{ fontSize: 11, color: '#8a817b' }}>Produto pausado globalmente</div> : null}</td>
                      <td>{money(product.base_price)}</td>
                      {stores.map((store) => {
                        const row = rows[`${product.id}:${store.id}`];
                        return <td key={store.id} style={{ minWidth: 180 }}>
                          <button
                            type="button"
                            className={`miniBtn ${row?.available ? '' : 'status off'}`}
                            onClick={() => updateRow(product.id, store.id, { available: !row?.available })}
                            style={{ marginBottom: 7, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                          >
                            {row?.available ? <Check size={14} /> : <X size={14} />}
                            {row?.available ? 'Disponível' : 'Indisponível'}
                          </button>
                          <div className="field">
                            <label>Preço nesta loja</label>
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={money(product.base_price)}
                              value={row?.price_override ?? ''}
                              onChange={(event) => updateRow(product.id, store.id, { price_override: event.target.value })}
                            />
                          </div>
                        </td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="notice" style={{ marginTop: 14 }}>
            <Store size={15} style={{ verticalAlign: '-3px', marginRight: 6 }} />
            Se o campo de preço ficar vazio, a unidade usa automaticamente o preço padrão do produto.
          </div>
        </> : null}
      </div>
    </main>
  );
}
