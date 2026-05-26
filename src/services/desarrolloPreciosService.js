import { getJson, requestJson } from './apiClient';
import { normalizarPreciosInmobiliarios } from '../utils/preciosInmobiliarios';

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

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

export const adaptTipoPrecioInmobiliario = (item = {}) => ({
  id: toText(pickFirst(item.tipoPrecioId, item.tipoPrecioInmobiliarioId, item.id, item.Id)),
  nombre: toText(pickFirst(item.nombre, item.tipoPrecioNombre, item.descripcion), 'Sin esquema'),
  codigo: toText(pickFirst(item.codigo, item.clave, item.tipoPrecioCodigo)),
  descripcion: toText(item.descripcion),
  activo: item.activo !== false,
  orden: toNumberOrNull(item.orden) ?? 0,
});

export const listarTiposPrecioInmobiliario = async (options = {}) =>
  normalizeList(await getJson('/api/admin/catalogos/tipos-precio-inmobiliario', options)).map(adaptTipoPrecioInmobiliario);

export const listarPreciosModelo = async (modeloId, options = {}) =>
  normalizarPreciosInmobiliarios(await getJson(`/api/admin/desarrollos/modelos/${modeloId}/precios`, options));

export const guardarPreciosModelo = (modeloId, precios) =>
  requestJson(`/api/admin/desarrollos/modelos/${modeloId}/precios`, {
    method: 'PUT',
    body: Array.isArray(precios) ? precios : [],
  });

export const listarPreciosUnidad = async (unidadId, options = {}) =>
  normalizarPreciosInmobiliarios(await getJson(`/api/admin/desarrollos/unidades/${unidadId}/precios`, options));

export const guardarPreciosUnidad = (unidadId, precios) =>
  requestJson(`/api/admin/desarrollos/unidades/${unidadId}/precios`, {
    method: 'PUT',
    body: Array.isArray(precios) ? precios : [],
  });

export const eliminarPreciosPersonalizadosUnidad = (unidadId) =>
  requestJson(`/api/admin/desarrollos/unidades/${unidadId}/precios-personalizados`, {
    method: 'DELETE',
  });

