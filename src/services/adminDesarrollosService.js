import { getJson, requestFormData, requestJson, resolveApiAssetUrl } from './apiClient';

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const toText = (value, fallback = '') => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text || fallback;
};

const toBool = (value, fallback = false) =>
  value === undefined || value === null ? fallback : value === true;

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return 'Sin precio';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium' }).format(date);
};

const getImageUrl = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return resolveApiAssetUrl(value);
  return resolveApiAssetUrl(pickFirst(value.url, value.urlImagen, value.imagenUrl, value.ruta));
};

const buildUbicacion = (item) =>
  [
    item.zona,
    item.direccion,
    item.coloniaNombre,
    item.localidadNombre,
    item.municipioNombre,
    item.poblacionNombre,
    item.estadoNombre,
  ].filter(Boolean).join(', ') || 'Sin ubicacion';

export const normalizeDesarrolloPayload = (payload = {}) => ({
  nombre: toText(payload.nombre),
  slug: toText(payload.slug),
  descripcion: toText(payload.descripcion),
  estadoId: toText(payload.estadoId) || null,
  poblacionId: toText(payload.poblacionId) || null,
  localidadId: toText(payload.localidadId) || null,
  zona: toText(payload.zona),
  direccion: toText(payload.direccion),
  precioDesde: toNumberOrNull(payload.precioDesde),
  imagenPrincipalUrl: toText(payload.imagenPrincipalUrl) || null,
  telefonoContacto: toText(payload.telefonoContacto).slice(0, 30) || null,
  nombreContacto: toText(payload.nombreContacto).slice(0, 150) || null,
  destacado: payload.destacado === true,
  activo: payload.activo !== false,
});

export const normalizeModeloPayload = (payload = {}) => ({
  nombre: toText(payload.nombre),
  descripcion: toText(payload.descripcion),
  precio: toNumberOrNull(payload.precio),
  recamaras: toNumberOrNull(payload.recamaras),
  banos: toNumberOrNull(payload.banos),
  estacionamientos: toNumberOrNull(payload.estacionamientos),
  construccionM2: toNumberOrNull(payload.construccionM2),
  terrenoM2: toNumberOrNull(payload.terrenoM2),
  disponible: payload.disponible !== false,
  imagenPrincipalUrl: toText(payload.imagenPrincipalUrl) || null,
  activo: payload.activo !== false,
});

export const adaptDesarrolloAdmin = (item = {}) => ({
  id: toText(pickFirst(item.desarrolloId, item.id, item.Id)),
  desarrolloId: toText(pickFirst(item.desarrolloId, item.id, item.Id)),
  nombre: toText(item.nombre, 'Sin nombre'),
  slug: toText(item.slug),
  descripcion: toText(item.descripcion),
  estadoId: toText(pickFirst(item.estadoId, item.EstadoId)),
  poblacionId: toText(pickFirst(item.poblacionId, item.PoblacionId, item.municipioId)),
  localidadId: toText(pickFirst(item.localidadId, item.LocalidadId)),
  estadoNombre: toText(item.estadoNombre),
  municipioNombre: toText(pickFirst(item.municipioNombre, item.poblacionNombre)),
  coloniaNombre: toText(pickFirst(item.coloniaNombre, item.localidadNombre)),
  zona: toText(item.zona),
  direccion: toText(item.direccion),
  ubicacion: buildUbicacion(item),
  precioDesde: pickFirst(item.precioDesde, item.PrecioDesde),
  precioDesdeTexto: formatCurrency(pickFirst(item.precioDesde, item.PrecioDesde)),
  imagenPrincipalUrl: toText(item.imagenPrincipalUrl),
  imagenPrincipal: getImageUrl(item.imagenPrincipalUrl),
  telefonoContacto: toText(item.telefonoContacto),
  nombreContacto: toText(item.nombreContacto),
  destacado: toBool(item.destacado),
  activo: item.activo !== false,
  fechaCreacion: formatDate(pickFirst(item.fechaCreacion, item.createdAt, item.creadoEn)),
});

export const adaptImagen = (item = {}) => ({
  id: toText(pickFirst(item.imagenId, item.desarrolloImagenId, item.id)),
  url: getImageUrl(pickFirst(item.url, item.urlImagen, item.imagenUrl)),
  urlOriginal: toText(pickFirst(item.url, item.urlImagen, item.imagenUrl)),
  titulo: toText(pickFirst(item.titulo, item.nombre)),
  orden: pickFirst(item.orden, 0),
  activo: item.activo !== false,
  esPrincipal: item.esPrincipal === true,
});

export const adaptAmenidad = (item = {}) => ({
  id: toText(pickFirst(item.amenidadId, item.desarrolloAmenidadId, item.id)),
  nombre: toText(pickFirst(item.nombre, item.descripcion, item.amenidad), 'Sin nombre'),
  activo: item.activo !== false,
});

export const adaptModelo = (item = {}) => ({
  id: toText(pickFirst(item.modeloId, item.desarrolloModeloId, item.id)),
  nombre: toText(item.nombre, 'Sin nombre'),
  descripcion: toText(item.descripcion),
  precio: pickFirst(item.precio, item.precioDesde),
  precioTexto: formatCurrency(pickFirst(item.precio, item.precioDesde)),
  recamaras: pickFirst(item.recamaras, 0),
  banos: pickFirst(item.banos, 0),
  estacionamientos: pickFirst(item.estacionamientos, 0),
  construccionM2: pickFirst(item.construccionM2, 0),
  terrenoM2: pickFirst(item.terrenoM2, 0),
  disponible: item.disponible !== false,
  imagenPrincipalUrl: toText(item.imagenPrincipalUrl),
  imagenPrincipal: getImageUrl(item.imagenPrincipalUrl),
  activo: item.activo !== false,
});

export const listarAdminDesarrollos = async (options = {}) =>
  normalizeList(await getJson('/api/admin/desarrollos', options)).map(adaptDesarrolloAdmin);

export const obtenerAdminDesarrollo = async (desarrolloId, options = {}) =>
  adaptDesarrolloAdmin(await getJson(`/api/admin/desarrollos/${desarrolloId}`, options));

export const crearAdminDesarrollo = (payload) =>
  requestJson('/api/admin/desarrollos', { method: 'POST', body: normalizeDesarrolloPayload(payload) });

export const actualizarAdminDesarrollo = (desarrolloId, payload) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}`, { method: 'PUT', body: normalizeDesarrolloPayload(payload) });

export const eliminarAdminDesarrollo = (desarrolloId) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}`, { method: 'DELETE' });

export const listarDesarrolloImagenes = async (desarrolloId, options = {}) =>
  normalizeList(await getJson(`/api/admin/desarrollos/${desarrolloId}/imagenes`, options)).map(adaptImagen);

export const crearDesarrolloImagen = (desarrolloId, payload) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/imagenes`, { method: 'POST', body: payload });

export const actualizarDesarrolloImagen = (desarrolloId, imagenId, payload) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/imagenes/${imagenId}`, { method: 'PUT', body: payload });

export const eliminarDesarrolloImagen = (desarrolloId, imagenId) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/imagenes/${imagenId}`, { method: 'DELETE' });

export const subirImagenDesarrollo = (desarrolloId, file) => {
  const body = new FormData();
  body.append('file', file);

  return requestFormData(`/api/admin/desarrollos/${desarrolloId}/upload-imagen`, {
    method: 'POST',
    body,
  });
};

export const listarDesarrolloAmenidades = async (desarrolloId, options = {}) =>
  normalizeList(await getJson(`/api/admin/desarrollos/${desarrolloId}/amenidades`, options)).map(adaptAmenidad);

export const crearDesarrolloAmenidad = (desarrolloId, payload) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/amenidades`, { method: 'POST', body: payload });

export const actualizarDesarrolloAmenidad = (desarrolloId, amenidadId, payload) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/amenidades/${amenidadId}`, { method: 'PUT', body: payload });

export const eliminarDesarrolloAmenidad = (desarrolloId, amenidadId) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/amenidades/${amenidadId}`, { method: 'DELETE' });

export const listarDesarrolloModelos = async (desarrolloId, options = {}) =>
  normalizeList(await getJson(`/api/admin/desarrollos/${desarrolloId}/modelos`, options)).map(adaptModelo);

export const obtenerDesarrolloModelo = async (desarrolloId, modeloId, options = {}) =>
  adaptModelo(await getJson(`/api/admin/desarrollos/${desarrolloId}/modelos/${modeloId}`, options));

export const crearDesarrolloModelo = (desarrolloId, payload) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/modelos`, { method: 'POST', body: normalizeModeloPayload(payload) });

export const actualizarDesarrolloModelo = (desarrolloId, modeloId, payload) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/modelos/${modeloId}`, { method: 'PUT', body: normalizeModeloPayload(payload) });

export const eliminarDesarrolloModelo = (desarrolloId, modeloId) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/modelos/${modeloId}`, { method: 'DELETE' });

export const listarModeloImagenes = async (modeloId, options = {}) =>
  normalizeList(await getJson(`/api/admin/desarrollos/modelos/${modeloId}/imagenes`, options)).map(adaptImagen);

export const crearModeloImagen = (modeloId, payload) =>
  requestJson(`/api/admin/desarrollos/modelos/${modeloId}/imagenes`, { method: 'POST', body: payload });

export const actualizarModeloImagen = (modeloId, imagenId, payload) =>
  requestJson(`/api/admin/desarrollos/modelos/${modeloId}/imagenes/${imagenId}`, { method: 'PUT', body: payload });

export const eliminarModeloImagen = (modeloId, imagenId) =>
  requestJson(`/api/admin/desarrollos/modelos/${modeloId}/imagenes/${imagenId}`, { method: 'DELETE' });

export const subirImagenModelo = (modeloId, file) => {
  const body = new FormData();
  body.append('file', file);

  return requestFormData(`/api/admin/desarrollos/modelos/${modeloId}/upload-imagen`, {
    method: 'POST',
    body,
  });
};
