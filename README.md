# Casa do Pão de Queijo — Cardápio v2

Nova base do cardápio digital com duas unidades, checkout por WhatsApp, painel administrativo e acompanhamento de pedidos.

## Rotas

- `/` — cardápio público
- `/admin` — painel administrativo
- `/pedido/[token]` — acompanhamento privado do pedido
- `/api/orders` — valida e registra pedidos no servidor
- `/api/orders/[token]` — fornece somente dados seguros do status do pedido

## Principais recursos

- seleção da unidade antes do pedido;
- WhatsApp e endereço independentes por loja;
- retirada ou entrega;
- taxa de entrega por loja;
- localização compartilhada com permissão do cliente;
- busca e categorias;
- sabores, tamanhos e adicionais por produto;
- carrinho e totalização;
- efeito 3D leve nos cards em dispositivos com mouse;
- painel para produtos, categorias, lojas, fotos e pedidos;
- login administrativo via Supabase Auth;
- Storage para imagens de produtos;
- RLS nas tabelas públicas;
- preços recalculados no servidor antes de registrar o pedido;
- acompanhamento por token privado sem expor dados pessoais;
- fallback local para o cardápio continuar demonstrável antes do backend ser conectado.

## Banco de dados

Use um projeto Supabase dedicado ao cardápio. Não reutilize o banco de outro sistema.

1. Execute `supabase/schema.sql` no SQL Editor.
2. Em Authentication, crie o usuário administrador com e-mail e senha.
3. Autorize esse usuário na tabela `menu_admins` usando o bloco comentado no fim de `schema.sql`.
4. No painel `/admin`, complete o WhatsApp da unidade Cidade Alta e revise os dados das duas lojas.

## Variáveis da Vercel

Copie os nomes de `.env.example` para as variáveis do projeto:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`

`SUPABASE_SECRET_KEY` é exclusiva do servidor. Nunca transforme essa variável em `NEXT_PUBLIC_*` e nunca coloque seu valor no GitHub.

## Segurança

O navegador pode ler somente o catálogo público. Alterações do painel exigem usuário autenticado e autorizado em `menu_admins`. Pedidos não podem ser inseridos diretamente pelo cliente no banco; `/api/orders` valida loja, produtos, disponibilidade, opções, preços e taxa de entrega antes de gravar usando a chave secreta no runtime da Vercel.

## Lojas iniciais

- Cidade Alta — referência em frente à Farmácia Economize. O WhatsApp deve ser preenchido pelo administrador.
- Norte-Sul — Av. Norte-Sul, 4390. O número inicial configurado deve ser revisado no painel antes da publicação.

## Publicação

A implementação foi feita na branch `upgrade-cardapio-v2` para manter a `main` antiga intacta enquanto a nova versão é validada. Faça o preview/deploy dessa branch, configure as variáveis, teste os dois fluxos de WhatsApp e somente depois promova para produção.
