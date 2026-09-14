'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Save, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowser, hasSupabaseConfig } from '@/lib/supabase-browser';

function safeOptions(raw) {
  if (Array.isArray(raw)) return raw;
  if (!raw) return [];
  try { return typeof raw === 'string' ? JSON.parse(raw) : []; } catch { return []; }
}

export default function ProductOptionsAdmin() {
  const router = useRouter();
  const cloud = hasSupabaseConfig();
  const supabase = cloud ? getSupabaseBrowser() : null;
  const [products, setProducts] = useState([]);
  const [productId, setProductId] = useState('');
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    async function init() {
      if (!cloud) {
        if (alive) {
          setMessage('Conecte o Supabase do cardápio para editar sabores e opções por esta tela.');
          setLoading(false);
        }
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user?.id;
      if (!userId) return router.replace('/admin');
      const { data: admin } = await supabase.from('menu_admins').select('user_id').eq('user_id', userId).maybeSingle();
      if (!admin) {
        await supabase.auth.signOut();
        return router.replace('/admin');
      }
      const { data, error } = await supabase.from('menu_products').select('id,name,options,is_active,sort_order').order('sort_order');
      if (!alive) return;
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      const list = data || [];
      setProducts(list);
      if (list[0]) {
        setProductId(list[0].id);
        setGroups(safeOptions(list[0].options));
      }
      setLoading(false);
    }
    init();
    return () => { alive = false; };
  }, [cloud, router, supabase]);

  function selectProduct(id) {
    setProductId(id);
    const product = products.find((item) => item.id === id);
    setGroups(safeOptions(product?.options));
    setMessage('');
  }

  function addGroup() {
    setGroups((current) => [...current, { name: 'Nova opção', required: true, type: 'single', values: [] }]);
  }

  function updateGroup(index, patch) {
    setGroups((current) => current.map((group, i) => i === index ? { ...group, ...patch } : group));
  }

  function removeGroup(index) {
    setGroups((current) => current.filter((_, i) => i !== index));
  }

  function addValue(groupIndex) {
    setGroups((current) => current.map((group, i) => i === groupIndex
      ? { ...group, values: [...(group.values || []), { label: 'Nova opção', price_delta: 0 }] }
      : group));
  }

  function updateValue(groupIndex, valueIndex, patch) {
    setGroups((current) => current.map((group, i) => i === groupIndex
      ? { ...group, values: (group.values || []).map((value, j) => j === valueIndex ? { ...value, ...patch } : value) }
      : group));
  }

  function removeValue(groupIndex, valueIndex) {
    setGroups((current) => current.map((group, i) => i === groupIndex
      ? { ...group, values: (group.values || []).filter((_, j) => j !== valueIndex) }
      : group));
  }

  async function save() {
    if (!cloud || !productId) return;
    const normalized = groups
      .map((group) => ({
        name: String(group.name || '').trim(),
        required: Boolean(group.required),
        type: 'single',
        values: (group.values || []).map((value) => ({
          label: String(value.label || '').trim(),
          price_delta: Math.max(0, Number(value.price_delta || 0))
        })).filter((value) => value.label)
      }))
      .filter((group) => group.name && group.values.length);

    setSaving(true);
    setMessage('');
    const { error } = await supabase.from('menu_products').update({ options: normalized }).eq('id', productId);
    if (error) {
      setMessage(error.message);
    } else {
      setGroups(normalized);
      setProducts((current) => current.map((product) => product.id === productId ? { ...product, options: normalized } : product));
      setMessage('Sabores e opções salvos com sucesso.');
    }
    setSaving(false);
  }

  return (
    <main className="adminShell">
      <header className="adminTop">
        <div className="container">
          <div className="adminBrand"><strong>🧀 Sabores e opções</strong><span>Editor visual, sem precisar escrever JSON</span></div>
          <button className="btn btnGhost" onClick={() => router.push('/admin')}><ArrowLeft size={16} /> Voltar</button>
        </div>
      </header>

      <div className="container" style={{ padding: '24px 0 90px' }}>
        <div className="adminTitle">
          <div><h1>Personalização dos produtos</h1><p>Crie grupos como Recheio, Tamanho, Sabor e Adicionais.</p></div>
          <button className="btn btnBrand" onClick={save} disabled={!cloud || !productId || saving}><Save size={17} /> {saving ? 'Salvando...' : 'Salvar opções'}</button>
        </div>

        {message ? <div className="notice" style={{ marginBottom: 14 }}>{message}</div> : null}
        {loading ? <div className="empty">Carregando produtos...</div> : null}

        {!loading && cloud ? <div className="adminGrid2" style={{ alignItems: 'start' }}>
          <aside className="panel" style={{ padding: 10 }}>
            <div className="panelHead"><h2>Produtos</h2></div>
            <div style={{ display: 'grid', gap: 5, paddingTop: 8 }}>
              {products.map((product) => (
                <button key={product.id} className={`miniBtn ${productId === product.id ? 'status' : ''}`} style={{ textAlign: 'left', minHeight: 42 }} onClick={() => selectProduct(product.id)}>
                  {product.name}
                </button>
              ))}
            </div>
          </aside>

          <section style={{ display: 'grid', gap: 12 }}>
            {groups.map((group, groupIndex) => (
              <div className="panel" key={`${groupIndex}-${group.name}`}>
                <div className="panelHead">
                  <div className="field" style={{ flex: 1 }}><label>Nome do grupo</label><input value={group.name || ''} onChange={(event) => updateGroup(groupIndex, { name: event.target.value })} /></div>
                  <label style={{ fontSize: 12, fontWeight: 750, whiteSpace: 'nowrap' }}><input type="checkbox" checked={group.required !== false} onChange={(event) => updateGroup(groupIndex, { required: event.target.checked })} /> Obrigatório</label>
                  <button className="miniBtn" onClick={() => removeGroup(groupIndex)} aria-label="Remover grupo"><Trash2 size={15} /></button>
                </div>
                <div style={{ padding: 14, display: 'grid', gap: 9 }}>
                  {(group.values || []).map((value, valueIndex) => (
                    <div className="adminGrid3" key={`${valueIndex}-${value.label}`} style={{ alignItems: 'end' }}>
                      <div className="field"><label>Nome da opção</label><input value={value.label || ''} onChange={(event) => updateValue(groupIndex, valueIndex, { label: event.target.value })} /></div>
                      <div className="field"><label>Acréscimo no preço</label><input type="number" min="0" step="0.01" value={value.price_delta ?? 0} onChange={(event) => updateValue(groupIndex, valueIndex, { price_delta: event.target.value })} /></div>
                      <button className="btn btnDanger" onClick={() => removeValue(groupIndex, valueIndex)}><Trash2 size={15} /> Remover</button>
                    </div>
                  ))}
                  <button className="btn btnGhost" onClick={() => addValue(groupIndex)}><Plus size={16} /> Adicionar opção</button>
                </div>
              </div>
            ))}

            <button className="btn btnGhost" style={{ minHeight: 52 }} onClick={addGroup}><Plus size={17} /> Adicionar grupo de opções</button>
            {!groups.length ? <div className="empty">Este produto ainda não possui sabores ou opções. Clique em “Adicionar grupo de opções”.</div> : null}
          </section>
        </div> : null}
      </div>
    </main>
  );
}
