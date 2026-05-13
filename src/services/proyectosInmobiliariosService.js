import { getJson, requestJson } from './apiClient';
import {
  cleanQuery,
  formatCurrency,
  formatDate,
  normalizeList,
  pickFirst,
  toBool,
  toText,
} from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';

const buildUbicacion = (item = {}) =>
  [
    item.zona,
    item.direccion,
    item.coloniaNombre,
    item.localidadNombre,
    item.municipioNombre,
    item.poblacionNombre,
    item.estadoNombre,
  ].filter(Boolean).join(', ') || toText(item.ubicacion, 'Sin ubicacion');

export const adaptProyectoInmobiliario = (item = {}) => {
  const id = toText(pickFirst(item.proyectoId, item.id, item.Id));
  const precioDesde = pickFirst(item.precioDesde, item.precioMinimo, item.precio);
  const estatusPublicacion = toText(
    pickFirst(item.estatusPublicacion, item.estatus, item.status),
    'BORRADOR'
  ).toUpperCase();

  return {
    id,
    proyectoId: id,
    empresaId: toText(item.empresaId),
    empresaNombre: toText(pickFirst(item.empresaNombre, item.empresa, item.nombreEmpresa), 'Sin empresa'),
    nombre: toText(item.nombre, 'Sin nombre'),
    slug: toText(item.slug),
    tipoProyecto: toText(pickFirst(item.tipoProyecto, item.tipo), 'SIN_TIPO').toUpperCase(),
    ubicacion: buildUbicacion(item),
    precioDesde,
    precioDesdeTexto: formatCurrency(precioDesde),
    totalUnidades: pickFirst(item.totalUnidades, item.unidadesTotales, item.numeroUnidades, 0),
    estatusPublicacion,
    mostrarEnPublico: toBool(pickFirst(item.mostrarEnPublico, item.publico, item.visiblePublico)),
    activo: item.activo !== false,
    fechaCreacion: formatDate(pickFirst(item.fechaCreacion, item.createdAt, item.creadoEn)),
  };
};

export const listarProyectos = async ({
  empresaId,
  tipoProyecto,
  estatusPublicacion,
  soloActivos = true,
  texto,
  ...options
} = {}) =>
  normalizeList(await getJson(BASE_URL, {
    ...options,
    query: cleanQuery({
      empresaId,
      tipoProyecto,
      estatusPublicacion,
      soloActivos,
      texto,
    }),
  })).map(adaptProyectoInmobiliario);

export const obtenerProyecto = async (proyectoId, options = {}) =>
  adaptProyectoInmobiliario(await getJson(`${BASE_URL}/${proyectoId}`, options));

export const crearProyecto = (data) =>
  requestJson(BASE_URL, { method: 'POST', body: data });

export const actualizarProyecto = (proyectoId, data) =>
  requestJson(`${BASE_URL}/${proyectoId}`, { method: 'PUT', body: data });

export const setProyectoActivo = (proyectoId, activo) =>
  requestJson(`${BASE_URL}/${proyectoId}/activo`, {
    method: 'PATCH',
    body: { activo },
  });

export const setProyectoPublicacion = (proyectoId, { estatusPublicacion, mostrarEnPublico }) =>
  requestJson(`${BASE_URL}/${proyectoId}/publicacion`, {
    method: 'PATCH',
    body: { estatusPublicacion, mostrarEnPublico },
  });
