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
  }
};

export const obtenerToken = () => localStorage.getItem(AUTH_TOKEN_KEY) || '';

export const cerrarSesion = () => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
};

export const obtenerUsuarioDesdeToken = () => {
  const token = obtenerToken();

  if (!token) {
    return null;
  }

  try {
    const [, payload] = token.split('.');
    const data = JSON.parse(decodeBase64Url(payload));

    return {
      usuarioId: data.usuarioId || data.nameid || data.sub || '',
      email: data.email || '',
      rol: data.rol || data.role || '',
    };
  } catch (_) {
    return null;
  }
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

  return {
    token,
    usuario: obtenerUsuarioDesdeToken(),
    data,
  };
};

export const register = async (payload) =>
  requestJson('/api/auth/register', {
    method: 'POST',
    body: payload,
  });
