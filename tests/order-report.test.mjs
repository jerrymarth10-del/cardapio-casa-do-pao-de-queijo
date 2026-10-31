import test from 'node:test';
import assert from 'node:assert/strict';
import { localDay,periodBounds,summarizeOrders,ordersCsv,matchesOrder,fetchPeriodOrders } from '../lib/order-report.mjs';
const order = (id,status='completed',extra={}) => ({id,store_id:'alta',order_number:id,created_at:'2026-10-31T12:00:00Z',status,total:'15.30',delivery_fee:'5.00',menu_order_items:[{product_id:'p',product_name:'Pão',quantity:2,line_total:'10.30'}],...extra});
test('dia local e limite exclusivo preservam madrugada de Rondônia',()=>{
 assert.equal(localDay('2026-11-01T03:59:59Z'),'2026-10-31');
 assert.deepEqual(periodBounds('2026-10-31','2026-10-31'),{from:'2026-10-31T04:00:00.000Z',until:'2026-11-01T04:00:00.000Z'});
 assert.throws(()=>periodBounds('2026-02-30','2026-03-01'));
 assert.throws(()=>periodBounds('2026-11-01','2026-10-31'));
 assert.throws(()=>periodBounds('2024-01-01','2026-10-31'));
});
test('abandonados, confirmados e cancelados não contam como vendas concluídas',()=>{
 const s=summarizeOrders([order('a'),order('b','new'),order('c','accepted'),order('d','cancelled'),order('e','completed',{store_id:'sul'})],{storeId:'alta'});
 assert.equal(s.count,4);assert.equal(s.completedCents,1530);assert.equal(s.deliveryCents,500);assert.equal(s.averageCents,1530);assert.equal(s.products[0].quantity,2);
 assert.equal(s.statuses.new,1);assert.equal(s.statuses.accepted,1);assert.equal(s.statuses.cancelled,1);
});
test('filtros de data, agrupamento e conjunto vazio',()=>{
 const s=summarizeOrders([order('a'),order('b','completed',{created_at:'2026-11-01T12:00:00Z'})],{start:'2026-10-01',end:'2026-10-31',group:'week'});
 assert.deepEqual(s.series,[['2026-10-26',1530]]);
 assert.equal(summarizeOrders([]).averageCents,0);
});
test('CSV protege fórmulas e omite dados pessoais',()=>{
 const csv=ordersCsv([order('=HYPERLINK("x")','completed',{customer_name:'SEGREDO',customer_phone:'12345'})],[]);
 assert.ok(csv.includes("'=HYPERLINK"));assert.ok(!csv.includes('SEGREDO'));assert.ok(!csv.includes('12345'));assert.ok(csv.includes('15,30'));
});
test('pesquisa nome, número e telefone formatado',()=>{
 const o=order('CPQ-100','new',{customer_name:'João',customer_phone:'69993652228'});
 assert.ok(matchesOrder(o,'JOÃO'));assert.ok(matchesOrder(o,'cpq-100'));assert.ok(matchesOrder(o,'(69) 99365-2228'));assert.ok(!matchesOrder(o,'Maria'));
});
test('paginação inclui mais de 100 pedidos e propaga falha',async()=>{
 const all=Array.from({length:501},(_,i)=>order(String(i)));
 const mock={from(){let a,b;const q={select(){return q},gte(){return q},lt(){return q},lte(){return q},order(){return q},eq(){return q},range(x,y){a=x;b=y;return q},then(resolve){return Promise.resolve({data:all.slice(a,b+1),error:null}).then(resolve)}};return q}};
 assert.equal((await fetchPeriodOrders(mock,{start:'2026-10-01',end:'2026-10-31'})).length,501);
 const bad={from(){const q={select(){return q},gte(){return q},lt(){return q},lte(){return q},order(){return q},range(){return Promise.resolve({error:new Error('offline')})}};return q}};
 await assert.rejects(fetchPeriodOrders(bad,{start:'2026-10-01',end:'2026-10-31'}),/offline/);
});
