# Implementação parcial — dashboard e relatórios

31/10/2026. Branch feat/administrativo-cpq-20261031. Não publicar em produção antes de concluir os testes integrados.

## Alterações
- components/admin-dashboard.js: integração do dashboard e relatórios, pesquisa por nome/telefone/número nos 100 pedidos recentes e bloqueio da página principal administrativa quando o backend não está configurado. Limpeza dos pedidos em memória ao perder a sessão.
- components/order-analytics.js: filtros por período/unidade, indicadores de status, vendas concluídas, ticket, taxas, gráficos diários/semanais/mensais, ranking de produtos, distribuição por unidade/pagamento, histórico paginado, detalhes e CSV.
- components/order-analytics.css: estilos isolados e adaptações para telas estreitas.
- lib/order-report.mjs: cálculos em centavos, datas de Rondônia, consulta paginada com limite explícito de segurança, pesquisa e CSV protegido contra fórmulas. CSV não exporta nome, telefone ou endereço.
- tests/order-report.test.mjs: seis testes automatizados de regras de relatório.

## Semântica dos valores
O banco atual não tem confirmação separada de pagamento nem data de conclusão. Por isso a interface usa o rótulo "Vendas concluídas", soma apenas status completed e agrupa por data de criação. Não apresenta esses valores como receita recebida ou lucro. Isso NÃO conclui o requisito de receita financeira confirmada.
A seleção de unidade é um filtro, NÃO implementa novas permissões: as políticas atuais continuam sendo a fonte de autorização. O isolamento de funcionários por loja permanece pendente.
As consultas incluem todas as páginas do período selecionado (máximo 366 dias). Acima de 25 mil pedidos, exibem erro solicitando período menor, nunca um total parcial. Os indicadores não aparecem enquanto carrega ou em caso de erro. São uma fotografia operacional, não um livro financeiro transacional.

## Verificação
- npm ci --ignore-scripts --no-audit --no-fund: concluído.
- npm run build: concluído, incluindo preparo de imagens e validação dos 30 assets requeridos.
- node --test tests/order-report.test.mjs: seis testes aprovados.
- Testes cobrem exclusão de novos/cancelados/aceitos das vendas concluídas, data local, limites de período, agrupamento semanal, conjunto vazio, pesquisa, CSV e paginação com 501 pedidos.
- Checkout, API pública, números das lojas, catálogo, preços e assets versionados não foram alterados.
- Nenhuma migração aplicada, novo serviço contratado ou outro projeto modificado.

## Pendências que impedem conclusão da Fase 1
A Vercel retornou novamente nenhuma variável de ambiente. Não foi identificado um banco dedicado ao cardápio. O acesso ao deploy havia falhado com 403 na auditoria. A conexão de um backend isolado e a autorização de acesso ao preview continuam necessárias para validar pedidos reais, login e políticas.
Faltam: registro transacional/idempotente dos pedidos, eventos de checkout/WhatsApp, confirmação financeira, papéis e RLS por unidade, histórico de alterações/cancelamento com motivo, atualização automática e áudio; testes integrados e em Safari iPhone/Chrome Android. Não confundir build aprovado com validação completa.
As fases 2 e 3 completas (entregadores, clientes, cupons/fidelidade e relatórios financeiros avançados) permanecem pendentes. Cupons e fidelidade não foram ativados.

## Custos
Sem novos recursos contratados. Build/preview usam o projeto Vercel existente; consumo sujeito à franquia/plano, não auditados integralmente. Não foi criado banco pago nem alterado RO Imóveis.
