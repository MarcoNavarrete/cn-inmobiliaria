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

const formatDate = (value) => {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
  }).format(date);
};

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

const getImagenPrincipal = (inmueble) => {
  const imagen =
    pickFirst(
      inmueble.imagenPrincipal,
      inmueble.urlImagenPrincipal,
      inmueble.imagen?.urlImagen,
      inmueble.imagen?.url,
      inmueble.imagenes?.[0]?.urlImagen,
      inmueble.imagenes?.[0]?.url,
      inmueble.imagenes?.[0]
    ) || '';

  return typeof imagen === 'string' ? resolveApiAssetUrl(imagen) : '';
};

const buildUbicacion = (inmueble) =>
  [
    inmueble.direccion,
    inmueble.localidadNombre,
    inmueble.poblacionNombre,
    inmueble.municipioNombre,
    inmueble.estadoNombre,
  ]
    .filter(Boolean)
    .join(', ') || 'Sin ubicacion';

const adaptInmuebleAdmin = (inmueble) => ({
  id: String(
    inmueble.inmuebleId ??
      inmueble.InmuebleId ??
      inmueble.id ??
      inmueble.Id ??
      inmueble.propiedadId ??
      inmueble.PropiedadId ??
      ''
  ),
  titulo: inmueble.titulo || 'Sin titulo',
  tipoInmueble: inmueble.tipoInmuebleNombre || inmueble.tipoInmueble || 'Sin tipo',
  precio: formatCurrency(inmueble.precio, inmueble.moneda),
  ubicacion: inmueble.ubicacion || buildUbicacion(inmueble),
  estatus: inmueble.estatus || (inmueble.activo === false ? 'INACTIVO' : 'DISPONIBLE'),
  destacado: inmueble.destacado === true || inmueble.esDestacado === true,
  imagenPrincipal: getImagenPrincipal(inmueble),
  fechaCreacion: formatDate(pickFirst(inmueble.fechaCreacion, inmueble.createdAt, inmueble.creadoEn)),
});

export const obtenerAdminInmuebles = async (options = {}) => {
  const data = await getJson('/api/admin/inmuebles', options);
  return normalizeList(data).map(adaptInmuebleAdmin);
};

export const enviarRevisionInmueble = (id) =>
  requestJson(`/api/inmuebles/${id}/enviar-revision`, {
    method: 'POST',
  });

export const publicarInmueble = (id) =>
  requestJson(`/api/inmuebles/${id}/publicar`, {
    method: 'POST',
  });

export const rechazarInmueble = (id) =>
  requestJson(`/api/inmuebles/${id}/rechazar`, {
    method: 'POST',
  });

export const cambiarEstatusInmueble = (id, estatus) =>
  requestJson(`/api/inmuebles/${id}/estatus`, {
    method: 'PUT',
    body: {
      estatus,
    },
  });
