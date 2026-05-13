import { getJson, requestJson } from './apiClient';
import { cleanQuery, normalizeList } from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios/prospectos';

export const listarProspectos = (filtros = {}) => {
  const { signal, ...query } = filtros;

  return (
  getJson(BASE_URL, {
    query: cleanQuery(query),
    signal,
  }).then(normalizeList)
  );
};

export const actualizarEstatusProspecto = (prospectoId, data) =>
  requestJson(`${BASE_URL}/${prospectoId}/estatus`, { method: 'PATCH', body: data });
