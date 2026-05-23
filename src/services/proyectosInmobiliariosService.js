import { getJson, requestFormData, requestJson } from './apiClient';
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

const adaptProyectoResponse = (response) =>
  adaptProyectoInmobiliario(
    response?.proyecto ||
    response?.data?.proyecto ||
    response?.data ||
    response
  );

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
    resumen: toText(item.resumen),
    descripcion: toText(item.descripcion),
    tipoProyecto: toText(pickFirst(item.tipoProyecto, item.tipo), 'SIN_TIPO').toUpperCase(),
    ubicacionTexto: toText(pickFirst(item.ubicacionTexto, item.ubicacion)),
    direccion: toText(item.direccion),
    estadoId: toText(pickFirst(item.estadoId, item.EstadoId)),
    poblacionId: toText(pickFirst(item.poblacionId, item.PoblacionId, item.municipioId)),
    localidadId: toText(pickFirst(item.localidadId, item.LocalidadId)),
    estadoNombre: toText(pickFirst(item.estadoNombre, item.EstadoNombre, item.nomEstado)),
    poblacionNombre: toText(pickFirst(item.poblacionNombre, item.municipioNombre, item.PoblacionNombre, item.nomPoblacion)),
    localidadNombre: toText(pickFirst(item.localidadNombre, item.coloniaNombre, item.LocalidadNombre, item.nomLocalidad)),
    latitud: pickFirst(item.latitud, item.latitude),
    longitud: pickFirst(item.longitud, item.longitude),
    ubicacion: buildUbicacion(item),
    precioDesde,
    precioDesdeTexto: formatCurrency(precioDesde),
    superficieDesdeM2: pickFirst(item.superficieDesdeM2, item.superficieDesde, item.m2Desde),
    superficieHastaM2: pickFirst(item.superficieHastaM2, item.superficieHasta, item.m2Hasta),
    totalUnidades: pickFirst(item.totalUnidades, item.unidadesTotales, item.numeroUnidades, 0),
    imagenPrincipalUrl: toText(pickFirst(item.imagenPrincipalUrl, item.imagenPrincipal, item.imagenUrl)),
    logoUrl: toText(pickFirst(item.logoUrl, item.logoProyectoUrl)),
    usarLogoEmpresa: item.usarLogoEmpresa !== false,
    nombreContacto: toText(item.nombreContacto),
    telefonoContacto: toText(item.telefonoContacto),
    whatsappContacto: toText(item.whatsappContacto),
    correoContacto: toText(pickFirst(item.correoContacto, item.emailContacto)),
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

const subirArchivoProyecto = (proyectoId, ruta, file) => {
  const body = new FormData();
  body.append('file', file);

  return requestFormData(`${BASE_URL}/${proyectoId}${ruta}`, {
    method: 'POST',
    body,
  }).then(adaptProyectoResponse);
};

export const subirImagenPrincipal = (proyectoId, file) =>
  subirArchivoProyecto(proyectoId, '/imagen-principal/upload', file);

export const subirLogoProyecto = (proyectoId, file) =>
  subirArchivoProyecto(proyectoId, '/logo/upload', file);
