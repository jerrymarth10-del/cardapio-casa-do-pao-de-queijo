# Auditoria e plano incremental — Casa do Pão de Queijo
Data: 31/10/2026. Estado: auditoria parcial; implementação e validação funcional pendentes.

## Alvo confirmado
- Repositório: jerrymarth10-del/cardapio-casa-do-pao-de-queijo.
- Base: main, commit 3f7bffeb6c6b8235b9018d340e973f1d337905f9.
- Branch exclusiva: feat/administrativo-cpq-20261031.
- Vercel: cardapio-casa-do-pao-de-queijo, prj_ndsdJzx0LznWyWZ8gzUZqWinGdpt.
- Deploy de produção READY: dpl_9EKcZyTq6HekLRshsVhr2m1i2Tgo, mesmo SHA e repositório.
- Nenhuma mudança de aplicação, banco ou configuração de produção foi feita nesta auditoria.

## Evidências e limites
1. Next.js 16.3.4, React 19.3.0, Supabase JS 2.116.0 e lucide-react 1.45.0. Node >=22; Vercel informa 24.x.
2. Já existem /admin, cadastro de produtos/categorias/lojas, estoque por loja, login Supabase, API de pedidos e acompanhamento privado por token. Isso é evidência de código, não comprovação de funcionamento real.
3. A consulta de variáveis na Vercel retornou envs=[] e hiddenProductionEnvCount=0. O código requer NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY e SUPABASE_SECRET_KEY. Não foram consultados nem publicados valores secretos.
4. Sem URL/chave secreta, POST /api/orders retorna número com persisted:false. O checkout continua para WhatsApp mesmo em falha HTTP, e não verifica persisted. Não há comprovação de registro durável.
5. O checkout monta a mensagem a partir do carrinho local. A API recalcula valores, mas não devolve os itens e totais canônicos; existe risco de divergência entre mensagem e registro.
6. Pedido e itens são inseridos em operações separadas. Falha dos itens deixa pedido gravado. Não há chave de idempotência nessa rota.
7. A validação descarta silenciosamente itens indisponíveis/inválidos; deve rejeitar o carrinho inteiro com mensagem acionável.
8. Existem preços e opções especiais fixados em código, além do catálogo no banco. Não remover esses ajustes sem comparar os valores atualmente exibidos.
9. A taxa da API está fixada em R$5; a configuração por loja precisa ser reconciliada e testada.
10. O painel lê apenas os 100 últimos pedidos. Essa consulta não pode fundamentar relatórios de todo o histórico.
11. A autorização atual é global via menu_admins; não há papel/escopo por unidade no schema lido. As políticas administrativas permitem operações em ambas as lojas.
12. O schema inicial contém UPSERTs que sobrescrevem produtos/preços. NÃO executá-lo indiscriminadamente em banco existente.
13. Sem configuração Supabase, o painel permite edição local de demonstração. Isso não deve se apresentar como administração operacional em produção.
14. lib/catalog-service.js contém Cidade Alta 5569993652228 e Norte-Sul 5569993539150. O checkout usa o número da loja selecionada. Conferência estática concluída; envio real não testado.
15. A conexão Supabase listou apenas o projeto RO Imóveis (rgglopnpjfryxdbfspbt), na organização de mesmo nome. Nenhuma tabela desse projeto foi acessada ou alterada. Não é evidência de um banco dedicado ao cardápio.
16. O acesso ao endpoint do deploy pela integração Vercel falhou em read_protection_bypass com HTTP 403. Não foi possível confirmar o comportamento publicado.
17. O workflow atual verifica build em main/upgrade-cardapio-v2 e PRs para main; não executa uma suíte de regressão funcional.
18. O vídeo de referência não foi revisto nesta auditoria. A interface deverá ser comparada ao vídeo antes da validação visual.

## Arquitetura proposta, sem criação de recursos
Reutilizar a aplicação Next.js e suas rotas, componentes, catálogo e imagens.
Preferir Supabase Free dedicado ao cardápio, em organização elegível, com Auth, Postgres/RLS e Storage já compatíveis com o código. Não usar RO Imóveis nem criar projeto pago automaticamente.
Separar banco de preview e produção; testes nunca devem gerar vendas ou notificações reais. Se não houver ambientes gratuitos disponíveis, desenvolver/testar banco local antes da configuração de preview.
Manter integração por wa.me; não contratar WhatsApp Business API, SMS, mapas, GPS, filas ou serviços adicionais.
Atualização inicial por consulta periódica somente com painel visível; Realtime apenas após validar permissões e consumo.

### Custos verificados e pendentes
- Supabase Free público: US$0/mês, 500 MB de banco e 1 GB de arquivos; limite de dois projetos ativos, pausa após uma semana de inatividade e sem backups automáticos. Elegibilidade da conta/org ainda não confirmada.
- Supabase Pro: projetos adicionais a partir de US$10/mês. Não autorizado pelo proprietário; não criar.
- Fonte consultada: https://supabase.com/pricing
- Manter a hospedagem Vercel existente. O retorno de equipe não expôs plano, franquia ou consumo; custo incremental ainda não pode ser garantido como zero.
- Vercel Hobby restringe uso a projetos pessoais não comerciais; não propor migração da padaria para Hobby como solução gratuita.
- Fonte consultada: https://vercel.com/docs/plans/hobby
- Nenhum serviço adicional, upgrade, recurso de banco ou armazenamento foi contratado.
- CSV gerado pela aplicação e áudio pelo navegador não requerem fornecedor pago.

## Fase 1 — segurança, pedidos e dashboard
1. Concluir auditoria das variáveis efetivas e do banco correto; exportar schema e dados antes de migrações.
2. Inspecionar administradores existentes antes de definir proprietário. Adicionar funções proprietário/gerente/atendente e associação às unidades; somente proprietário pode consolidar ou conceder acesso.
3. Bloquear administração operacional sem backend. Validar sessão e autorização no servidor e no banco; não confiar em metadados editáveis pelo usuário.
4. Gravar pedido, itens e evento inicial numa transação. Chave aleatória de idempotência por tentativa, índice único e hash do conteúdo para rejeitar reutilização com carrinho diferente. Reenvios devem devolver o mesmo pedido, sem revelar pedidos alheios.
5. Validar nome, telefone, modalidade, endereço, pagamento, limites e disponibilidade integralmente no servidor; usar centavos para cálculos e devolver os valores canônicos.
6. Integrar checkout atrás de configuração exclusiva de preview. Preservar números, aparência e navegação. Em falha de registro, oferecer tentativa novamente; eventual continuação pelo WhatsApp deve informar explicitamente que não houve registro e não alimentar receita.
7. Separar eventos de checkout iniciado, pedido registrado e tentativa de abertura do WhatsApp. Navegar para wa.me não comprova abertura do app nem envio de mensagem; não marcar como confirmado.
8. Transições controladas: new -> accepted -> preparing -> ready -> out_for_delivery -> completed. Retirada: ready -> completed. Cancelamento exige motivo; concluídos/cancelados são terminais. Registrar ator, data e estados anterior/novo com proteção contra concorrência.
9. Pagamento separado do status operacional. Receita confirmada baseada em recebimento explicitamente confirmado; pedidos novos/abandonados não entram. Cancelamentos/estornos precisam tratamento explícito. Não inferir lucro.
10. Dashboard com filtros de unidade/período, totais por status, receitas diária/semanal/mensal, ticket e gráficos. Agregar todo o período no servidor respeitando RLS, sem limite arbitrário de 100 registros. Fuso America/Porto_Velho.
11. Pedidos com detalhes de itens, cliente, entrega, pagamento, notas, histórico, busca e aviso sonoro ativado por gesto.
12. Validar RLS de todas as tabelas expostas, grants, Storage e proteção contra abuso na rota pública.
13. Migrações aditivas, backup e plano de reversão sem apagar pedidos novos. Retornar aplicação à versão anterior deve preservar dados gravados.

Arquivos previstos: app/api/orders/route.js, components/menu-app.js, components/admin-dashboard.js, novas rotas administrativas e módulos de cálculo/autorização, CSS específico do painel, migrações Supabase e testes. Confirmar conjunto final no diff.

## Fase 2 — catálogo e entregas
- Evoluir editores existentes, sem duplicar catálogo; adicionar promoções e disponibilidade por unidade.
- Reconciliar catálogo fixo e banco com inventário antes/depois; preservar preços atuais e ajustes especiais.
- Upload validado de imagem, categorias, horários e configurações por loja.
- Entregadores, atribuição, saída e conclusão; auditoria e escopo por unidade.
- Preservar R$5 quando não houver configuração específica validada.
- Revisar acesso a endereço/telefone; nenhum dado de cliente público.

## Fase 3 — relatórios, clientes, cupons e fidelidade
- Clientes associados aos pedidos, acesso mínimo e política de retenção/eliminação definida.
- Relatórios por produto, unidade, pagamento, cancelamento, entrega e comparação de períodos.
- CSV respeitando filtros/RLS, UTF-8 e proteção contra fórmulas de planilha.
- Fidelidade e cupons desativados por padrão; regras versionadas, limites e resgates transacionais. Nenhum benefício ativado sem aprovação.

## Critérios de aceite em preview
- Cidade Alta e Norte-Sul, retirada e entrega, números oficiais e totalização.
- Clique repetido, concorrência, retry após timeout, perda de rede e falha no insert de itens.
- Disponibilidade/preço alterados durante checkout e carrinho inválido: sem pedido parcial.
- Usuário anônimo, autenticado sem papel, atendente de cada unidade e proprietário: consultar, alterar e exportar apenas dados permitidos.
- Transições válidas e inválidas, cancelamento com motivo, conclusão de retirada e histórico imutável.
- Relatórios com mais de 100 registros, virada do dia local, semanas/meses, zero pedidos, cancelamentos e reenvios.
- Áudio sem autoplay indevido; reconexão sem notificações repetidas.
- Safari iPhone e Chrome Android, além de desktop. Emulação não substitui afirmação de teste em dispositivo real.
- Comparar todos os produtos, configurações e assets com a base; inspecionar diff para assegurar escopo.
- Não enviar mensagens para clientes reais nos testes. Dados sintéticos somente no ambiente de teste.
- Publicar em produção somente após testes documentados e autorização expressa.

## Estado desta entrega
Criada apenas esta documentação na branch exclusiva. Nenhuma funcionalidade implementada nesta etapa.
Verificações: leitura estática de código/schema, correspondência do deploy com o commit, inventário de configuração e conexões, consulta de custos públicos.
Não executados: build, testes de integração, RLS em banco, teste de checkout publicado, dispositivos, comparação visual com vídeo e preview.
Pendências para concluir a auditoria: acesso Vercel ao projeto/equipe e banco isolado gratuito identificado/conectado. Não pedir chaves secretas por chat.
