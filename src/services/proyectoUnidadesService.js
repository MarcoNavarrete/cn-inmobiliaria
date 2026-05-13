import { getJson, requestJson } from './apiClient';
import { cleanQuery, normalizeList } from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';

export const listarUnidades = (proyectoId, filtros = {}) => {
  const { signal, ...query } = filtros;

  return (
  getJson(`${BASE_URL}/${proyectoId}/unidades`, {
    query: cleanQuery(query),
    signal,
  }).then(normalizeList)
  );
};

export const obtenerUnidad = (unidadId, options = {}) =>
  getJson(`${BASE_URL}/unidades/${unidadId}`, options);

export const crearUnidad = (proyectoId, data) =>
  requestJson(`${BASE_URL}/${proyectoId}/unidades`, { method: 'POST', body: data });

export const actualizarUnidad = (unidadId, data) =>
  requestJson(`${BASE_URL}/unidades/${unidadId}`, { method: 'PUT', body: data });

export const setUnidadEstatus = (unidadId, estatus) =>
  requestJson(`${BASE_URL}/unidades/${unidadId}/estatus`, { method: 'PATCH', body: { estatus } });

export const setUnidadActivo = (unidadId, activo) =>
  requestJson(`${BASE_URL}/unidades/${unidadId}/activo`, { method: 'PATCH', body: { activo } });
