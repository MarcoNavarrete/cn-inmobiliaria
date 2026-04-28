import { getJson, requestFormData, requestJson, resolveApiAssetUrl } from './apiClient';

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

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

const pickFirstString = (...values) =>
  values.find((value) => typeof value === 'string' && value.trim() !== '');

const adaptHotspot = (hotspot) => {
  if (!hotspot) {
    return null;
  }

  const escenaDestinoId = pickFirst(
    hotspot.escenaDestinoId,
    hotspot.sceneId,
    hotspot.destinoEscenaId
  );
  const tipoNormalizado = String(hotspot.tipo || hotspot.type || '').trim().toUpperCase();
  const esNavegacion = escenaDestinoId !== undefined && escenaDestinoId !== null && escenaDestinoId !== '';

  return {
    id: String(pickFirst(hotspot.hotspotId, hotspot.id, crypto.randomUUID?.(), Math.random())),
    tipo: esNavegacion ? 'NAVEGACION' : tipoNormalizado || 'INFO',
    pitch: toNumberOrNull(pickFirst(hotspot.pitch, hotspot.pitchHotspot, hotspot.latitud)),
    yaw: toNumberOrNull(pickFirst(hotspot.yaw, hotspot.yawHotspot, hotspot.longitud)),
    texto:
      pickFirst(hotspot.texto, hotspot.etiqueta, hotspot.nombre, hotspot.titulo, hotspot.descripcion) || '',
    etiqueta:
      pickFirst(hotspot.etiqueta, hotspot.texto, hotspot.nombre, hotspot.titulo, hotspot.descripcion) || '',
    icono: pickFirst(hotspot.icono, hotspot.icon, ''),
    activo: pickFirst(hotspot.activo, hotspot.esActivo, true) !== false,
    escenaDestinoId: esNavegacion ? String(escenaDestinoId) : null,
  };
};

const adaptEscena = (escena) => {
  if (!escena) {
    return null;
  }

  const hotspots = normalizeList(
    pickFirst(escena.hotspots, escena.hotSpots, escena.puntosInteres)
  )
    .map(adaptHotspot)
    .filter((item) => item && item.pitch !== null && item.yaw !== null);

  const urlImagen360 = pickFirstString(
    escena.urlImagen360,
    escena.imagen360Url,
    escena.urlImagen,
    escena.panorama
  );

  if (!urlImagen360) {
    return null;
  }

  return {
    id: String(pickFirst(escena.escenaId, escena.id)),
    nombre: pickFirst(escena.nombre, escena.titulo, escena.descripcion, 'Escena 360'),
    urlImagen360Original: urlImagen360,
    urlImagen360: resolveApiAssetUrl(urlImagen360),
    orden: toNumberOrNull(escena.orden) ?? 0,
    pitchInicial: toNumberOrNull(escena.pitchInicial),
    yawInicial: toNumberOrNull(escena.yawInicial),
    hfovInicial: toNumberOrNull(escena.hfovInicial),
    esEscenaInicial: Boolean(escena.esEscenaInicial),
    activo: pickFirst(escena.activo, escena.esActivo, true) !== false,
    hotspots,
  };
};

const adaptTour = (payload) => {
  const tourSource = pickFirst(payload?.tour, payload);
  const escenasSource = pickFirst(payload?.escenas, tourSource?.escenas);

  const escenas = normalizeList(escenasSource)
    .map(adaptEscena)
    .filter(Boolean);

  if (escenas.length === 0 && !pickFirst(tourSource?.tourId, tourSource?.id)) {
    return null;
  }

  const escenaInicial =
    escenas.find((escena) => escena.esEscenaInicial) ||
    escenas[0] ||
    null;

  return {
    id: String(pickFirst(tourSource?.tourId, tourSource?.id, '')),
    nombre: pickFirst(tourSource?.nombre, tourSource?.titulo, 'Tour 360'),
    titulo: pickFirst(tourSource?.titulo, tourSource?.nombre, 'Tour 360'),
    descripcion: pickFirst(tourSource?.descripcion, ''),
    activo: pickFirst(tourSource?.activo, tourSource?.esActivo, true) !== false,
    inmuebleId: String(pickFirst(tourSource?.inmuebleId, payload?.inmuebleId, '')),
    escenaInicialId: escenaInicial?.id || '',
    escenas: escenas.sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)),
  };
};

const normalizeNumberPayload = (value, fallback = null) => {
  const parsed = toNumberOrNull(value);
  return parsed ?? fallback;
};

const normalizeBooleanPayload = (value) => value === true || value === 'true';

const buildTourPayload = (tour) => ({
  inmuebleId: tour.inmuebleId,
  titulo: tour.titulo || tour.nombre || 'Tour 360',
  nombre: tour.nombre || tour.titulo || 'Tour 360',
  descripcion: tour.descripcion || '',
  activo: normalizeBooleanPayload(tour.activo),
});

const buildEscenaPayload = (escena) => ({
  nombre: escena.nombre || 'Escena 360',
  urlImagen360: escena.urlImagen360 || escena.urlImagen360Original || '',
  orden: normalizeNumberPayload(escena.orden, 0),
  pitchInicial: normalizeNumberPayload(escena.pitchInicial, 0),
  yawInicial: normalizeNumberPayload(escena.yawInicial, 0),
  hfovInicial: normalizeNumberPayload(escena.hfovInicial, 110),
  esEscenaInicial: normalizeBooleanPayload(escena.esEscenaInicial),
  activo: normalizeBooleanPayload(escena.activo),
});

const appendFormValue = (formData, key, value) => {
  if (value !== undefined && value !== null) {
    formData.append(key, value);
  }
};

const buildEscenaUploadFormData = (payload) => {
  const formData = new FormData();

  appendFormValue(formData, 'archivo', payload.archivo);
  appendFormValue(formData, 'nombre', payload.nombre || 'Escena 360');
  appendFormValue(formData, 'orden', normalizeNumberPayload(payload.orden, 0));
  appendFormValue(formData, 'pitchInicial', normalizeNumberPayload(payload.pitchInicial, 0));
  appendFormValue(formData, 'yawInicial', normalizeNumberPayload(payload.yawInicial, 0));
  appendFormValue(formData, 'hfovInicial', normalizeNumberPayload(payload.hfovInicial, 110));
  appendFormValue(formData, 'esEscenaInicial', normalizeBooleanPayload(payload.esEscenaInicial));
  appendFormValue(formData, 'activo', normalizeBooleanPayload(payload.activo));

  return formData;
};

const buildHotspotPayload = (hotspot) => {
  const tipo = String(hotspot.tipo || 'INFO').toUpperCase();
  const esNavegacion = tipo === 'NAVEGACION' || tipo === 'SCENE';

  return {
    tipo: esNavegacion ? 'NAVEGACION' : 'INFO',
    etiqueta: hotspot.etiqueta || hotspot.texto || '',
    texto: hotspot.texto || hotspot.etiqueta || '',
    pitch: normalizeNumberPayload(hotspot.pitch, 0),
    yaw: normalizeNumberPayload(hotspot.yaw, 0),
    icono: hotspot.icono || '',
    escenaDestinoId: esNavegacion ? hotspot.escenaDestinoId || null : null,
    activo: normalizeBooleanPayload(hotspot.activo),
  };
};

export const obtenerTour360PorInmueble = async (inmuebleId, options = {}) => {
  try {
    const data = await getJson(`/api/tours360/inmueble/${inmuebleId}`, options);
    return adaptTour(data);
  } catch (error) {
    if (error.status === 404) {
      return null;
    }

    throw error;
  }
};

export const crearTour360 = async (tour) =>
  requestJson('/api/tours360', {
    method: 'POST',
    body: buildTourPayload(tour),
  });

export const actualizarTour360 = async (tourId, tour) =>
  requestJson(`/api/tours360/${tourId}`, {
    method: 'PUT',
    body: buildTourPayload(tour),
  });

export const crearEscena360 = async (tourId, escena) =>
  requestJson(`/api/tours360/${tourId}/escenas`, {
    method: 'POST',
    body: buildEscenaPayload(escena),
  });

export const subirEscena360 = async (tourId, payload) =>
  requestFormData(`/api/tours360/${tourId}/escenas/upload`, {
    method: 'POST',
    body: buildEscenaUploadFormData(payload),
  });

export const actualizarEscena360 = async (escenaId, escena) =>
  requestJson(`/api/tours360/escenas/${escenaId}`, {
    method: 'PUT',
    body: buildEscenaPayload(escena),
  });

export const eliminarEscena360 = async (escenaId) =>
  requestJson(`/api/tours360/escenas/${escenaId}`, {
    method: 'DELETE',
  });

export const crearHotspot360 = async (escenaId, hotspot) =>
  requestJson(`/api/tours360/escenas/${escenaId}/hotspots`, {
    method: 'POST',
    body: buildHotspotPayload(hotspot),
  });

export const actualizarHotspot360 = async (hotspotId, hotspot) =>
  requestJson(`/api/tours360/hotspots/${hotspotId}`, {
    method: 'PUT',
    body: buildHotspotPayload(hotspot),
  });

export const eliminarHotspot360 = async (hotspotId) =>
  requestJson(`/api/tours360/hotspots/${hotspotId}`, {
    method: 'DELETE',
  });

export const establecerEscenaInicial360 = async (tourId, escenaId) =>
  requestJson(`/api/tours360/${tourId}/escena-inicial/${escenaId}`, {
    method: 'POST',
  });
