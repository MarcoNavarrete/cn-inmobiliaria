import { getJson, requestJson } from './apiClient';
import { cleanQuery, normalizeList } from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';

export const listarImagenes = (proyectoId, { soloActivas = true, ...options } = {}) =>
  getJson(`${BASE_URL}/${proyectoId}/imagenes`, {
    ...options,
    query: cleanQuery({ soloActivas }),
  }).then(normalizeList);

export const crearImagen = (proyectoId, data) =>
  requestJson(`${BASE_URL}/${proyectoId}/imagenes`, { method: 'POST', body: data });

export const actualizarImagen = (imagenId, data) =>
  requestJson(`${BASE_URL}/imagenes/${imagenId}`, { method: 'PUT', body: data });

export const setImagenActivo = (imagenId, activo) =>
  requestJson(`${BASE_URL}/imagenes/${imagenId}/activo`, { method: 'PATCH', body: { activo } });
