export const BRAND_MEDIA = {
  logo: '/menu-media/logo.webp',
  fachada: '/menu-media/fachada.webp'
};

const media = (image, gallery = [image], optionImages = {}) => ({ image, gallery, optionImages });

export const PRODUCT_MEDIA = {
  'pao-queijo-tradicional': media('/menu-media/tradicional.webp', ['/menu-media/tradicional.webp', '/menu-media/tradicional2.webp']),
  'pao-queijo-recheado': media('/menu-media/frango.webp', [
    '/menu-media/frango.webp',
    '/menu-media/calabresa.webp',
    '/menu-media/catupiry.webp',
    '/menu-media/chocolate.webp',
    '/menu-media/doceDeLeite.webp',
    '/menu-media/goiabada.webp'
  ], {
    Recheio: {
      'Frango com catupiry': '/menu-media/frango.webp',
      'Calabresa': '/menu-media/calabresa.webp',
      'Catupiry puro': '/menu-media/catupiry.webp',
      'Chocolate': '/menu-media/chocolate.webp',
      'Doce de leite': '/menu-media/doceDeLeite.webp',
      'Goiabada': '/menu-media/goiabada.webp'
    }
  }),
  'salgado-assado': media('/menu-media/salgadoFrango.webp', [
    '/menu-media/salgadoFrango.webp',
    '/menu-media/salgadoCarne.webp',
    '/menu-media/salgadoQueijoPresunto.webp',
    '/menu-media/pizza.webp'
  ], {
    Sabor: {
      'Frango com catupiry': '/menu-media/salgadoFrango.webp',
      'Carne': '/menu-media/salgadoCarne.webp',
      'Queijo com presunto': '/menu-media/salgadoQueijoPresunto.webp',
      'Mini pizza': '/menu-media/pizza.webp'
    }
  }),
  risoles: media('/menu-media/risole.webp'),
  cafe: media('/menu-media/cafe.webp'),
  'cafe-com-leite': media('/menu-media/cafeComLeite.webp'),
  todinho: media('/menu-media/toddynho.webp'),
  refrigerante: media('/menu-media/coca.webp', [
    '/menu-media/coca.webp',
    '/menu-media/antarctica.webp',
    '/menu-media/fanta.webp'
  ], {
    Marca: {
      'Coca-Cola': '/menu-media/coca.webp',
      'Guaraná Antarctica': '/menu-media/antarctica.webp',
      'Fanta laranja': '/menu-media/fanta.webp'
    }
  }),
  tampico: media('/menu-media/tampico.webp'),
  gatorade: media('/menu-media/gatorade.webp')
};

const PRODUCT_ID_ALIASES = {
  'a1111111-1111-4111-8111-111111111111': 'pao-queijo-tradicional',
  'a2222222-2222-4222-8222-222222222222': 'pao-queijo-recheado',
  'a3333333-3333-4333-8333-333333333333': 'salgado-assado',
  'a4444444-4444-4444-8444-444444444444': 'risoles',
  'a5555555-5555-4555-8555-555555555555': 'cafe',
  'a6666666-6666-4666-8666-666666666666': 'cafe-com-leite',
  'a7777777-7777-4777-8777-777777777777': 'todinho',
  'a8888888-8888-4888-8888-888888888888': 'refrigerante',
  'a9999999-9999-4999-8999-999999999999': 'tampico',
  'abbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb': 'gatorade'
};

const PRODUCT_NAME_ALIASES = {
  'pao de queijo tradicional': 'pao-queijo-tradicional',
  'pao de queijo recheado': 'pao-queijo-recheado',
  'salgado assado': 'salgado-assado',
  'risoles fritos': 'risoles',
  'risoles': 'risoles',
  'cafe': 'cafe',
  'cafe com leite': 'cafe-com-leite',
  'todinho': 'todinho',
  'refrigerante': 'refrigerante',
  'tampico': 'tampico',
  'gatorade': 'gatorade'
};

function normalize(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

export function getProductMediaKey(product) {
  if (!product) return '';
  if (PRODUCT_MEDIA[product.id]) return product.id;
  if (PRODUCT_ID_ALIASES[product.id]) return PRODUCT_ID_ALIASES[product.id];
  return PRODUCT_NAME_ALIASES[normalize(product.name)] || '';
}

export function getProductMedia(product) {
  const key = getProductMediaKey(product);
  const configured = PRODUCT_MEDIA[key] || {};
  return {
    image: configured.image || product?.image_url || '',
    gallery: configured.gallery?.length ? configured.gallery : (product?.image_url ? [product.image_url] : []),
    optionImages: configured.optionImages || {}
  };
}

export function getOptionImage(product, groupName, label) {
  const key = getProductMediaKey(product);
  return PRODUCT_MEDIA[key]?.optionImages?.[groupName]?.[label] || '';
}
