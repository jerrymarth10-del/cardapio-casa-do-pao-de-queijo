export const BRAND_MEDIA = {
  logo: '/menu-assets/logo.txt',
  fachada: '/menu-assets/fachada.txt'
};

const media = (image, gallery = [image], optionImages = {}) => ({ image, gallery, optionImages });

export const PRODUCT_MEDIA = {
  'pao-queijo-tradicional': media('/menu-assets/tradicional.txt', ['/menu-assets/tradicional.txt', '/menu-assets/tradicional2.txt']),
  'pao-queijo-recheado': media('/menu-assets/frango.txt', [
    '/menu-assets/frango.txt',
    '/menu-assets/calabresa.txt',
    '/menu-assets/catupiry.txt',
    '/menu-assets/chocolate.txt',
    '/menu-assets/doceDeLeite.txt',
    '/menu-assets/goiabada.txt'
  ], {
    Recheio: {
      'Frango com catupiry': '/menu-assets/frango.txt',
      'Calabresa': '/menu-assets/calabresa.txt',
      'Catupiry puro': '/menu-assets/catupiry.txt',
      'Chocolate': '/menu-assets/chocolate.txt',
      'Doce de leite': '/menu-assets/doceDeLeite.txt',
      'Goiabada': '/menu-assets/goiabada.txt'
    }
  }),
  'salgado-assado': media('/menu-assets/salgadoFrango.txt', [
    '/menu-assets/salgadoFrango.txt',
    '/menu-assets/salgadoCarne.txt',
    '/menu-assets/salgadoQueijoPresunto.txt',
    '/menu-assets/pizza.txt'
  ], {
    Sabor: {
      'Frango com catupiry': '/menu-assets/salgadoFrango.txt',
      'Carne': '/menu-assets/salgadoCarne.txt',
      'Queijo com presunto': '/menu-assets/salgadoQueijoPresunto.txt',
      'Mini pizza': '/menu-assets/pizza.txt'
    }
  }),
  risoles: media('/menu-assets/risole.txt'),
  cafe: media('/menu-assets/cafe.txt'),
  'cafe-com-leite': media('/menu-assets/cafeComLeite.txt'),
  todinho: media('/menu-assets/toddynho.txt'),
  refrigerante: media('/menu-assets/coca.txt', [
    '/menu-assets/coca.txt',
    '/menu-assets/antarctica.txt',
    '/menu-assets/fanta.txt'
  ], {
    Marca: {
      'Coca-Cola': '/menu-assets/coca.txt',
      'Guaraná Antarctica': '/menu-assets/antarctica.txt',
      'Fanta laranja': '/menu-assets/fanta.txt'
    }
  }),
  tampico: media('/menu-assets/tampico.txt'),
  gatorade: media('/menu-assets/gatorade.txt')
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
