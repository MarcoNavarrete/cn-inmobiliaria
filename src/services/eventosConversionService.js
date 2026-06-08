import { API_BASE_URL, getJson } from './apiClient';

const buildPublicUrl = (path) => `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

export const normalizarResumenEventosConversion = (data = {}) => ({
  vistasLanding: toNumber(pickFirst(data.vistasLanding, data.VistasLanding)),
  whatsapp: toNumber(pickFirst(data.whatsapp, data.WhatsApp, data.clicsWhatsapp, data.ClicsWhatsapp)),
  tour360: toNumber(pickFirst(data.tour360, data.Tour360, data.clicsTour360, data.ClicsTour360)),
  mapaInteractivo: toNumber(pickFirst(data.mapaInteractivo, data.MapaInteractivo, data.clicsMapaInteractivo, data.ClicsMapaInteractivo)),
  meInteresa: toNumber(pickFirst(data.meInteresa, data.MeInteresa, data.clicsMeInteresa, data.ClicsMeInteresa)),
  apartar: toNumber(pickFirst(data.apartar, data.Apartar, data.clicsApartar, data.ClicsApartar)),
});

export const registrarEventoConversion = async (payload = {}) => {
  const response = await fetch(buildPublicUrl('/api/eventos-conversion'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`No fue posible registrar el evento de conversion (${response.status}).`);
  }

  if (response.status === 204) {
    return null;
  }

  const text = await response.text();
  return text ? JSON.parse(text) : null;
};

export const obtenerResumenEventosConversion = async (filtros = {}, options = {}) => {
  const data = await getJson('/api/admin/eventos-conversion/resumen', {
    ...options,
    query: {
      entidadTipo: filtros.entidadTipo,
      entidadId: filtros.entidadId,
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
    },
  });

  return normalizarResumenEventosConversion(data);
};
