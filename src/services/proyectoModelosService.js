import { getJson, requestJson } from './apiClient';
import { cleanQuery, normalizeList } from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';

export const listarModelos = (proyectoId, { soloActivos = true, ...options } = {}) =>
  getJson(`${BASE_URL}/${proyectoId}/modelos`, {
    ...options,
    query: cleanQuery({ soloActivos }),
  }).then(normalizeList);

export const obtenerModelo = (modeloId, options = {}) =>
  getJson(`${BASE_URL}/modelos/${modeloId}`, options);

export const crearModelo = (proyectoId, data) =>
  requestJson(`${BASE_URL}/${proyectoId}/modelos`, { method: 'POST', body: data });

export const actualizarModelo = (modeloId, data) =>
  requestJson(`${BASE_URL}/modelos/${modeloId}`, { method: 'PUT', body: data });

export const setModeloActivo = (modeloId, activo) =>
  requestJson(`${BASE_URL}/modelos/${modeloId}/activo`, { method: 'PATCH', body: { activo } });
