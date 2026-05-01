import { getJson, requestJson, resolveApiAssetUrl } from './apiClient';

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
};

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const formatCurrency = (amount, currency = 'MXN') => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return 'Sin precio';
  }

  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch (_) {
    return `${amount} ${currency}`.trim();
  }
};

const getInmuebleFromFavorito = (favorito) =>
  favorito?.inmueble || favorito?.propiedad || favorito;

const getImagenPrincipal = (inmueble) => {
  const imagen = pickFirst(
    inmueble?.imagenPrincipal,
    inmueble?.urlImagenPrincipal,
    inmueble?.imagen?.urlImagen,
    inmueble?.imagen?.url,
    inmueble?.imagenes?.[0]?.urlImagen,
    inmueble?.imagenes?.[0]?.url,
    inmueble?.imagenes?.[0]
  );

  return typeof imagen === 'string' ? resolveApiAssetUrl(imagen) : '';
};

const buildUbicacion = (inmueble) =>
  [
    inmueble?.direccion,
    inmueble?.localidadNombre,
    inmueble?.poblacionNombre,
    inmueble?.municipioNombre,
    inmueble?.estadoNombre,
  ]
    .filter(Boolean)
    .join(', ') || 'Ubicacion no disponible';

const adaptFavorito = (favorito) => {
  const inmueble = getInmuebleFromFavorito(favorito);

  return {
    id: String(pickFirst(inmueble?.inmuebleId, inmueble?.id, favorito?.inmuebleId, favorito?.InmuebleId, '')),
    titulo: inmueble?.titulo || 'Propiedad sin titulo',
    precio: typeof inmueble?.precio === 'string' ? inmueble.precio : formatCurrency(inmueble?.precio, inmueble?.moneda),
    ubicacion: inmueble?.ubicacion || buildUbicacion(inmueble),
    imagenPrincipal: getImagenPrincipal(inmueble),
  };
};

export const obtenerFavoritos = async (options = {}) => {
  const data = await getJson('/api/favoritos', options);
  return normalizeList(data).map(adaptFavorito).filter((favorito) => favorito.id);
};

export const agregarFavorito = (inmuebleId) =>
  requestJson(`/api/favoritos/${inmuebleId}`, {
    method: 'POST',
  });

export const eliminarFavorito = (inmuebleId) =>
  requestJson(`/api/favoritos/${inmuebleId}`, {
    method: 'DELETE',
  });

export const existeFavorito = async (inmuebleId, options = {}) => {
  const data = await getJson(`/api/favoritos/${inmuebleId}/exists`, options);

  if (typeof data === 'boolean') {
    return data;
  }

  return data?.exists === true || data?.existe === true || data?.favorito === true;
};
