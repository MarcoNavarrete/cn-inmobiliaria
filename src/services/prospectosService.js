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

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

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

const adaptProspecto = (prospecto) => ({
  id: String(pickFirst(prospecto?.prospectoId, prospecto?.ProspectoId, prospecto?.id, prospecto?.Id, '')),
  inmuebleId: toText(pickFirst(prospecto?.inmuebleId, prospecto?.InmuebleId)),
  tituloInmueble: toText(pickFirst(prospecto?.tituloInmueble, prospecto?.TituloInmueble), 'Sin inmueble'),
  nombre: toText(prospecto?.nombre, 'Sin nombre'),
  telefono: toText(prospecto?.telefono, 'Sin telefono'),
  email: toText(prospecto?.email, 'Sin email'),
  origen: toText(prospecto?.origen, 'Sin origen'),
  notas: toText(prospecto?.notas, 'Sin notas'),
  estatus: toText(pickFirst(prospecto?.estatus, prospecto?.Estatus), 'NUEVO'),
  fechaCreacion: formatDate(pickFirst(prospecto?.fechaCreacion, prospecto?.FechaCreacion, prospecto?.createdAt)),
  fechaUltimoContacto: formatOptionalDate(pickFirst(prospecto?.fechaUltimoContacto, prospecto?.FechaUltimoContacto)),
  fechaActualizacion: formatOptionalDate(pickFirst(prospecto?.fechaActualizacion, prospecto?.FechaActualizacion, prospecto?.updatedAt)),
  fechaFiltro: toText(pickFirst(prospecto?.fechaCreacion, prospecto?.FechaCreacion, prospecto?.createdAt)),
});

export const obtenerProspectos = async (options = {}) => {
  const data = await getJson('/api/prospectos', options);
  return normalizeList(data).map(adaptProspecto);
};

export const crearProspecto = (prospecto) =>
  requestJson('/api/prospectos', {
    method: 'POST',
    body: {
      inmuebleId: prospecto.inmuebleId,
      nombre: prospecto.nombre || '',
      telefono: prospecto.telefono || '',
      email: prospecto.email || '',
      origen: prospecto.origen || '',
      notas: prospecto.notas || '',
    },
  });

export const actualizarEstatusProspecto = (prospectoId, estatus) =>
  requestJson(`/api/prospectos/${prospectoId}/estatus`, {
    method: 'PUT',
    body: {
      estatus,
    },
  });

export const actualizarNotasProspecto = (prospectoId, notas) =>
  requestJson(`/api/prospectos/${prospectoId}/notas`, {
    method: 'PUT',
    body: {
      notas,
    },
  });
