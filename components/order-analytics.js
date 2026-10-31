'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { fetchPeriodOrders, localDay, matchesOrder, ordersCsv, STATUS_LABELS, summarizeOrders, TIME_ZONE } from '@/lib/order-report.mjs';
import { money } from '@/lib/catalog';
import './order-analytics.css';

export default function OrderAnalytics({ supabase, stores, view = 'dashboard' }) {
  const today = localDay(new Date());
  const [draft, setDraft] = useState({ start: `${today.slice(0,7)}-01`, end: today, storeId: '' });
  const [period, setPeriod] = useState(draft);
  const [group,setGroup] = useState('day');
  const [rows,setRows] = useState([]);
  const [search,setSearch] = useState('');
  const [status,setStatus] = useState('');
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState('');
  const [revision,setRevision] = useState(0);
  const [loadedAt,setLoadedAt] = useState('');
  const [detail,setDetail] = useState(null);
  const requestId = useRef(0);
  useEffect(()=>{
    const id=++requestId.current;
    setLoading(true);setError('');setRows([]);setDetail(null);
    if (!supabase) { setLoading(false); return; }
    fetchPeriodOrders(supabase,period).then(data=>{
      if(id!==requestId.current)return;
      setRows(data);setLoadedAt(new Date().toISOString());
    }).catch(err=>{if(id===requestId.current)setError(err.message || 'Não foi possível consultar os pedidos.');})
      .finally(()=>{if(id===requestId.current)setLoading(false);});
    return ()=>{requestId.current++;};
  },[supabase,period,revision]);
  const summary=useMemo(()=>summarizeOrders(rows,{group}),[rows,group]);
  const visible=useMemo(()=>rows.filter(o=>(!status || o.status===status)&&matchesOrder(o,search)),[rows,status,search]);
  const [page,setPage]=useState(1);
  useEffect(()=>setPage(1),[search,status,rows]);
  const max=Math.max(1,...summary.series.map(([,v])=>v));
  const cards=[['Pedidos registrados',summary.count],...Object.entries(STATUS_LABELS).map(([s,label])=>[label,summary.statuses[s]]),['Vendas concluídas',money(summary.completedCents/100)],['Ticket médio concluído',money(summary.averageCents/100)],['Entregas em vendas concluídas',money(summary.deliveryCents/100)]];
  function download(){
    const url=URL.createObjectURL(new Blob([ordersCsv(visible,stores)],{type:'text/csv;charset=utf-8;'}));
    const link=document.createElement('a');link.href=url;link.download=`pedidos-${period.start}-${period.end}.csv`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return <section className="cpqAnalytics" aria-label="Indicadores dos pedidos">
    <div className="adminTitle"><div><h1>{view==='reports'?'Relatórios':'Dashboard'}</h1><p>Pedidos registrados nas duas unidades.</p></div></div>
    <form className="cpqFilters" onSubmit={e=>{e.preventDefault();setPeriod({...draft});}}>
      <label>De<input type="date" required value={draft.start} onChange={e=>setDraft(d=>({...d,start:e.target.value}))}/></label>
      <label>Até<input type="date" required value={draft.end} onChange={e=>setDraft(d=>({...d,end:e.target.value}))}/></label>
      <label>Unidade<select value={draft.storeId} onChange={e=>setDraft(d=>({...d,storeId:e.target.value}))}><option value="">Todas as unidades autorizadas</option>{stores.map(s=><option key={s.id} value={s.id}>{s.short_name || s.name}</option>)}</select></label>
      <button className="btn btnBrand" disabled={loading || !supabase}>Aplicar filtros</button>
      <button className="btn btnGhost" type="button" disabled={loading || !supabase} onClick={()=>setRevision(r=>r+1)}>Atualizar</button>
    </form>
    <p className="cpqCaption">Período aplicado: {period.start.split('-').reverse().join('/')} a {period.end.split('-').reverse().join('/')} · Horário de Rondônia.</p>
    {!supabase?<div className="notice">Banco de pedidos não conectado. Não há indicadores disponíveis.</div>:loading?<div className="notice" role="status">Consultando todos os pedidos do período…</div>:error?<div className="notice" role="alert">{error} Os indicadores não foram calculados. Tente atualizar.</div>:<>
      <div className="cpqMetricGrid">{cards.map(([label,value])=><article key={label} className="cpqMetric"><span>{label}</span><strong>{value}</strong></article>)}</div>
      <p className="cpqCaption">Valores brutos de pedidos com status “Concluído”, agrupados pela data de criação. Não comprovam recebimento do pagamento nem representam lucro. Pedidos novos e cancelados não entram nas vendas concluídas.</p>
      {!rows.length?<div className="empty">Nenhum pedido registrado neste período e unidade.</div>:null}
      <div className="cpqReportGrid">
        <section className="panel"><div className="panelHead"><h2>Vendas concluídas</h2><select aria-label="Agrupamento do gráfico" value={group} onChange={e=>setGroup(e.target.value)}><option value="day">Por dia</option><option value="week">Por semana</option><option value="month">Por mês</option></select></div>
          <div className="cpqBars">{summary.series.length?summary.series.map(([date,value])=><div key={date} className="cpqBarRow"><span>{date}</span><div className="cpqBarTrack"><div style={{width:`${value/max*100}%`}}/></div><strong>{money(value/100)}</strong></div>):<p>Sem vendas concluídas neste período.</p>}</div>
        </section>
        <section className="panel"><div className="panelHead"><h2>Vendas por unidade</h2></div><div className="tableWrap"><table className="dataTable"><thead><tr><th>Unidade</th><th>Pedidos</th><th>Concluídas</th></tr></thead><tbody>{summary.stores.map(s=><tr key={s.id}><td>{stores.find(x=>x.id===s.id)?.short_name || 'Unidade'}</td><td>{s.count}</td><td>{money(s.completedCents/100)}</td></tr>)}</tbody></table></div></section>
        <section className="panel"><div className="panelHead"><h2>Produtos mais vendidos</h2></div><div className="tableWrap"><table className="dataTable"><thead><tr><th>Produto</th><th>Quantidade</th><th>Valor</th></tr></thead><tbody>{summary.products.slice(0,20).map((p,i)=><tr key={i}><td>{p.name}</td><td>{p.quantity}</td><td>{money(p.totalCents/100)}</td></tr>)}</tbody></table></div></section>
        <section className="panel"><div className="panelHead"><h2>Forma de pagamento informada</h2></div><div className="tableWrap"><table className="dataTable"><thead><tr><th>Forma</th><th>Vendas concluídas</th></tr></thead><tbody>{summary.payments.map(([name,value])=><tr key={name}><td>{name}</td><td>{money(value/100)}</td></tr>)}</tbody></table></div></section>
      </div>
      <section className="panel"><div className="panelHead"><h2>Histórico de pedidos</h2><button className="btn btnGhost" type="button" onClick={download} disabled={!visible.length}>Exportar CSV</button></div>
        <div className="cpqFilters"><label>Pesquisar<input type="search" placeholder="Nome, telefone ou pedido" value={search} onChange={e=>setSearch(e.target.value)}/></label><label>Situação<select value={status} onChange={e=>setStatus(e.target.value)}><option value="">Todas</option>{Object.entries(STATUS_LABELS).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label></div>
        <div className="tableWrap"><table className="dataTable"><thead><tr><th>Pedido</th><th>Cliente</th><th>Situação</th><th>Total</th><th>Detalhes</th></tr></thead><tbody>{visible.slice((page-1)*25,page*25).map(o=><tr key={o.id}><td>{o.order_number}<br/><small>{new Date(o.created_at).toLocaleString('pt-BR',{timeZone:TIME_ZONE})}</small></td><td>{o.customer_name}</td><td>{STATUS_LABELS[o.status] || o.status}</td><td>{money(o.total)}</td><td><button type="button" className="miniBtn" onClick={()=>setDetail(o)}>Ver pedido</button></td></tr>)}</tbody></table></div>
        <div className="cpqPagination"><button type="button" className="miniBtn" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</button><span>{visible.length} pedidos · página {page} de {Math.max(1,Math.ceil(visible.length/25))}</span><button type="button" className="miniBtn" disabled={page*25>=visible.length} onClick={()=>setPage(p=>p+1)}>Próxima</button></div>
      </section>
      {detail?<section className="panel cpqDetails" aria-label="Detalhes do pedido"><div className="panelHead"><h2>{detail.order_number}</h2><button type="button" className="miniBtn" onClick={()=>setDetail(null)}>Fechar detalhes</button></div><p><strong>{detail.customer_name}</strong> · {detail.customer_phone}</p><p>{stores.find(s=>s.id===detail.store_id)?.short_name} · {detail.fulfillment==='delivery'?'Entrega':'Retirada'} · {detail.payment_method}</p>{detail.fulfillment==='delivery'?<p>{[detail.address?.street,detail.address?.number,detail.address?.neighborhood,detail.address?.complement,detail.address?.reference].filter(Boolean).join(' · ')}</p>:null}<ul>{(detail.menu_order_items || []).map(i=><li key={i.id}>{i.quantity}× {i.product_name} — {money(i.line_total)}{Array.isArray(i.options)&&i.options.length?` (${i.options.map(o=>o.label).join(', ')})`:''}</li>)}</ul><p>Entrega: {money(detail.delivery_fee)} · <strong>Total: {money(detail.total)}</strong></p>{detail.notes?<p>Observações: {detail.notes}</p>:null}</section>:null}
      <p className="cpqCaption">Atualizado às {loadedAt?new Date(loadedAt).toLocaleTimeString('pt-BR',{timeZone:TIME_ZONE}):'—'}. Use Atualizar para consultar novas alterações.</p>
    </>}
  </section>;
}
