import { getJson, requestJson } from './apiClient';

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

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const toText = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
};

const toNullableText = (value) => {
  const text = toText(value);
  return text || null;
};

const toNullableNumber = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const number = Number(value);
  return Number.isNaN(number) ? null : number;
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
    timeStyle: 'short',
  }).format(date);
};

const normalizePayload = (payload = {}) => ({
  nombre: toText(payload.nombre),
  estadoId: toNullableText(payload.estadoId),
  poblacionId: toNullableText(payload.poblacionId),
  localidadId: toNullableText(payload.localidadId),
  tipoInmueble: toNullableText(payload.tipoInmueble),
  precioMin: toNullableNumber(payload.precioMin),
  precioMax: toNullableNumber(payload.precioMax),
});

const adaptBusqueda = (busqueda) => ({
  id: toText(pickFirst(busqueda?.busquedaId, busqueda?.BusquedaId, busqueda?.id, busqueda?.Id)),
  nombre: toText(pickFirst(busqueda?.nombre, busqueda?.Nombre), 'Busqueda sin nombre'),
  estadoId: toText(pickFirst(busqueda?.estadoId, busqueda?.EstadoId)),
  estadoNombre: toText(pickFirst(busqueda?.estadoNombre, busqueda?.EstadoNombre, busqueda?.nomEstado)),
  poblacionId: toText(pickFirst(busqueda?.poblacionId, busqueda?.PoblacionId)),
  poblacionNombre: toText(pickFirst(
    busqueda?.poblacionNombre,
    busqueda?.PoblacionNombre,
    busqueda?.municipioNombre,
    busqueda?.MunicipioNombre,
    busqueda?.nomPoblacion
  )),
  localidadId: toText(pickFirst(busqueda?.localidadId, busqueda?.LocalidadId)),
  localidadNombre: toText(pickFirst(
    busqueda?.localidadNombre,
    busqueda?.LocalidadNombre,
    busqueda?.coloniaNombre,
    busqueda?.ColoniaNombre,
    busqueda?.nomLocalidad
  )),
  tipoInmueble: toText(pickFirst(busqueda?.tipoInmueble, busqueda?.TipoInmueble)),
  precioMin: pickFirst(busqueda?.precioMin, busqueda?.PrecioMin),
  precioMax: pickFirst(busqueda?.precioMax, busqueda?.PrecioMax),
  fechaCreacion: formatDate(pickFirst(
    busqueda?.fechaCreacion,
    busqueda?.FechaCreacion,
    busqueda?.createdAt,
    busqueda?.CreatedAt
  )),
});

export const listarMisBusquedas = async (options = {}) => {
  const data = await getJson('/api/mis-busquedas', options);
  return normalizeList(data).map(adaptBusqueda).filter((busqueda) => busqueda.id);
};

export const crearBusquedaGuardada = (payload) =>
  requestJson('/api/mis-busquedas', {
    method: 'POST',
    body: normalizePayload(payload),
  });

export const eliminarBusquedaGuardada = (busquedaId) =>
  requestJson(`/api/mis-busquedas/${busquedaId}`, {
    method: 'DELETE',
  });
