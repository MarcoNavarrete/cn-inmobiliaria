import { getJson, requestJson } from './apiClient';

const BASE_URL = '/api/admin/configuracion';

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const toText = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
};

const toBool = (value, fallback = false) =>
  value === undefined || value === null ? fallback : value === true;

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const adaptConfiguracion = (data = {}) => ({
  nombreComercial: toText(pickFirst(data.nombreComercial, data.nombre, data.razonSocial)),
  whatsappPrincipal: toText(pickFirst(data.whatsappPrincipal, data.whatsapp, data.telefonoPrincipal)),
  correoContacto: toText(pickFirst(data.correoContacto, data.emailContacto, data.email)),
  ga4MeasurementId: toText(pickFirst(data.ga4MeasurementId, data.measurementId)),
  metaPixelId: toText(pickFirst(data.metaPixelId, data.facebookPixelId, data.metaPixel)),
  tikTokPixelId: toText(pickFirst(data.tikTokPixelId, data.tiktokPixelId, data.tiktokPixel)),
  limitePublicacionesGratis: toNumberOrNull(pickFirst(data.limitePublicacionesGratis, data.maxPublicacionesGratis)),
  activarTours360: toBool(pickFirst(data.activarTours360, data.tours360Activos)),
  activarPlanoInteractivo: toBool(pickFirst(data.activarPlanoInteractivo, data.planoInteractivoActivo)),
  activarDesarrollosPremium: toBool(pickFirst(data.activarDesarrollosPremium, data.desarrollosPremiumActivos)),
  activarLoteos: toBool(pickFirst(data.activarLoteos, data.loteosActivos)),
  mostrarLogoEmpresa: toBool(pickFirst(data.mostrarLogoEmpresa, data.usarLogoEmpresa), true),
});

export const getConfiguracion = async (options = {}) =>
  adaptConfiguracion(await getJson(BASE_URL, options));

export const updateConfiguracion = (payload) =>
  requestJson(BASE_URL, {
    method: 'PUT',
    body: payload,
  });
