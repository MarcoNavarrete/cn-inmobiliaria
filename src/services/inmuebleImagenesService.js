import { getJson, requestFormData, requestJson, resolveApiAssetUrl } from './apiClient';

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

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

const adaptImagenInmueble = (imagen) => {
  const url = pickFirst(imagen?.urlImagen, imagen?.url, imagen?.rutaImagen, imagen?.imagenUrl, '');

  return {
    id: String(pickFirst(imagen?.imagenId, imagen?.inmuebleImagenId, imagen?.id, '')),
    url: resolveApiAssetUrl(url),
    nombre: imagen?.nombreArchivo || imagen?.nombre || 'Imagen',
    esPrincipal: imagen?.esPrincipal === true || imagen?.principal === true,
    orden: Number(pickFirst(imagen?.orden, 0)),
  };
};

export const obtenerImagenesInmueble = async (inmuebleId, options = {}) => {
  const data = await getJson(`/api/inmuebles/${inmuebleId}/imagenes`, options);
  return normalizeList(data).map(adaptImagenInmueble).filter((imagen) => imagen.id && imagen.url);
};

export const subirImagenInmueble = (inmuebleId, archivo, options = {}) => {
  const formData = new FormData();
  formData.append('archivo', archivo);
  formData.append('esPrincipal', options.esPrincipal === true);
  formData.append('orden', Number.isFinite(Number(options.orden)) ? Number(options.orden) : 0);

  return requestFormData(`/api/inmuebles/${inmuebleId}/imagenes/upload`, {
    method: 'POST',
    body: formData,
  });
};

export const marcarImagenPrincipal = (inmuebleId, imagenId) =>
  requestJson(`/api/inmuebles/${inmuebleId}/imagenes/${imagenId}/principal`, {
    method: 'PUT',
  });

export const actualizarOrdenImagen = (inmuebleId, imagenId, orden) =>
  requestJson(`/api/inmuebles/${inmuebleId}/imagenes/${imagenId}/orden`, {
    method: 'PUT',
    body: {
      orden: Number.isFinite(Number(orden)) ? Number(orden) : 0,
    },
  });

export const eliminarImagenInmueble = (inmuebleId, imagenId) =>
  requestJson(`/api/inmuebles/${inmuebleId}/imagenes/${imagenId}`, {
    method: 'DELETE',
  });
