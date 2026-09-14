'use client';

import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Circle, Clock3, MapPin, RefreshCw } from 'lucide-react';
import { money } from '@/lib/catalog';

const labels = {
  new: 'Pedido recebido',
  accepted: 'Pedido aceito',
  preparing: 'Em preparação',
  ready: 'Pronto',
  out_for_delivery: 'Saiu para entrega',
  completed: 'Concluído',
  cancelled: 'Cancelado'
};

export default function OrderTracker({ token }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function refresh() {
    try {
      const response = await fetch(`/api/orders/${token}`, { cache: 'no-store' });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || 'Não foi possível consultar o pedido.');
      setData(body);
      setError('');
    } catch (err) {
      setError(err.message || 'Não foi possível consultar o pedido.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const steps = useMemo(() => {
    if (!data) return [];
    return data.fulfillment === 'delivery'
      ? ['new', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'completed']
      : ['new', 'accepted', 'preparing', 'ready', 'completed'];
  }, [data]);

  const currentIndex = data ? steps.indexOf(data.status) : -1;

  return (
    <main className="trackingPage">
      <section className="trackingCard">
        <div className="brandMark" style={{ marginBottom: 16 }}>🧀</div>
        <span className="eyebrow" style={{ color: '#9a5b00' }}><Clock3 size={14} /> acompanhamento</span>
        <h1>{loading ? 'Consultando pedido...' : data?.order_number || 'Seu pedido'}</h1>

        {error ? <div className="notice">{error}</div> : null}

        {data ? <>
          <div className="trackingMeta">
            <div><span>Unidade</span><strong>{data.store?.name || 'Casa do Pão de Queijo'}</strong></div>
            <div><span>Total</span><strong>{money(data.total)}</strong></div>
          </div>

          {data.store?.address ? <div className="trackingAddress"><MapPin size={16} /> {data.store.address}</div> : null}

          {data.status === 'cancelled' ? (
            <div className="notice" style={{ background: '#fff0ee', color: '#8b2b24' }}>Este pedido foi cancelado. Entre em contato com a unidade para mais informações.</div>
          ) : (
            <div className="trackingSteps">
              {steps.map((step, index) => {
                const done = index <= currentIndex;
                const current = index === currentIndex;
                return (
                  <div key={step} className={`trackingStep ${done ? 'done' : ''} ${current ? 'current' : ''}`}>
                    <div className="trackingIcon">{done ? <CheckCircle2 size={23} /> : <Circle size={23} />}</div>
                    <div><strong>{labels[step]}</strong>{current ? <span>Status atual</span> : null}</div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="trackingFoot">
            <span>Atualizado em {new Date(data.updated_at).toLocaleString('pt-BR')}</span>
            <button className="btn btnGhost" onClick={() => { setLoading(true); refresh(); }}><RefreshCw size={15} /> Atualizar</button>
          </div>
        </> : null}
      </section>
    </main>
  );
}
