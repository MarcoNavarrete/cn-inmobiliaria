import { getJson } from './apiClient';

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

const formatOptionalDate = (value) => {
  if (!value) {
    return '';
  }

  return formatDate(value);
};

const getInmueble = (solicitud) =>
  solicitud?.inmueble || solicitud?.propiedad || solicitud?.Inmueble || solicitud?.Propiedad || {};

const adaptSolicitud = (solicitud) => {
  const inmueble = getInmueble(solicitud);

  return {
    id: toText(pickFirst(solicitud?.prospectoId, solicitud?.ProspectoId, solicitud?.id, solicitud?.Id)),
    inmuebleId: toText(pickFirst(
      solicitud?.inmuebleId,
      solicitud?.InmuebleId,
      inmueble?.inmuebleId,
      inmueble?.InmuebleId,
      inmueble?.id,
      inmueble?.Id
    )),
    inmueble: toText(pickFirst(
      solicitud?.tituloInmueble,
      solicitud?.TituloInmueble,
      solicitud?.inmuebleTitulo,
      solicitud?.InmuebleTitulo,
      inmueble?.titulo,
      inmueble?.Titulo,
      inmueble?.nombre,
      inmueble?.Nombre
    ), 'Propiedad no disponible'),
    estatus: toText(pickFirst(solicitud?.estatus, solicitud?.Estatus), 'NUEVO'),
    notas: toText(pickFirst(solicitud?.notas, solicitud?.Notas), 'Sin notas'),
    fecha: formatDate(pickFirst(
      solicitud?.fechaCreacion,
      solicitud?.FechaCreacion,
      solicitud?.createdAt,
      solicitud?.fecha,
      solicitud?.Fecha
    )),
    fechaUltimoContacto: formatOptionalDate(pickFirst(
      solicitud?.fechaUltimoContacto,
      solicitud?.FechaUltimoContacto,
      solicitud?.ultimoContacto,
      solicitud?.UltimoContacto
    )),
  };
};

export const obtenerMisSolicitudes = async (options = {}) => {
  const data = await getJson('/api/mis-solicitudes', options);
  return normalizeList(data).map(adaptSolicitud);
};
