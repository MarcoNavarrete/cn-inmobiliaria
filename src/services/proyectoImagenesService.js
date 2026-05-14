import { getJson, requestFormData, requestJson } from './apiClient';
import {
  cleanQuery,
  formatDate,
  normalizeList,
  pickFirst,
  toBool,
  toNumberOrNull,
  toText,
} from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';

export const adaptProyectoImagen = (item = {}) => ({
  id: pickFirst(item.id, item.imagenId, item.proyectoImagenId),
  proyectoId: pickFirst(item.proyectoId, item.idProyecto),
  tipoImagen: toText(pickFirst(item.tipoImagen, item.tipo, item.categoria), 'GALERIA').toUpperCase(),
  url: toText(pickFirst(item.url, item.imagenUrl, item.imageUrl, item.src)),
  titulo: toText(pickFirst(item.titulo, item.title, item.nombre)),
  descripcion: toText(pickFirst(item.descripcion, item.description)),
  orden: toNumberOrNull(pickFirst(item.orden, item.order, item.posicion)) ?? 0,
  activo: toBool(pickFirst(item.activo, item.esActivo, item.active), true),
  fechaCreacion: formatDate(pickFirst(item.fechaCreacion, item.createdAt, item.fechaAlta)),
});

export const listarImagenes = (proyectoId, { soloActivas = true, ...options } = {}) =>
  getJson(`${BASE_URL}/${proyectoId}/imagenes`, {
    ...options,
    query: cleanQuery({ soloActivas }),
  }).then((data) => normalizeList(data).map(adaptProyectoImagen));

export const crearImagen = (proyectoId, data) =>
  requestJson(`${BASE_URL}/${proyectoId}/imagenes`, { method: 'POST', body: data });

export const subirImagen = (proyectoId, {
  descripcion,
  file,
  orden,
  tipoImagen,
  titulo,
} = {}) => {
  const body = new FormData();
  body.append('file', file);

  if (tipoImagen) body.append('tipoImagen', tipoImagen);
  if (titulo) body.append('titulo', titulo);
  if (descripcion) body.append('descripcion', descripcion);
  if (orden !== undefined && orden !== null && orden !== '') body.append('orden', orden);

  return requestFormData(`${BASE_URL}/${proyectoId}/imagenes/upload`, {
    method: 'POST',
    body,
  }).then(adaptProyectoImagen);
};

export const actualizarImagen = (imagenId, data) =>
  requestJson(`${BASE_URL}/imagenes/${imagenId}`, { method: 'PUT', body: data });

export const setImagenActivo = (imagenId, activo) =>
  requestJson(`${BASE_URL}/imagenes/${imagenId}/activo`, { method: 'PATCH', body: { activo } });
