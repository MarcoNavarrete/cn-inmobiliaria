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

const BASE_URL = '/api/proyectos-inmobiliarios';

const toNumberValue = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const buildUbicacion = (item = {}) =>
  [
    item.zona,
    item.direccion,
    item.coloniaNombre,
    item.localidadNombre,
    item.municipioNombre,
    item.poblacionNombre,
    item.estadoNombre,
  ].filter(Boolean).join(', ') || toText(pickFirst(item.ubicacionTexto, item.ubicacion), 'Ubicacion por confirmar');

export const adaptProyectoPublico = (item = {}) => {
  const id = toText(pickFirst(item.proyectoId, item.id, item.Id));
  const precioDesde = pickFirst(item.precioDesde, item.precioMinimo, item.precio);

  return {
    id,
    proyectoId: id,
    empresaId: toText(pickFirst(item.empresaId, item.idEmpresa)),
    empresaNombre: toText(pickFirst(item.empresaNombre, item.empresa, item.nombreEmpresa), 'CN Inmobiliaria'),
    nombre: toText(item.nombre, 'Proyecto inmobiliario'),
    slug: toText(item.slug),
    resumen: toText(item.resumen),
    descripcion: toText(item.descripcion),
    tipoProyecto: toText(pickFirst(item.tipoProyecto, item.tipo), 'PROYECTO').toUpperCase(),
    ubicacionTexto: toText(pickFirst(item.ubicacionTexto, item.ubicacion)),
    ubicacion: buildUbicacion(item),
    direccion: toText(item.direccion),
    precioDesde,
    precioDesdeTexto: formatCurrency(precioDesde),
    superficieDesdeM2: pickFirst(item.superficieDesdeM2, item.superficieDesde, item.m2Desde),
    superficieHastaM2: pickFirst(item.superficieHastaM2, item.superficieHasta, item.m2Hasta),
    totalUnidades: pickFirst(item.totalUnidades, item.unidadesTotales, item.numeroUnidades, 0),
    imagenPrincipalUrl: toText(pickFirst(item.imagenPrincipalUrl, item.imagenPrincipal, item.imagenUrl)),
    logoUrl: toText(pickFirst(item.logoFinalUrl, item.logoUrl, item.logoProyectoUrl, item.logoEmpresaUrl)),
    nombreContacto: toText(item.nombreContacto),
    telefonoContacto: toText(item.telefonoContacto),
    whatsappContacto: toText(item.whatsappContacto),
    correoContacto: toText(pickFirst(item.correoContacto, item.emailContacto)),
    fechaCreacion: formatDate(pickFirst(item.fechaCreacion, item.createdAt, item.fechaAlta)),
  };
};

export const adaptModeloPublico = (item = {}) => {
  const id = toText(pickFirst(item.modeloId, item.proyectoModeloId, item.id, item.Id));
  const precioDesde = pickFirst(item.precioDesde, item.precio, item.precioMinimo);

  return {
    id,
    modeloId: id,
    nombre: toText(item.nombre, 'Modelo'),
    slug: toText(item.slug),
    descripcion: toText(item.descripcion),
    recamaras: pickFirst(item.recamaras, item.habitaciones, '-'),
    banos: pickFirst(item.banos, item.banosCompletos, '-'),
    mediosBanos: pickFirst(item.mediosBanos, item.medioBano, 0),
    estacionamientos: pickFirst(item.estacionamientos, item.cajones, '-'),
    niveles: pickFirst(item.niveles, item.pisos, '-'),
    superficieTerrenoM2: pickFirst(item.superficieTerrenoM2, item.terrenoM2, item.m2Terreno),
    superficieConstruccionM2: pickFirst(item.superficieConstruccionM2, item.construccionM2, item.m2Construccion),
    precioDesde,
    precioDesdeTexto: formatCurrency(precioDesde),
    imagenPrincipalUrl: toText(pickFirst(item.imagenPrincipalUrl, item.imagenPrincipal, item.imagenUrl)),
    tour360Url: toText(pickFirst(item.tour360Url, item.tourUrl)),
    orden: toNumberValue(pickFirst(item.orden, item.order, item.posicion)) ?? 0,
    activo: toBool(pickFirst(item.activo, item.esActivo), true),
  };
};

export const adaptUnidadPublica = (item = {}) => {
  const id = toText(pickFirst(item.unidadId, item.proyectoUnidadId, item.id, item.Id));
  const precioTotal = pickFirst(item.precioTotal, item.precio, item.precioVenta);

  return {
    id,
    unidadId: id,
    modeloId: toText(pickFirst(item.modeloId, item.proyectoModeloId)),
    modeloNombre: toText(pickFirst(item.modeloNombre, item.modelo, item.nombreModelo), 'Sin modelo'),
    codigo: toText(pickFirst(item.codigo, item.codigoUnidad, item.clave), 'Sin codigo'),
    nombre: toText(item.nombre),
    tipoUnidad: toText(pickFirst(item.tipoUnidad, item.tipo), 'LOTE').toUpperCase(),
    manzana: toText(pickFirst(item.manzana, item.manzanaNombre)),
    lote: toText(pickFirst(item.lote, item.loteNumero, item.numeroLote)),
    torre: toText(item.torre),
    nivel: toText(item.nivel),
    numeroInterior: toText(pickFirst(item.numeroInterior, item.interior)),
    superficieTerrenoM2: pickFirst(item.superficieTerrenoM2, item.terrenoM2, item.m2Terreno),
    superficieConstruccionM2: pickFirst(item.superficieConstruccionM2, item.construccionM2, item.m2Construccion),
    precioTotal,
    precioTotalTexto: formatCurrency(precioTotal),
    estatus: toText(pickFirst(item.estatus, item.status, item.estado), 'DISPONIBLE').toUpperCase(),
    svgElementId: toText(pickFirst(item.svgElementId, item.svgId, item.elementoSvgId)),
    visiblePublico: item.visiblePublico !== false && item.mostrarEnPublico !== false,
  };
};

export const adaptPlanoPublico = (item = {}) => {
  if (!item) return null;

  return {
    id: pickFirst(item.id, item.planoId, item.proyectoPlanoId),
    nombre: toText(item.nombre, 'Plano general'),
    svgUrl: toText(pickFirst(item.svgUrl, item.urlSvg)),
    imagenFondoUrl: toText(pickFirst(item.imagenFondoUrl, item.backgroundUrl)),
    descripcion: toText(item.descripcion),
    activo: item.activo !== false,
  };
};

export const adaptImagenPublica = (item = {}) => ({
  id: pickFirst(item.id, item.imagenId, item.proyectoImagenId),
  tipoImagen: toText(pickFirst(item.tipoImagen, item.tipo, item.categoria), 'GALERIA').toUpperCase(),
  url: toText(pickFirst(item.url, item.imagenUrl, item.imageUrl, item.src)),
  titulo: toText(pickFirst(item.titulo, item.title, item.nombre)),
  descripcion: toText(pickFirst(item.descripcion, item.description)),
  orden: toNumberValue(pickFirst(item.orden, item.order, item.posicion)) ?? 0,
});

export const listarProyectosPublicos = (filtros = {}) => {
  const { signal, ...query } = filtros;
  return getJson(BASE_URL, { query: cleanQuery(query), signal })
    .then((data) => normalizeList(data).map(adaptProyectoPublico));
};

export const obtenerProyectoPublico = (slug, options = {}) =>
  getJson(`${BASE_URL}/${slug}`, options).then(adaptProyectoPublico);

export const listarModelosPublicos = (slug, options = {}) =>
  getJson(`${BASE_URL}/${slug}/modelos`, options).then((data) =>
    normalizeList(data).map(adaptModeloPublico)
  );

export const listarUnidadesPublicas = (slug, options = {}) =>
  getJson(`${BASE_URL}/${slug}/unidades`, options).then((data) =>
    normalizeList(data).map(adaptUnidadPublica).filter((unidad) => unidad.visiblePublico)
  );

export const obtenerPlanoPublico = (slug, options = {}) =>
  getJson(`${BASE_URL}/${slug}/plano`, options).then(adaptPlanoPublico);

export const listarImagenesPublicas = (slug, options = {}) =>
  getJson(`${BASE_URL}/${slug}/imagenes`, options).then((data) =>
    normalizeList(data).map(adaptImagenPublica).sort((a, b) => Number(a.orden || 0) - Number(b.orden || 0))
  );

export const crearProspectoPublico = (slug, data) =>
  requestJson(`${BASE_URL}/${slug}/prospectos`, { method: 'POST', body: data });
