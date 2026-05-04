import { getJson, requestFormData, requestJson, resolveApiAssetUrl } from './apiClient';

const normalizeList = (value) => {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
};

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toBool = (value, fallback = true) =>
  value === undefined || value === null ? fallback : value === true || value === 'true';

const toText = (value, fallback = '') => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text || fallback;
};

const adaptHotspot = (hotspot = {}) => {
  const escenaDestinoId = pickFirst(hotspot.escenaDestinoId, hotspot.sceneId, hotspot.destinoEscenaId);
  const tipo = toText(pickFirst(hotspot.tipo, hotspot.type), escenaDestinoId ? 'LINK_ESCENA' : 'INFO').toUpperCase();

  return {
    id: String(pickFirst(hotspot.hotspotId, hotspot.id, hotspot.Id, Math.random())),
    tipo: tipo === 'NAVEGACION' || tipo === 'SCENE' ? 'LINK_ESCENA' : tipo,
    pitch: toNumberOrNull(pickFirst(hotspot.pitch, hotspot.pitchHotspot, hotspot.latitud)) ?? 0,
    yaw: toNumberOrNull(pickFirst(hotspot.yaw, hotspot.yawHotspot, hotspot.longitud)) ?? 0,
    texto: toText(pickFirst(hotspot.texto, hotspot.etiqueta, hotspot.nombre, hotspot.descripcion), 'Informacion'),
    etiqueta: toText(pickFirst(hotspot.etiqueta, hotspot.texto, hotspot.nombre, hotspot.descripcion), 'Informacion'),
    icono: toText(pickFirst(hotspot.icono, hotspot.icon)),
    activo: toBool(pickFirst(hotspot.activo, hotspot.esActivo), true),
    escenaDestinoId: escenaDestinoId ? String(escenaDestinoId) : null,
  };
};

const adaptEscena = (escena = {}) => {
  const urlImagen360 = toText(pickFirst(
    escena.urlImagen360,
    escena.imagen360Url,
    escena.urlImagen,
    escena.panorama
  ));

  return {
    id: String(pickFirst(escena.escenaId, escena.id, escena.Id, '')),
    nombre: toText(pickFirst(escena.nombre, escena.titulo, escena.descripcion), 'Escena 360'),
    urlImagen360Original: urlImagen360,
    urlImagen360: resolveApiAssetUrl(urlImagen360),
    orden: toNumberOrNull(escena.orden) ?? 0,
    pitchInicial: toNumberOrNull(escena.pitchInicial) ?? 0,
    yawInicial: toNumberOrNull(escena.yawInicial) ?? 0,
    hfovInicial: toNumberOrNull(escena.hfovInicial) ?? 110,
    esEscenaInicial: toBool(escena.esEscenaInicial, false),
    activo: toBool(pickFirst(escena.activo, escena.esActivo), true),
    hotspots: normalizeList(pickFirst(escena.hotspots, escena.hotSpots, escena.puntosInteres))
      .map(adaptHotspot)
      .filter((hotspot) => hotspot.activo !== false),
  };
};

const adaptTour = (payload) => {
  const source = pickFirst(payload?.tour, payload);
  if (!source) return null;

  const escenas = normalizeList(pickFirst(payload?.escenas, source.escenas))
    .map(adaptEscena)
    .filter((escena) => escena.id && escena.urlImagen360 && escena.activo !== false)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

  const tourId = pickFirst(source.tourId, source.id, source.Id);
  if (!tourId && escenas.length === 0) return null;

  const inicial = escenas.find((escena) => escena.esEscenaInicial) || escenas[0] || null;

  return {
    id: String(tourId || ''),
    titulo: toText(pickFirst(source.titulo, source.nombre), 'Tour 360'),
    nombre: toText(pickFirst(source.nombre, source.titulo), 'Tour 360'),
    descripcion: toText(source.descripcion),
    activo: toBool(pickFirst(source.activo, source.esActivo), true),
    escenaInicialId: inicial?.id || '',
    escenas,
  };
};

const buildTourPayload = (payload = {}) => ({
  titulo: toText(payload.titulo || payload.nombre, 'Tour 360'),
  nombre: toText(payload.nombre || payload.titulo, 'Tour 360'),
  descripcion: toText(payload.descripcion),
  activo: payload.activo !== false,
});

const buildEscenaPayload = (payload = {}) => ({
  nombre: toText(payload.nombre, 'Escena 360'),
  urlImagen360: toText(payload.urlImagen360 || payload.urlImagen360Original),
  orden: toNumberOrNull(payload.orden) ?? 0,
  pitchInicial: toNumberOrNull(payload.pitchInicial) ?? 0,
  yawInicial: toNumberOrNull(payload.yawInicial) ?? 0,
  hfovInicial: toNumberOrNull(payload.hfovInicial) ?? 110,
  esEscenaInicial: payload.esEscenaInicial === true || payload.esEscenaInicial === 'true',
  activo: payload.activo !== false,
});

const buildHotspotPayload = (payload = {}) => {
  const tipo = toText(payload.tipo, 'INFO').toUpperCase();
  const esLink = tipo === 'LINK_ESCENA' || tipo === 'NAVEGACION' || tipo === 'SCENE';

  return {
    tipo: esLink ? 'LINK_ESCENA' : 'INFO',
    etiqueta: toText(payload.etiqueta || payload.texto),
    texto: toText(payload.texto || payload.etiqueta),
    escenaDestinoId: esLink ? toText(payload.escenaDestinoId) || null : null,
    pitch: toNumberOrNull(payload.pitch) ?? 0,
    yaw: toNumberOrNull(payload.yaw) ?? 0,
    icono: toText(payload.icono),
    activo: payload.activo !== false,
  };
};

export const obtenerTourDesarrollo = async (desarrolloId, options = {}) => {
  try {
    return adaptTour(await getJson(`/api/admin/desarrollos/${desarrolloId}/tour-360`, options));
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
};

export const guardarTourDesarrollo = (desarrolloId, payload) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/tour-360`, { method: 'POST', body: buildTourPayload(payload) });

export const obtenerTourModelo = async (modeloId, options = {}) => {
  try {
    return adaptTour(await getJson(`/api/admin/desarrollos/modelos/${modeloId}/tour-360`, options));
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
};

export const guardarTourModelo = (modeloId, payload) =>
  requestJson(`/api/admin/desarrollos/modelos/${modeloId}/tour-360`, { method: 'POST', body: buildTourPayload(payload) });

export const listarEscenas = async (tourId, options = {}) =>
  normalizeList(await getJson(`/api/admin/tours-360/${tourId}/escenas`, options)).map(adaptEscena);

export const crearEscena = (tourId, payload) =>
  requestJson(`/api/admin/tours-360/${tourId}/escenas`, { method: 'POST', body: buildEscenaPayload(payload) });

export const actualizarEscena = (escenaId, payload) =>
  requestJson(`/api/admin/tours-360/escenas/${escenaId}`, { method: 'PUT', body: buildEscenaPayload(payload) });

export const eliminarEscena = (escenaId) =>
  requestJson(`/api/admin/tours-360/escenas/${escenaId}`, { method: 'DELETE' });

export const listarHotspots = async (escenaId, options = {}) =>
  normalizeList(await getJson(`/api/admin/tours-360/escenas/${escenaId}/hotspots`, options)).map(adaptHotspot);

export const crearHotspot = (escenaId, payload) =>
  requestJson(`/api/admin/tours-360/escenas/${escenaId}/hotspots`, { method: 'POST', body: buildHotspotPayload(payload) });

export const actualizarHotspot = (hotspotId, payload) =>
  requestJson(`/api/admin/tours-360/hotspots/${hotspotId}`, { method: 'PUT', body: buildHotspotPayload(payload) });

export const eliminarHotspot = (hotspotId) =>
  requestJson(`/api/admin/tours-360/hotspots/${hotspotId}`, { method: 'DELETE' });

export const subirImagenEscena = (file) => {
  const body = new FormData();
  body.append('file', file);
  return requestFormData('/api/admin/tours-360/upload-escena', { method: 'POST', body });
};

export const obtenerTourPublicoDesarrollo = async (desarrolloId, options = {}) => {
  try {
    return adaptTour(await getJson(`/api/desarrollos/${desarrolloId}/tour-360`, options));
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
};

export const obtenerTourPublicoModelo = async (modeloId, options = {}) => {
  try {
    return adaptTour(await getJson(`/api/desarrollos/modelos/${modeloId}/tour-360`, options));
  } catch (err) {
    if (err.status === 404) return null;
    throw err;
  }
};
