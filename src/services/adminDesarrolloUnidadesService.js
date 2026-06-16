import { API_BASE_URL, getJson, requestFormData, requestJson } from './apiClient';
import {
  determinarOrigenPrecio,
  obtenerResumenPrecios,
} from '../utils/preciosInmobiliarios';

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

const formatCurrency = (amount) => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) return 'Sin precio';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(amount));
};

const AUTH_TOKEN_KEY = 'cn_inmobiliaria_auth_token';

const getCsvFilename = (contentDisposition, fallback) => {
  const header = String(contentDisposition || '');
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ''));
  }

  const match = header.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
};

const descargarBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const ESTATUS_UNIDAD = [
  'DISPONIBLE',
  'APARTADO',
  'VENDIDO',
  'CONSTRUCCION',
  'BLOQUEADO',
];

export const adaptUnidadAdmin = (item = {}) => {
  const precio = pickFirst(item.precio, item.precioVenta, item.precioDesde);
  const estatus = toText(pickFirst(item.estatus, item.status, item.estado), 'BLOQUEADO').toUpperCase();
  const preciosModelo = pickFirst(item.preciosModelo, item.modeloPrecios, item.modelo?.precios, item.preciosBase);
  const preciosPersonalizados = pickFirst(item.preciosPersonalizados, item.precios, item.tarifas, item.tarifasPersonalizadas);
  const resumenPrecios = obtenerResumenPrecios({
    precios: preciosPersonalizados || preciosModelo,
    fallbackPrecio: precio,
  });
  const origen = determinarOrigenPrecio({
    preciosPersonalizados,
    preciosModelo,
    fallbackPrecio: precio,
  });

  return {
    id: toText(pickFirst(item.unidadId, item.id, item.Id)),
    unidadId: toText(pickFirst(item.unidadId, item.id, item.Id)),
    codigoUnidad: toText(pickFirst(item.codigoUnidad, item.codigo, item.numero, item.nombre)),
    manzana: toText(pickFirst(item.manzana, item.manzanaNombre, item.etapa)),
    lote: toText(pickFirst(item.lote, item.loteNumero, item.numeroLote)),
    modeloId: toText(pickFirst(item.modeloId, item.desarrolloModeloId)),
    modeloNombre: toText(pickFirst(item.modeloNombre, item.modelo, item.nombreModelo), 'Sin modelo'),
    precio,
    precioTexto: formatCurrency(precio),
    ...resumenPrecios,
    precioDesde: resumenPrecios.precioDesde ?? precio,
    precioDesdeTexto: resumenPrecios.precioDesdeTexto || formatCurrency(precio),
    precioOrigen: origen,
    precioOrigenEtiqueta: origen === 'PERSONALIZADO' ? 'Personalizado' : origen === 'MODELO' ? 'Modelo' : origen === 'FALLBACK' ? 'Actual' : '',
    preciosModelo: Array.isArray(preciosModelo) ? preciosModelo : [],
    preciosPersonalizados: Array.isArray(preciosPersonalizados) ? preciosPersonalizados : [],
    terrenoM2: pickFirst(item.terrenoM2, item.m2Terreno, item.metrosTerreno),
    construccionM2: pickFirst(item.construccionM2, item.m2Construccion, item.metrosConstruccion),
    estatus: ESTATUS_UNIDAD.includes(estatus) ? estatus : 'BLOQUEADO',
    svgElementId: toText(pickFirst(item.svgElementId, item.svgId, item.elementoSvgId)),
    activo: item.activo !== false,
  };
};

const normalizeUnidadPayload = (payload = {}) => ({
  codigoUnidad: toText(payload.codigoUnidad),
  manzana: toText(payload.manzana) || null,
  lote: toText(payload.lote) || null,
  modeloId: toText(payload.modeloId),
  precio: Math.max(toNumberOrNull(payload.precio) ?? 0, 0),
  terrenoM2: toNumberOrNull(payload.terrenoM2),
  construccionM2: toNumberOrNull(payload.construccionM2),
  estatus: ESTATUS_UNIDAD.includes(toText(payload.estatus).toUpperCase())
    ? toText(payload.estatus).toUpperCase()
    : 'DISPONIBLE',
  svgElementId: toText(payload.svgElementId),
  activo: payload.activo !== false,
});

export const listarUnidadesAdmin = async (desarrolloId, options = {}) =>
  normalizeList(await getJson(`/api/admin/desarrollos/${desarrolloId}/unidades`, options)).map(adaptUnidadAdmin);

export const obtenerUnidadAdmin = async (unidadId, options = {}) =>
  adaptUnidadAdmin(await getJson(`/api/admin/desarrollos/unidades/${unidadId}`, options));

export const crearUnidadAdmin = (desarrolloId, payload) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/unidades`, {
    method: 'POST',
    body: normalizeUnidadPayload(payload),
  });

export const actualizarUnidadAdmin = (unidadId, payload) =>
  requestJson(`/api/admin/desarrollos/unidades/${unidadId}`, {
    method: 'PUT',
    body: normalizeUnidadPayload(payload),
  });

export const eliminarUnidadAdmin = (unidadId) =>
  requestJson(`/api/admin/desarrollos/unidades/${unidadId}`, { method: 'DELETE' });

export const importarUnidadesCsv = (desarrolloId, file) => {
  const body = new FormData();
  body.append('file', file);

  return requestFormData(`/api/admin/desarrollos/${desarrolloId}/unidades/import-csv`, {
    method: 'POST',
    body,
  });
};

export const descargarPlantillaUnidadesCsv = async (desarrolloId) => {
  const response = await fetch(`${API_BASE_URL}/api/admin/desarrollos/${desarrolloId}/unidades/plantilla-csv`, {
    method: 'GET',
    headers: {
      ...(localStorage.getItem(AUTH_TOKEN_KEY) ? { Authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY)}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`No fue posible descargar la plantilla CSV (${response.status}).`);
  }

  const blob = await response.blob();
  const filename = getCsvFilename(response.headers.get('Content-Disposition'), `desarrollo-${desarrolloId}-unidades.csv`);
  descargarBlob(blob, filename);
};
