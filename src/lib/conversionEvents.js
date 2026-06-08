import { trackEvent } from './analytics';
import { registrarEventoConversion } from '../services/eventosConversionService';

export const EVENTOS_CONVERSION = {
  LANDING_VIEW: 'LANDING_VIEW',
  WHATSAPP_CLICK: 'WHATSAPP_CLICK',
  TOUR360_OPEN: 'TOUR360_OPEN',
  MAPA_INTERACTIVO: 'MAPA_INTERACTIVO',
  ME_INTERESA_CLICK: 'ME_INTERESA_CLICK',
  APARTAR_CLICK: 'APARTAR_CLICK',
};

const SESSION_ID_KEY = 'cn_session_id';

const isBrowser = () => typeof window !== 'undefined';

const createSessionId = () => {
  if (isBrowser() && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `cn-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getConversionSessionId = () => {
  if (!isBrowser()) {
    return '';
  }

  const current = window.localStorage.getItem(SESSION_ID_KEY);
  if (current) {
    return current;
  }

  const next = createSessionId();
  window.localStorage.setItem(SESSION_ID_KEY, next);
  return next;
};

const cleanMetadata = (metadata = {}) => {
  if (!metadata || typeof metadata !== 'object') {
    return {};
  }

  return Object.fromEntries(
    Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
};

const getCurrentUrl = () => (isBrowser() ? window.location.href : '');

export const trackConversionEvent = ({
  tipoEvento,
  entidadTipo,
  entidadId,
  slug,
  origen = 'landing',
  url,
  metadata = {},
  gaEventName,
  gaParams = {},
} = {}) => {
  if (!tipoEvento || !entidadTipo) {
    return;
  }

  const safeMetadata = cleanMetadata(metadata);
  const payload = {
    tipoEvento,
    entidadTipo,
    entidadId: entidadId ? Number(entidadId) : null,
    slug: slug || '',
    sessionId: getConversionSessionId(),
    origen,
    url: url || getCurrentUrl(),
    metadata: safeMetadata,
  };

  trackEvent(gaEventName || tipoEvento.toLowerCase(), {
    event_category: 'conversion',
    event_label: slug || entidadTipo,
    entidad_tipo: entidadTipo,
    entidad_id: payload.entidadId || undefined,
    slug: slug || undefined,
    ...gaParams,
  });

  registrarEventoConversion(payload).catch((err) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('No se pudo registrar evento de conversion.', err?.message || err);
    }
  });
};
