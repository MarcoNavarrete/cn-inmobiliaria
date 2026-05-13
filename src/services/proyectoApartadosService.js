import { getJson, requestJson } from './apiClient';
import { cleanQuery, normalizeList } from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';

export const listarApartados = (filtros = {}) => {
  const { signal, ...query } = filtros;

  return (
  getJson(`${BASE_URL}/apartados`, {
    query: cleanQuery(query),
    signal,
  }).then(normalizeList)
  );
};

export const crearApartado = (proyectoId, data) =>
  requestJson(`${BASE_URL}/${proyectoId}/apartados`, { method: 'POST', body: data });

export const actualizarEstatusApartado = (apartadoId, data) =>
  requestJson(`${BASE_URL}/apartados/${apartadoId}/estatus`, { method: 'PATCH', body: data });
