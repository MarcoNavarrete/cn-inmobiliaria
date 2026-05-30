import { API_BASE_URL, getJson, requestFormData, requestJson } from './apiClient';
import {
  cleanQuery,
  normalizeList,
  pickFirst,
  toBool,
  toText,
} from './proyectosInmobiliariosUtils';
import {
  determinarOrigenPrecio,
  obtenerEtiquetaOrigenPrecio,
  obtenerResumenPrecios,
  normalizarPreciosInmobiliarios,
} from '../utils/preciosInmobiliarios';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';
const AUTH_TOKEN_KEY = 'cn_inmobiliaria_auth_token';
const MAX_CSV_SIZE = 5 * 1024 * 1024;

export const adaptProyectoUnidad = (item = {}) => {
  const id = toText(pickFirst(item.unidadId, item.proyectoUnidadId, item.id, item.Id));
  const fallbackPrecio = pickFirst(item.precioTotal, item.precio, item.precioVenta, item.precioDesde);
  const preciosPersonalizados = normalizarPreciosInmobiliarios(pickFirst(item.preciosPersonalizados, item.preciosUnidad, item.tarifasPersonalizadas, []));
  const preciosModelo = normalizarPreciosInmobiliarios(pickFirst(item.preciosModelo, item.modeloPrecios, item.modelo?.precios, item.preciosBase, []));
  const preciosApi = normalizarPreciosInmobiliarios(pickFirst(item.preciosActivos, item.precios, item.tarifas, []));
  const origenPrecio = pickFirst(
    item.precioOrigen,
    item.origenPrecio,
    determinarOrigenPrecio({ preciosPersonalizados, preciosModelo, fallbackPrecio })
  );
  const preciosFuente = preciosPersonalizados.length > 0
    ? preciosPersonalizados
    : preciosApi.length > 0
      ? preciosApi
      : preciosModelo;
  const resumenPrecios = obtenerResumenPrecios({ precios: preciosFuente, fallbackPrecio });

  return {
    id,
    unidadId: id,
    proyectoId: toText(item.proyectoId),
    tipoUnidad: toText(pickFirst(item.tipoUnidad, item.tipo), 'LOTE').toUpperCase(),
    modeloId: toText(pickFirst(item.modeloId, item.proyectoModeloId)),
    modeloNombre: toText(pickFirst(item.modeloNombre, item.modelo, item.nombreModelo), 'Sin modelo'),
    codigo: toText(pickFirst(item.codigo, item.codigoUnidad, item.clave), 'Sin codigo'),
    nombre: toText(item.nombre),
    manzana: toText(pickFirst(item.manzana, item.manzanaNombre)),
    lote: toText(pickFirst(item.lote, item.loteNumero, item.numeroLote)),
    torre: toText(item.torre),
    nivel: toText(item.nivel),
    numeroInterior: toText(pickFirst(item.numeroInterior, item.interior)),
    superficieTerrenoM2: pickFirst(item.superficieTerrenoM2, item.terrenoM2, item.m2Terreno),
    superficieConstruccionM2: pickFirst(item.superficieConstruccionM2, item.construccionM2, item.m2Construccion),
    precioM2: pickFirst(item.precioM2, item.precioPorM2),
    precioTotal: resumenPrecios.precioDesde,
    precioTotalTexto: resumenPrecios.precioDesdeTexto,
    precioDesde: resumenPrecios.precioDesde,
    precioDesdeTexto: resumenPrecios.precioDesdeTexto,
    precioContadoTexto: resumenPrecios.precioContadoTexto,
    precios: preciosFuente,
    preciosActivos: resumenPrecios.preciosActivos,
    preciosModelo,
    preciosPersonalizados,
    precioOrigen: String(origenPrecio || '').toUpperCase(),
    precioOrigenEtiqueta: obtenerEtiquetaOrigenPrecio(origenPrecio),
    estatus: toText(pickFirst(item.estatus, item.status, item.estado), 'DISPONIBLE').toUpperCase(),
    svgElementId: toText(pickFirst(item.svgElementId, item.svgId, item.elementoSvgId)),
    colorHex: toText(pickFirst(item.colorHex, item.color)),
    observaciones: toText(item.observaciones),
    destacado: toBool(item.destacado),
    visiblePublico: item.visiblePublico !== false && item.mostrarEnPublico !== false,
    activo: item.activo !== false,
  };
};
export const listarUnidades = (proyectoId, filtros = {}) => {
  const { signal, ...query } = filtros;

  return (
  getJson(`${BASE_URL}/${proyectoId}/unidades`, {
    query: cleanQuery(query),
    signal,
  }).then((data) => normalizeList(data).map(adaptProyectoUnidad))
  );
};

export const obtenerUnidad = (unidadId, options = {}) =>
  getJson(`${BASE_URL}/unidades/${unidadId}`, options).then(adaptProyectoUnidad);

export const crearUnidad = (proyectoId, data) =>
  requestJson(`${BASE_URL}/${proyectoId}/unidades`, { method: 'POST', body: data });

export const actualizarUnidad = (unidadId, data) =>
  requestJson(`${BASE_URL}/unidades/${unidadId}`, { method: 'PUT', body: data });

export const setUnidadEstatus = (unidadId, estatus) =>
  requestJson(`${BASE_URL}/unidades/${unidadId}/estatus`, { method: 'PATCH', body: { estatus } });

export const setUnidadActivo = (unidadId, activo) =>
  requestJson(`${BASE_URL}/unidades/${unidadId}/activo`, { method: 'PATCH', body: { activo } });

const validarCsvFile = (file) => {
  if (!file) {
    throw new Error('Selecciona un archivo CSV.');
  }

  const extension = String(file.name || '').split('.').pop().toLowerCase();
  if (extension !== 'csv') {
    throw new Error('El archivo debe tener extension .csv.');
  }

  if (file.size > MAX_CSV_SIZE) {
    throw new Error('El archivo CSV no debe pesar mas de 5MB.');
  }
};

const buildAdminUrl = (path) => `${API_BASE_URL}${path}`;

const getCsvFilename = (contentDisposition, fallback) => {
  const header = String(contentDisposition || '');
  const utf8Match = header.match(/filename\*=UTF-8''([^;]+)/i);
  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1].replace(/"/g, ''));
  }

  const match = header.match(/filename="?([^";]+)"?/i);
  return match?.[1] || fallback;
};

export const descargarPlantillaCsv = async (proyectoId) => {
  const response = await fetch(buildAdminUrl(`${BASE_URL}/${proyectoId}/unidades/plantilla-csv`), {
    method: 'GET',
    headers: {
      ...(localStorage.getItem(AUTH_TOKEN_KEY) ? { Authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN_KEY)}` } : {}),
    },
  });

  if (!response.ok) {
    throw new Error(`No fue posible descargar la plantilla CSV (${response.status}).`);
  }

  const blob = await response.blob();
  const filename = getCsvFilename(response.headers.get('Content-Disposition'), `proyecto-${proyectoId}-unidades.csv`);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const previewImportCsv = (proyectoId, file) => {
  validarCsvFile(file);
  const body = new FormData();
  body.append('file', file);

  return requestFormData(`${BASE_URL}/${proyectoId}/unidades/import-csv/preview`, {
    method: 'POST',
    body,
  });
};

export const confirmarImportCsv = (proyectoId, file) => {
  validarCsvFile(file);
  const body = new FormData();
  body.append('file', file);

  return requestFormData(`${BASE_URL}/${proyectoId}/unidades/import-csv/confirm`, {
    method: 'POST',
    body,
  });
};

