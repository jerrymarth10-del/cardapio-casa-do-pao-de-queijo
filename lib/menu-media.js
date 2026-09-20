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
