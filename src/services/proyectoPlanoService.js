import { getJson, requestJson } from './apiClient';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';

export const obtenerPlano = (proyectoId, options = {}) =>
  getJson(`${BASE_URL}/${proyectoId}/plano`, options);

export const guardarPlano = (proyectoId, data) =>
  requestJson(`${BASE_URL}/${proyectoId}/plano`, { method: 'PUT', body: data });
