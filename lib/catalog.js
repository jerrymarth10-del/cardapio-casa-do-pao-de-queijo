export const DEMO_STORES = [
  {
    id: 'cidade-alta',
    slug: 'cidade-alta',
    name: 'Casa do Pão de Queijo — Cidade Alta',
    short_name: 'Cidade Alta',
    address: 'Cidade Alta — em frente à Farmácia Economize',
    whatsapp: '5569993652228',
    delivery_fee: 8,
    pickup_enabled: true,
    delivery_enabled: true,
    is_active: true,
    location_url: '',
    hours: { label: 'Consulte o horário da unidade' }
  },
  {
    id: 'norte-sul',
    slug: 'norte-sul',
    name: 'Casa do Pão de Queijo — Norte-Sul',
    short_name: 'Norte-Sul',
    address: 'Av. Norte-Sul, 4390 — em frente à Laranjas Rolim',
    whatsapp: '5569993677137',
    delivery_fee: 8,
    pickup_enabled: true,
    delivery_enabled: true,
    is_active: true,
    location_url: '',
    hours: { label: 'Consulte o horário da unidade' }
  }
];

export const DEMO_CATEGORIES = [
  { id: 'paes-de-queijo', name: 'Pães de queijo', icon: '🧀', sort_order: 1 },
  { id: 'salgados', name: 'Salgados', icon: '🥟', sort_order: 2 },
  { id: 'cafes', name: 'Cafés', icon: '☕', sort_order: 3 },
  { id: 'bebidas', name: 'Bebidas', icon: '🥤', sort_order: 4 }
];

export const DEMO_PRODUCTS = [
  {
    id: 'pao-queijo-tradicional',
    category_id: 'paes-de-queijo',
    name: 'Pão de queijo tradicional',
    description: 'Quentinho, macio por dentro e douradinho por fora.',
    base_price: 1.25,
    image_url: '',
    emoji: '🧀',
    badge: 'Mais vendido',
    active: true,
    sort_order: 1,
    options: []
  },
  {
    id: 'pao-queijo-recheado',
    category_id: 'paes-de-queijo',
    name: 'Pão de queijo recheado',
    description: 'Escolha seu recheio favorito.',
    base_price: 3,
    image_url: '',
    emoji: '🤤',
    active: true,
    sort_order: 2,
    options: [{
      name: 'Recheio', required: true, type: 'single', values: [
        { label: 'Frango com catupiry', price_delta: 0 },
        { label: 'Calabresa', price_delta: 0 },
        { label: 'Catupiry puro', price_delta: 0 },
        { label: 'Chocolate', price_delta: 0 },
        { label: 'Doce de leite', price_delta: 0 },
        { label: 'Goiabada', price_delta: 0 }
      ]
    }]
  },
  {
    id: 'salgado-assado',
    category_id: 'salgados',
    name: 'Salgado assado',
    description: 'Assado na hora, com massa leve e recheio caprichado.',
    base_price: 10,
    image_url: '',
    emoji: '🥐',
    active: true,
    sort_order: 1,
    options: [{
      name: 'Sabor', required: true, type: 'single', values: [
        { label: 'Frango com catupiry', price_delta: 0 },
        { label: 'Carne', price_delta: 0 },
        { label: 'Queijo com presunto', price_delta: 0 },
        { label: 'Mini pizza', price_delta: 0 }
      ]
    }]
  },
  {
    id: 'risoles',
    category_id: 'salgados',
    name: 'Risoles fritos',
    description: 'Crocantes por fora e bem recheados.',
    base_price: 7,
    image_url: '',
    emoji: '🥟',
    active: true,
    sort_order: 2,
    options: [{
      name: 'Sabor', required: true, type: 'single', values: [
        { label: 'Carne', price_delta: 0 },
        { label: 'Queijo e presunto', price_delta: 0 },
        { label: 'Frango', price_delta: 0 }
      ]
    }]
  },
  {
    id: 'cafe',
    category_id: 'cafes',
    name: 'Café',
    description: 'Café passado, servido quentinho.',
    base_price: 3,
    image_url: '',
    emoji: '☕',
    active: true,
    sort_order: 1,
    options: []
  },
  {
    id: 'cafe-com-leite',
    category_id: 'cafes',
    name: 'Café com leite',
    description: 'Café com leite cremoso e equilibrado.',
    base_price: 4,
    image_url: '',
    emoji: '🥛',
    active: true,
    sort_order: 2,
    options: []
  },
  {
    id: 'todinho',
    category_id: 'bebidas',
    name: 'Todinho',
    description: 'Achocolatado gelado.',
    base_price: 3.5,
    image_url: '',
    emoji: '🧃',
    active: true,
    sort_order: 1,
    options: []
  },
  {
    id: 'refrigerante',
    category_id: 'bebidas',
    name: 'Refrigerante',
    description: 'Escolha a marca e o tamanho.',
    base_price: 6,
    image_url: '',
    emoji: '🥤',
    active: true,
    sort_order: 2,
    options: [
      { name: 'Marca', required: true, type: 'single', values: [
        { label: 'Coca-Cola', price_delta: 0 },
        { label: 'Guaraná Antarctica', price_delta: 0 },
        { label: 'Fanta laranja', price_delta: 0 }
      ]},
      { name: 'Tamanho', required: true, type: 'single', values: [
        { label: '350 ml', price_delta: 0 },
        { label: '600 ml', price_delta: 2 },
        { label: '1 L', price_delta: 6 },
        { label: '2 L', price_delta: 9 }
      ]}
    ]
  },
  {
    id: 'tampico',
    category_id: 'bebidas',
    name: 'Tampico',
    description: 'Geladinho. Escolha o tamanho.',
    base_price: 6,
    image_url: '',
    emoji: '🍊',
    active: true,
    sort_order: 3,
    options: [{ name: 'Tamanho', required: true, type: 'single', values: [
      { label: '250 ml', price_delta: 0 },
      { label: '450 ml', price_delta: 2 },
      { label: '1 L', price_delta: 4 },
      { label: '2 L', price_delta: 9 }
    ]}]
  },
  {
    id: 'gatorade',
    category_id: 'bebidas',
    name: 'Gatorade',
    description: 'Sabores variados, sujeito à disponibilidade.',
    base_price: 8,
    image_url: '',
    emoji: '⚡',
    active: true,
    sort_order: 4,
    options: []
  }
];

export const DEMO_CATALOG = {
  stores: DEMO_STORES,
  categories: DEMO_CATEGORIES,
  products: DEMO_PRODUCTS,
  availability: []
};

export const money = (value) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value || 0));
