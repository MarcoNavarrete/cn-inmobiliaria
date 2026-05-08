import { getJson } from './apiClient';

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

  return {
    unidadId: toText(pickFirst(unidad.unidadId, unidad.id, unidad.Id)),
    codigoUnidad,
    manzana: toText(pickFirst(unidad.manzana, unidad.manzanaNombre, unidad.etapa)),
    modeloId: toText(pickFirst(unidad.modeloId, unidad.desarrolloModeloId)),
    modeloNombre: toText(pickFirst(unidad.modeloNombre, unidad.modelo, unidad.nombreModelo), 'Modelo por confirmar'),
    precio: toNumberOrNull(pickFirst(unidad.precio, unidad.precioVenta, unidad.precioDesde)),
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
