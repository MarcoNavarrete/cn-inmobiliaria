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

const adaptNota = (item = {}) => ({
  id: toText(pickFirst(item.notaId, item.prospectoNotaId, item.id, item.Id)),
  nota: toText(pickFirst(item.nota, item.texto, item.descripcion, item.comentario), 'Sin nota'),
  usuario: toText(pickFirst(item.usuarioNombre, item.nombreUsuario, item.usuario, item.createdBy), 'Sin usuario'),
  fecha: formatDate(pickFirst(item.fechaCreacion, item.createdAt, item.fecha, item.FechaCreacion)),
});

const prospectoPath = (tipoProspecto, prospectoId, suffix = '') =>
  `/api/admin/prospectos/${encodeURIComponent(tipoProspecto)}/${encodeURIComponent(prospectoId)}${suffix}`;

export const actualizarEstatusProspecto = (tipoProspecto, prospectoId, estatus) =>
  requestJson(prospectoPath(tipoProspecto, prospectoId, '/estatus'), {
    method: 'PUT',
    body: { estatus },
  });

export const listarNotasProspecto = async (tipoProspecto, prospectoId, options = {}) => {
  const data = await getJson(prospectoPath(tipoProspecto, prospectoId, '/notas'), options);
  return normalizeList(data).map(adaptNota);
};

export const agregarNotaProspecto = (tipoProspecto, prospectoId, nota) =>
  requestJson(prospectoPath(tipoProspecto, prospectoId, '/notas'), {
    method: 'POST',
    body: { nota: toText(nota) },
  });
