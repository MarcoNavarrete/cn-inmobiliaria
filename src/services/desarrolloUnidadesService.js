import { getJson } from './apiClient';
import {
  determinarOrigenPrecio,
  formatearMonedaMXN,
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

const adaptUnidad = (unidad = {}) => {
  const codigoUnidad = toText(pickFirst(unidad.codigoUnidad, unidad.codigo, unidad.numero, unidad.nombre));
  const preciosModelo = pickFirst(unidad.preciosModelo, unidad.modeloPrecios, unidad.modelo?.precios, unidad.preciosBase);
  const preciosPersonalizados = pickFirst(unidad.preciosPersonalizados, unidad.precios, unidad.tarifas, unidad.tarifasPersonalizadas);
  const precioFallback = pickFirst(unidad.precioDesde, unidad.precio, unidad.precioVenta);
  const resumenPrecios = obtenerResumenPrecios({
    precios: preciosPersonalizados || preciosModelo,
    fallbackPrecio: precioFallback,
  });
  const origen = determinarOrigenPrecio({
    preciosPersonalizados,
    preciosModelo,
    fallbackPrecio: precioFallback,
  });

  return {
    unidadId: toText(pickFirst(unidad.unidadId, unidad.id, unidad.Id)),
    desarrolloUnidadId: toText(pickFirst(unidad.desarrolloUnidadId, unidad.unidadId, unidad.id, unidad.Id)),
    codigoUnidad,
    manzana: toText(pickFirst(unidad.manzana, unidad.manzanaNombre, unidad.etapa)),
    lote: toText(pickFirst(unidad.lote, unidad.loteNumero, unidad.numeroLote, unidad.codigoLote)),
    modeloId: toText(pickFirst(unidad.modeloId, unidad.desarrolloModeloId)),
    modeloNombre: toText(pickFirst(unidad.modeloNombre, unidad.modelo, unidad.nombreModelo), 'Modelo por confirmar'),
    ...resumenPrecios,
    precio: toNumberOrNull(pickFirst(unidad.precio, unidad.precioVenta, unidad.precioDesde, resumenPrecios.precioDesde)),
    precioTexto: formatearMonedaMXN(pickFirst(unidad.precio, unidad.precioVenta, unidad.precioDesde, resumenPrecios.precioDesde)),
    precioOrigen: origen,
    precioOrigenEtiqueta: origen === 'PERSONALIZADO' ? 'Personalizado' : origen === 'MODELO' ? 'Modelo' : origen === 'FALLBACK' ? 'Actual' : '',
    preciosModelo: Array.isArray(preciosModelo) ? preciosModelo : [],
    preciosPersonalizados: Array.isArray(preciosPersonalizados) ? preciosPersonalizados : [],
    terrenoM2: toNumberOrNull(pickFirst(unidad.terrenoM2, unidad.m2Terreno, unidad.metrosTerreno)),
    construccionM2: toNumberOrNull(pickFirst(unidad.construccionM2, unidad.m2Construccion, unidad.metrosConstruccion)),
    estatus: toText(pickFirst(unidad.estatus, unidad.status, unidad.estado), 'BLOQUEADO').toUpperCase(),
    svgElementId: toText(pickFirst(unidad.svgElementId, unidad.svgId, unidad.elementoSvgId), codigoUnidad ? `unidad-${codigoUnidad}` : ''),
  };
};

export const listarUnidadesPorDesarrollo = async (desarrolloId, options = {}) => {
  const data = await getJson(`/api/desarrollos/${desarrolloId}/unidades`, options);
  return normalizeList(data).map(adaptUnidad).filter((unidad) => unidad.svgElementId);
};
