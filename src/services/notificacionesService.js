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
    return '';
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

const adaptNotificacion = (notificacion) => ({
  id: String(pickFirst(notificacion?.notificacionId, notificacion?.NotificacionId, notificacion?.id, notificacion?.Id, '')),
  titulo: toText(pickFirst(notificacion?.titulo, notificacion?.Titulo), 'Notificacion'),
  mensaje: toText(pickFirst(notificacion?.mensaje, notificacion?.Mensaje, notificacion?.descripcion), ''),
  url: toText(pickFirst(notificacion?.url, notificacion?.Url, notificacion?.ruta, notificacion?.Ruta), ''),
  leida: pickFirst(notificacion?.leida, notificacion?.Leida, notificacion?.esLeida, notificacion?.EsLeida, false) === true,
  fechaRaw: pickFirst(notificacion?.fechaCreacion, notificacion?.FechaCreacion, notificacion?.createdAt, ''),
  fecha: formatDate(pickFirst(notificacion?.fechaCreacion, notificacion?.FechaCreacion, notificacion?.createdAt)),
});

export const obtenerNotificaciones = async (options = {}) => {
  const data = await getJson('/api/notificaciones', options);
  return normalizeList(data).map(adaptNotificacion).filter((item) => item.id);
};

export const marcarNotificacionLeida = (id) =>
  requestJson(`/api/notificaciones/${id}/leida`, {
    method: 'PUT',
  });

export const marcarTodasNotificacionesLeidas = () =>
  requestJson('/api/notificaciones/marcar-todas-leidas', {
    method: 'PUT',
  });
