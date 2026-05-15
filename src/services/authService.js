import { getJson, requestJson } from './apiClient';

export const AUTH_TOKEN_KEY = 'cn_inmobiliaria_auth_token';
export const AUTH_SESSION_KEY = 'cn_inmobiliaria_auth_session';

const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
  return atob(padded);
};

const extractToken = (payload) => {
  if (typeof payload === 'string') {
    return payload;
  }

  return payload?.token || payload?.jwt || payload?.accessToken || '';
};

const AUTH_SESSION_EVENT = 'auth-session-change';

const emitAuthEvents = () => {
  window.dispatchEvent(new Event('auth-change'));
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
};

const safeJsonParse = (value) => {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (_) {
    return null;
  }
};

const normalizeSesion = (data = {}, fallback = {}) => {
  const empresas = Array.isArray(data.empresas)
    ? data.empresas.map((empresa) => ({
        ...empresa,
        id: empresa.id || empresa.empresaId || empresa.idEmpresa || '',
        empresaId: empresa.empresaId || empresa.id || empresa.idEmpresa || '',
        nombre: empresa.nombre || empresa.razonSocial || empresa.nombreEmpresa || '',
        rolEmpresa: String(empresa.rolEmpresa || empresa.rol || empresa.rolUsuario || empresa.tipoRol || '').toUpperCase(),
        activo: empresa.activo !== false && empresa.esActivo !== false,
      }))
    : [];
  const rolGlobal = String(data.rolGlobal || data.rol || fallback.rolGlobal || fallback.rol || '').trim() || 'USUARIO';
  const esAdminCn = data.esAdminCn === true || ['ADMIN', 'SUPERADMIN'].includes(rolGlobal.toUpperCase());
  const tieneAccesoEmpresarial = data.tieneAccesoEmpresarial === true || empresas.length > 0;

  return {
    usuarioId: String(data.usuarioId || fallback.usuarioId || fallback.id || ''),
    email: String(data.email || fallback.email || ''),
    nombre: String(data.nombre || fallback.nombre || fallback.name || fallback.unique_name || ''),
    rolGlobal,
    rol: rolGlobal,
    esAdminCn,
    empresas,
    tieneAccesoEmpresarial,
  };
};

export const guardarSesionActual = (sesion) => {
  if (!sesion) {
    localStorage.removeItem(AUTH_SESSION_KEY);
    emitAuthEvents();
    return null;
  }

  const normalized = normalizeSesion(sesion);
  localStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(normalized));
  emitAuthEvents();
  return normalized;
};

export const obtenerSesionGuardada = () => {
  const stored = safeJsonParse(localStorage.getItem(AUTH_SESSION_KEY));
  return stored ? normalizeSesion(stored) : null;
};

export const guardarToken = (token) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    emitAuthEvents();
  }
};

const parseTokenPayload = (token) => {
  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split('.');
    return JSON.parse(decodeBase64Url(payload));
  } catch (_) {
    return null;
  }
};

const tokenExpirado = (payload) => {
  if (!payload?.exp) {
    return false;
  }

  return Date.now() >= Number(payload.exp) * 1000;
};

export const obtenerToken = () => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY) || '';
  const payload = parseTokenPayload(token);

  if (token && tokenExpirado(payload)) {
    cerrarSesion();
    return '';
  }

  return token;
};

export const cerrarSesion = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_SESSION_KEY);
  emitAuthEvents();
};

export const obtenerUsuarioDesdeToken = () => {
  const sesion = obtenerSesionGuardada();

  if (sesion) {
    return sesion;
  }

  const token = obtenerToken();

  if (!token) {
    return null;
  }

  try {
    const data = parseTokenPayload(token);

    return {
      usuarioId: data.usuarioId || data.nameid || data.sub || '',
      email: data.email || '',
      nombre: data.nombre || data.name || data.unique_name || '',
      rolGlobal: data.rol || data.role || '',
      rol: data.rol || data.role || '',
      esAdminCn: ['ADMIN', 'SUPERADMIN'].includes(String(data.rol || data.role || '').toUpperCase()),
      empresas: [],
      tieneAccesoEmpresarial: false,
    };
  } catch (_) {
    return null;
  }
};

export const getCurrentUser = () => obtenerUsuarioDesdeToken();

let sesionActualPromise = null;

export const obtenerSesionActual = async (options = {}) => {
  const { forceRefresh = false, signal, suppressForbiddenAlert = false } = options;
  const token = obtenerToken();

  if (!token) {
    return null;
  }

  if (!forceRefresh) {
    const cached = obtenerSesionGuardada();
    if (cached) {
      return cached;
    }
  }

  if (!sesionActualPromise) {
    sesionActualPromise = getJson('/api/auth/me', {
      signal,
      suppressForbiddenAlert,
    })
      .then((data) => {
        const fallback = obtenerUsuarioDesdeToken() || {};
        const sesion = normalizeSesion(data, fallback);
        guardarSesionActual(sesion);
        return sesion;
      })
      .catch((err) => {
        if (err.status === 401) {
          cerrarSesion();
          return null;
        }

        const cached = obtenerSesionGuardada();
        if (cached) {
          return cached;
        }

        return normalizeSesion({}, obtenerUsuarioDesdeToken() || {});
      })
      .finally(() => {
        sesionActualPromise = null;
      });
  }

  return sesionActualPromise;
};

export const login = async ({ email, password }) => {
  const data = await requestJson('/api/auth/login', {
    method: 'POST',
    body: {
      email,
      password,
    },
  });
  const token = extractToken(data);

  if (!token) {
    throw new Error('El API no devolvio un token valido.');
  }

  guardarToken(token);
  const usuario = await obtenerSesionActual({ forceRefresh: true }).catch(() => obtenerUsuarioDesdeToken());

  return {
    token,
    usuario,
    data,
  };
};

export const register = async (nombreOrPayload, email, password) => {
  const payload = typeof nombreOrPayload === 'object'
    ? nombreOrPayload
    : {
        nombre: nombreOrPayload,
        email,
        password,
      };

  return requestJson('/api/auth/register', {
    method: 'POST',
    body: payload,
  });
};

export const cambiarPassword = ({ passwordActual, passwordNueva, confirmarPasswordNueva }) =>
  requestJson('/api/auth/cambiar-password', {
    method: 'POST',
    body: {
      passwordActual,
      passwordNueva,
      confirmarPasswordNueva,
    },
  });
