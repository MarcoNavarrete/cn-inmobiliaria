import { getJson, requestJson } from './apiClient';
import {
  cleanQuery,
  formatCurrency,
  normalizeList,
  pickFirst,
  toBool,
  toText,
} from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';

export const adaptProyectoModelo = (item = {}) => ({
  id: toText(pickFirst(item.modeloId, item.proyectoModeloId, item.id, item.Id)),
  modeloId: toText(pickFirst(item.modeloId, item.proyectoModeloId, item.id, item.Id)),
  nombre: toText(pickFirst(item.nombre, item.nombreModelo), 'Sin modelo'),
  slug: toText(item.slug),
  descripcion: toText(item.descripcion),
  recamaras: pickFirst(item.recamaras, item.habitaciones),
  banos: pickFirst(item.banos, item.banosCompletos),
  mediosBanos: pickFirst(item.mediosBanos, item.medioBano, item.mediosBanosCount),
  estacionamientos: pickFirst(item.estacionamientos, item.cajonesEstacionamiento),
  niveles: pickFirst(item.niveles, item.pisos),
  superficieTerrenoM2: pickFirst(item.superficieTerrenoM2, item.terrenoM2, item.m2Terreno),
  superficieConstruccionM2: pickFirst(item.superficieConstruccionM2, item.construccionM2, item.m2Construccion),
  precioDesde: pickFirst(item.precioDesde, item.precio, item.precioBase),
  precioDesdeTexto: formatCurrency(pickFirst(item.precioDesde, item.precio, item.precioBase)),
  imagenPrincipalUrl: toText(pickFirst(item.imagenPrincipalUrl, item.imagenPrincipal, item.imagenUrl)),
  tour360Url: toText(pickFirst(item.tour360Url, item.urlTour360, item.tourUrl)),
  orden: pickFirst(item.orden, 0),
  destacado: toBool(item.destacado),
  activo: item.activo !== false,
});

export const listarModelos = (proyectoId, { soloActivos = true, ...options } = {}) =>
  getJson(`${BASE_URL}/${proyectoId}/modelos`, {
    ...options,
    query: cleanQuery({ soloActivos }),
  }).then((data) => normalizeList(data).map(adaptProyectoModelo));

export const obtenerModelo = (modeloId, options = {}) =>
  getJson(`${BASE_URL}/modelos/${modeloId}`, options).then(adaptProyectoModelo);

export const crearModelo = (proyectoId, data) =>
  requestJson(`${BASE_URL}/${proyectoId}/modelos`, { method: 'POST', body: data });

export const actualizarModelo = (modeloId, data) =>
  requestJson(`${BASE_URL}/modelos/${modeloId}`, { method: 'PUT', body: data });

export const setModeloActivo = (modeloId, activo) =>
  requestJson(`${BASE_URL}/modelos/${modeloId}/activo`, { method: 'PATCH', body: { activo } });
