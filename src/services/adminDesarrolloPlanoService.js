import { getJson, requestFormData, requestJson, resolveApiAssetUrl } from './apiClient';

const toText = (value, fallback = '') => {
  const text = value === null || value === undefined ? '' : String(value).trim();
  return text || fallback;
};

const adaptPlano = (item = {}) => ({
  id: toText(item.planoId || item.id),
  nombre: toText(item.nombre),
  svgUrl: toText(item.svgUrl),
  svgUrlResuelta: resolveApiAssetUrl(toText(item.svgUrl)),
  imagenFondoUrl: toText(item.imagenFondoUrl),
  imagenFondoUrlResuelta: resolveApiAssetUrl(toText(item.imagenFondoUrl)),
  activo: item.activo !== false,
});

const buildPayload = (payload = {}) => ({
  nombre: toText(payload.nombre),
  svgUrl: toText(payload.svgUrl),
  imagenFondoUrl: toText(payload.imagenFondoUrl) || null,
  activo: payload.activo !== false,
});

export const obtenerPlanoAdmin = async (desarrolloId, options = {}) => {
  const data = await getJson(`/api/admin/desarrollos/${desarrolloId}/plano`, options);
  return data ? adaptPlano(data) : null;
};

export const guardarPlanoAdmin = (desarrolloId, payload) =>
  requestJson(`/api/admin/desarrollos/${desarrolloId}/plano`, {
    method: 'POST',
    body: buildPayload(payload),
  });

export const subirPlanoSvgAdmin = (desarrolloId, file) => {
  const body = new FormData();
  body.append('file', file);

  return requestFormData(`/api/admin/desarrollos/${desarrolloId}/plano/upload-svg`, {
    method: 'POST',
    body,
  });
};

export const obtenerPlanoPublico = async (desarrolloId, options = {}) => {
  const data = await getJson(`/api/desarrollos/${desarrolloId}/plano`, options);
  return data ? adaptPlano(data) : null;
};
