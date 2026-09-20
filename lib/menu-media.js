export const BRAND_MEDIA = {
  logo: '/menu-webp/logo.txt',
  fachada: '/menu-webp/fachada.txt'
};

const media = (image, gallery = [image], optionImages = {}) => ({ image, gallery, optionImages });

export const PRODUCT_MEDIA = {
  'pao-queijo-tradicional': media('/menu-webp/tradicional.txt', ['/menu-webp/tradicional.txt', '/menu-webp/tradicional2.txt']),
  'pao-queijo-recheado': media('/menu-webp/frango.txt', [
    '/menu-webp/frango.txt',
    '/menu-webp/calabresa.txt',
    '/menu-webp/catupiry.txt',
    '/menu-webp/chocolate.txt',
    '/menu-webp/doceDeLeite.txt',
    '/menu-webp/goiabada.txt'
  ], {
    Recheio: {
      'Frango com catupiry': '/menu-webp/frango.txt',
      'Calabresa': '/menu-webp/calabresa.txt',
      'Catupiry puro': '/menu-webp/catupiry.txt',
      'Chocolate': '/menu-webp/chocolate.txt',
      'Doce de leite': '/menu-webp/doceDeLeite.txt',
      'Goiabada': '/menu-webp/goiabada.txt'
    }
  }),
  'salgado-assado': media('/menu-webp/salgadoFrango.txt', [
    '/menu-webp/salgadoFrango.txt',
    '/menu-webp/salgadoCarne.txt',
    '/menu-webp/salgadoQueijoPresunto.txt',
    '/menu-webp/pizza.txt'
  ], {
    Sabor: {
      'Frango com catupiry': '/menu-webp/salgadoFrango.txt',
      'Carne': '/menu-webp/salgadoCarne.txt',
      'Queijo com presunto': '/menu-webp/salgadoQueijoPresunto.txt',
      'Mini pizza': '/menu-webp/pizza.txt'
    }
  }),
  risoles: media('/menu-webp/risole.txt'),
  cafe: media('/menu-webp/cafe.txt'),
  'cafe-com-leite': media('/menu-webp/cafeComLeite.txt'),
  todinho: media('/menu-webp/toddynho.txt'),
  refrigerante: media('/menu-webp/coca.txt', [
    '/menu-webp/coca.txt',
    '/menu-webp/antarctica.txt',
    '/menu-webp/fanta.txt'
  ], {
    Marca: {
      'Coca-Cola': '/menu-webp/coca.txt',
      'Guaraná Antarctica': '/menu-webp/antarctica.txt',
      'Fanta laranja': '/menu-webp/fanta.txt'
    }
  }),
  tampico: media('/menu-webp/tampico.txt'),
  gatorade: media('/menu-webp/gatorade.txt')
};

export function getProductMedia(product) {
  const configured = PRODUCT_MEDIA[product?.id] || {};
  return {
    image: configured.image || product?.image_url || '',
    gallery: configured.gallery?.length ? configured.gallery : (product?.image_url ? [product.image_url] : []),
    optionImages: configured.optionImages || {}
  };
}

export function getOptionImage(productId, groupName, label) {
  return PRODUCT_MEDIA[productId]?.optionImages?.[groupName]?.[label] || '';
}
