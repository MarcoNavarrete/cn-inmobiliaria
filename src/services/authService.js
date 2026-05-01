import { requestJson } from './apiClient';

export const AUTH_TOKEN_KEY = 'cn_inmobiliaria_auth_token';

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

export const guardarToken = (token) => {
  if (token) {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    window.dispatchEvent(new Event('auth-change'));
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
  window.dispatchEvent(new Event('auth-change'));
};

export const obtenerUsuarioDesdeToken = () => {
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
      rol: data.rol || data.role || '',
    };
  } catch (_) {
    return null;
  }
};

export const getCurrentUser = () => obtenerUsuarioDesdeToken();

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

  return {
    token,
    usuario: obtenerUsuarioDesdeToken(),
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
