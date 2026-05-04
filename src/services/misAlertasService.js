import { getJson, requestJson } from './apiClient';

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

const formatDate = (value) => {
  if (!value) return 'Sin fecha';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const adaptAlerta = (alerta = {}) => ({
  id: toText(pickFirst(alerta.alertaId, alerta.id, alerta.Id)),
  titulo: toText(pickFirst(alerta.titulo, alerta.title), 'Alerta'),
  mensaje: toText(pickFirst(alerta.mensaje, alerta.message, alerta.descripcion)),
  tipoEntidad: toText(pickFirst(alerta.tipoEntidad, alerta.TipoEntidad), 'INMUEBLE'),
  entidadId: toText(pickFirst(alerta.entidadId, alerta.EntidadId, alerta.inmuebleId, alerta.desarrolloId, alerta.modeloId)),
  slug: toText(pickFirst(alerta.slug, alerta.desarrolloSlug, alerta.DesarrolloSlug)),
  url: toText(pickFirst(alerta.url, alerta.Url, alerta.link)),
  leido: pickFirst(alerta.leido, alerta.Leido, alerta.esLeido) === true,
  fechaCreacion: formatDate(pickFirst(alerta.fechaCreacion, alerta.FechaCreacion, alerta.createdAt)),
  fechaFiltro: toText(pickFirst(alerta.fechaCreacion, alerta.FechaCreacion, alerta.createdAt)),
});

export const listarMisAlertas = async (options = {}) =>
  normalizeList(await getJson('/api/mis-alertas', options)).map(adaptAlerta);

export const marcarAlertaLeida = (alertaId) =>
  requestJson(`/api/mis-alertas/${alertaId}/leido`, { method: 'PUT' });
