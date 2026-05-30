import { getJson, requestJson } from './apiClient';
import { normalizarPreciosInmobiliarios } from '../utils/preciosInmobiliarios';
import { adaptTipoPrecioInmobiliario } from './desarrolloPreciosService';
import { normalizeList } from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';

export const listarTiposPrecioInmobiliario = async (options = {}) =>
  normalizeList(await getJson('/api/admin/catalogos/tipos-precio-inmobiliario', options)).map(adaptTipoPrecioInmobiliario);

export const listarPreciosModeloProyecto = async (modeloId, options = {}) =>
  normalizarPreciosInmobiliarios(await getJson(`${BASE_URL}/modelos/${modeloId}/precios`, options));

export const guardarPreciosModeloProyecto = (modeloId, precios) =>
  requestJson(`${BASE_URL}/modelos/${modeloId}/precios`, {
    method: 'PUT',
    body: Array.isArray(precios) ? precios : [],
  });

export const listarPreciosUnidadProyecto = async (unidadId, options = {}) =>
  normalizarPreciosInmobiliarios(await getJson(`${BASE_URL}/unidades/${unidadId}/precios`, options));

export const guardarPreciosUnidadProyecto = (unidadId, precios) =>
  requestJson(`${BASE_URL}/unidades/${unidadId}/precios`, {
    method: 'PUT',
    body: Array.isArray(precios) ? precios : [],
  });

export const eliminarPreciosPersonalizadosUnidadProyecto = (unidadId) =>
  requestJson(`${BASE_URL}/unidades/${unidadId}/precios-personalizados`, {
    method: 'DELETE',
  });
