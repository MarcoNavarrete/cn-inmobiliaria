import { getJson, requestJson, resolveApiAssetUrl } from './apiClient';

const normalizeList = (value) => {
  if (Array.isArray(value)) {
    return value;
  }

  if (Array.isArray(value?.items)) {
    return value.items;
  }

  if (Array.isArray(value?.data)) {
    return value.data;
  }

  return [];
};

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const toText = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
};

const toNumberOrZero = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? 0 : number;
};

const getImageUrl = (value) => {
  if (!value) {
    return '';
  }

  if (typeof value === 'string') {
    return resolveApiAssetUrl(value);
  }

  return resolveApiAssetUrl(pickFirst(
    value.url,
    value.urlImagen,
    value.imagenUrl,
    value.imagenPrincipalUrl,
    value.ruta,
    value.path
  ));
};

const normalizeImages = (value) =>
  normalizeList(value)
    .filter((imagen) => typeof imagen === 'string' || imagen?.activo !== false)
    .sort((a, b) => {
      if (typeof a === 'string' || typeof b === 'string') return 0;
      return Number(a?.orden ?? 0) - Number(b?.orden ?? 0);
    })
    .map(getImageUrl)
    .filter(Boolean);

const normalizeAmenidades = (value) =>
  normalizeList(value)
    .map((amenidad) =>
      typeof amenidad === 'string'
        ? amenidad
        : toText(pickFirst(amenidad.nombre, amenidad.descripcion, amenidad.amenidad))
    )
    .filter(Boolean);

const buildUbicacion = (desarrollo) =>
  [
    desarrollo.zona,
    desarrollo.coloniaNombre,
    desarrollo.municipioNombre,
    desarrollo.estadoNombre,
  ]
    .filter(Boolean)
    .join(', ');

const adaptModelo = (modelo) => {
  const imagenes = normalizeImages(modelo?.imagenes);
  const imagenPrincipalUrl = toText(modelo?.imagenPrincipalUrl);
  const imagenPrincipal = getImageUrl(pickFirst(
    modelo?.imagenPrincipalUrl,
    modelo?.imagenPrincipal,
    modelo?.portadaUrl
  ));

  return {
    id: toText(pickFirst(modelo?.modeloId, modelo?.desarrolloModeloId, modelo?.id)),
    nombre: toText(modelo?.nombre, 'Modelo residencial'),
    precio: toNumberOrZero(pickFirst(modelo?.precio, modelo?.precioDesde)),
    recamaras: pickFirst(modelo?.recamaras, modelo?.habitaciones, 0),
    banos: pickFirst(modelo?.banos, modelo?.banios, 0),
    medioBano: pickFirst(modelo?.medioBano, modelo?.mediosBanos, modelo?.medioBanio, 0),
    estacionamientos: pickFirst(modelo?.estacionamientos, modelo?.cocheras, 0),
    construccionM2: pickFirst(modelo?.construccionM2, modelo?.metrosConstruccion, 0),
    terrenoM2: pickFirst(modelo?.terrenoM2, modelo?.metrosTerreno, 0),
    descripcion: toText(modelo?.descripcion, 'Modelo disponible dentro del desarrollo.'),
    imagenPrincipalUrl,
    imagenPrincipal,
    imagenes,
    disponible: pickFirst(modelo?.disponible, modelo?.activo, true) !== false,
  };
};

const adaptDesarrollo = (desarrollo) => {
  const imagenPrincipal = getImageUrl(pickFirst(
    desarrollo?.imagenPrincipalUrl,
    desarrollo?.imagenPrincipal,
    desarrollo?.portadaUrl
  ));
  const galeria = normalizeImages(desarrollo?.imagenes);

  return {
    id: toText(pickFirst(desarrollo?.desarrolloId, desarrollo?.id)),
    nombre: toText(desarrollo?.nombre, 'Desarrollo inmobiliario'),
    slug: toText(pickFirst(desarrollo?.slug, desarrollo?.id, desarrollo?.desarrolloId)),
    descripcion: toText(desarrollo?.descripcion, 'Conoce disponibilidad, amenidades y modelos de este desarrollo.'),
    estadoNombre: toText(desarrollo?.estadoNombre),
    municipioNombre: toText(desarrollo?.municipioNombre),
    coloniaNombre: toText(desarrollo?.coloniaNombre),
    zona: toText(desarrollo?.zona),
    ubicacion: buildUbicacion(desarrollo),
    precioDesde: toNumberOrZero(desarrollo?.precioDesde),
    imagenPrincipal,
    telefonoContacto: toText(desarrollo?.telefonoContacto),
    nombreContacto: toText(desarrollo?.nombreContacto),
    galeria: galeria.length > 0 ? galeria : [imagenPrincipal].filter(Boolean),
    destacado: desarrollo?.destacado === true,
    amenidades: normalizeAmenidades(desarrollo?.amenidades),
    financiamiento: normalizeAmenidades(desarrollo?.financiamiento),
    modelos: normalizeList(desarrollo?.modelos).map(adaptModelo),
  };
};

export const listarDesarrollos = async (options = {}) => {
  const data = await getJson('/api/desarrollos', options);
  return normalizeList(data).map(adaptDesarrollo).filter((desarrollo) => desarrollo.slug);
};

export const obtenerDesarrolloPorSlug = async (slug, options = {}) => {
  const data = await getJson(`/api/desarrollos/${slug}`, options);
  return data ? adaptDesarrollo(data) : null;
};

export const crearProspectoDesarrollo = (desarrolloId, payload) =>
  requestJson(`/api/desarrollos/${desarrolloId}/prospectos`, {
    method: 'POST',
    body: {
      modeloId: payload.modeloId || null,
      nombre: toText(payload.nombre),
      telefono: toText(payload.telefono),
      email: toText(payload.email) || null,
      mensaje: toText(payload.mensaje),
      origen: toText(payload.origen),
    },
  });
