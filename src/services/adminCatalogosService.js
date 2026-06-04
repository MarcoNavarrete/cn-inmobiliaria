import { getJson, requestJson } from './apiClient';

const CATALOGOS = {
  'tipos-precio-inmobiliario': {
    key: 'tipos-precio-inmobiliario',
    nombre: 'Tipos de precio inmobiliario',
    endpoint: '/api/admin/catalogos/tipos-precio-inmobiliario',
  },
};

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  if (Array.isArray(value?.catalogos)) return value.catalogos;
  return [];
};

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const toText = (value, fallback = '') => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text || fallback;
};

const toNumber = (value, fallback = 0) => {
  const number = Number(value);
  return Number.isNaN(number) ? fallback : number;
};

const getCatalogoConfig = (catalogoKey) => {
  const config = CATALOGOS[catalogoKey];
  if (!config) {
    throw new Error(`Catálogo no soportado: ${catalogoKey}`);
  }
  return config;
};

export const adaptCatalogoAdministrable = (item = {}) => {
  const key = toText(pickFirst(item.key, item.clave, item.codigo, item.nombreTecnico, item.catalogoKey));
  const config = CATALOGOS[key] || null;

  return {
    key: key || config?.key || '',
    nombre: toText(pickFirst(item.nombre, item.titulo, item.descripcion), config?.nombre || key),
    descripcion: toText(pickFirst(item.descripcion, item.detalle)),
    activo: item.activo !== false,
    orden: toNumber(item.orden, 0),
  };
};

export const adaptCatalogoItem = (item = {}) => {
  const id = toText(pickFirst(
    item.id,
    item.tipoPrecioId,
    item.tipoPrecioInmobiliarioId,
    item.catalogoId,
    item.Id
  ));

  return {
    id,
    codigo: toText(pickFirst(item.codigo, item.clave, item.tipoPrecioCodigo)).toUpperCase(),
    nombre: toText(pickFirst(item.nombre, item.tipoPrecioNombre), 'Sin nombre'),
    descripcion: toText(pickFirst(item.descripcion, item.detalle)),
    orden: toNumber(pickFirst(item.orden, item.sortOrder), 1),
    activo: item.activo !== false,
    raw: item,
  };
};

export const buildCatalogoPayload = (form = {}) => ({
  codigo: toText(form.codigo).toUpperCase(),
  nombre: toText(form.nombre),
  descripcion: toText(form.descripcion) || null,
  orden: toNumber(form.orden, 1),
  activo: form.activo === true,
});

export const listarCatalogosAdministrables = async (options = {}) => {
  const data = await getJson('/api/admin/catalogos-administrables', options);
  const catalogos = normalizeList(data)
    .map(adaptCatalogoAdministrable)
    .filter((item) => item.key && CATALOGOS[item.key]);

  return catalogos.length ? catalogos : Object.values(CATALOGOS);
};

export const listarCatalogo = async (catalogoKey, options = {}) => {
  const config = getCatalogoConfig(catalogoKey);
  const data = await getJson(config.endpoint, options);
  return normalizeList(data)
    .map(adaptCatalogoItem)
    .filter((item) => item.id || item.codigo)
    .sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0) || a.nombre.localeCompare(b.nombre, 'es-MX'));
};

export const crearCatalogoItem = (catalogoKey, payload) => {
  const config = getCatalogoConfig(catalogoKey);
  return requestJson(config.endpoint, {
    method: 'POST',
    body: buildCatalogoPayload(payload),
  });
};

export const actualizarCatalogoItem = (catalogoKey, id, payload) => {
  const config = getCatalogoConfig(catalogoKey);
  return requestJson(`${config.endpoint}/${id}`, {
    method: 'PUT',
    body: buildCatalogoPayload(payload),
  });
};

export const desactivarCatalogoItem = (catalogoKey, id) => {
  const config = getCatalogoConfig(catalogoKey);
  return requestJson(`${config.endpoint}/${id}`, {
    method: 'DELETE',
  });
};
