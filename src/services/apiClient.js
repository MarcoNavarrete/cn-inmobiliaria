const DEFAULT_API_BASE_URL = 'https://localhost:7206';
const DEFAULT_FRONTEND_ASSETS_BASE_URL = process.env.PUBLIC_URL || '/';
const AUTH_TOKEN_KEY = 'cn_inmobiliaria_auth_token';
const SESSION_EXPIRED_MESSAGE = 'Tu sesion ha expirado. Inicia sesion nuevamente para continuar.';
const FORBIDDEN_MESSAGE = 'No tienes permiso para acceder a esta sección.';
const AUTH_STORAGE_KEYS = [
  AUTH_TOKEN_KEY,
  'token',
  'authToken',
  'usuario',
  'user',
  'rol',
  'role',
];

let handlingSessionExpired = false;
let handlingForbidden = false;

const normalizeBaseUrl = (value) =>
  (value || DEFAULT_API_BASE_URL).replace(/\/+$/, '');

const normalizeAssetsBaseUrl = (value) => {
  if (!value) {
    return DEFAULT_FRONTEND_ASSETS_BASE_URL.replace(/\/+$/, '');
  }

  return value.replace(/\/+$/, '');
};

export const API_BASE_URL = normalizeBaseUrl(process.env.REACT_APP_API_BASE_URL);
export const FRONTEND_ASSETS_BASE_URL = normalizeAssetsBaseUrl(
  process.env.REACT_APP_FRONTEND_ASSETS_BASE_URL
);

const buildUrl = (path, query) => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = new URL(`${API_BASE_URL}${normalizedPath}`);

  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      const normalizedValue =
        typeof value === 'string'
          ? value.trim()
          : value;

      if (normalizedValue !== undefined && normalizedValue !== null && normalizedValue !== '') {
        url.searchParams.set(key, normalizedValue);
      }
    });
  }

  return url.toString();
};

const getAuthHeaders = () => {
  const token = localStorage.getItem(AUTH_TOKEN_KEY);

  return token ? { Authorization: `Bearer ${token}` } : {};
};

const clearAuthData = () => {
  AUTH_STORAGE_KEYS.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });

  window.dispatchEvent(new Event('auth-change'));
};

const isAuthEndpoint = (path) => /^\/?api\/auth\//i.test(path);

const redirectToLogin = () => {
  if (window.location.hash !== '#/login') {
    window.location.hash = '#/login';
  }
};

const notify = (message) => {
  window.alert(message);
};

const createApiError = (message, status, data, code) => {
  const error = new Error(message);
  error.status = status;
  error.data = data;
  error.code = code;
  return error;
};

const handleSessionExpired = () => {
  if (handlingSessionExpired) {
    return;
  }

  handlingSessionExpired = true;
  clearAuthData();
  notify(SESSION_EXPIRED_MESSAGE);
  redirectToLogin();
};

const handleForbidden = () => {
  if (handlingForbidden || handlingSessionExpired) {
    return;
  }

  handlingForbidden = true;
  notify(FORBIDDEN_MESSAGE);

  window.setTimeout(() => {
    handlingForbidden = false;
  }, 1200);
};

const parseResponseBody = async (response) => {
  const rawBody = await response.text();

  if (!rawBody) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch (_) {
    return rawBody;
  }
};

const getErrorMessage = (data, fallback) => {
  if (typeof data === 'string') {
    return data || fallback;
  }

  return data?.mensaje || data?.message || fallback;
};

const handleApiResponse = async (response, path, options = {}) => {
  const data = await parseResponseBody(response);

  if (response.status === 401 && !isAuthEndpoint(path)) {
    handleSessionExpired();
    throw createApiError(SESSION_EXPIRED_MESSAGE, response.status, data, 'SESSION_EXPIRED');
  }

  if (response.status === 403 && !isAuthEndpoint(path)) {
    if (!options.suppressForbiddenAlert) {
      handleForbidden();
    }
    throw createApiError(FORBIDDEN_MESSAGE, response.status, data, 'FORBIDDEN');
  }

  if (!response.ok) {
    throw createApiError(
      getErrorMessage(data, `Error HTTP ${response.status}`),
      response.status,
      data,
      'HTTP_ERROR'
    );
  }

  return data;
};

const normalizeFrontendTourPath = (value) =>
  value.replace(/\.hmtl(\?|#|$)/i, '.html$1');

const isFrontendTourPath = (value) =>
  /^\/?(?!uploads\/)(?:[^?#]+\.)?(?:html?|hmtl)(?:[?#].*)?$/i.test(value);

export const resolveApiAssetUrl = (value) => {
  if (!value || typeof value !== 'string') {
    return '';
  }

  const normalizedValue = value.trim();

  if (/^https?:\/\//i.test(value)) {
    return normalizedValue;
  }

  try {
    if (/^\.?\/assets\//i.test(normalizedValue)) {
      const assetPath = normalizedValue.replace(/^\.\//, '');
      return new URL(assetPath.replace(/^\/+/, ''), `${FRONTEND_ASSETS_BASE_URL}/`).toString();
    }

    if (/^\/uploads\//i.test(normalizedValue)) {
      return new URL(normalizedValue, `${API_BASE_URL}/`).toString();
    }

    if (isFrontendTourPath(normalizedValue)) {
      const frontendPath = normalizeFrontendTourPath(normalizedValue).replace(/^\.\//, '');
      return new URL(frontendPath.replace(/^\/+/, ''), `${FRONTEND_ASSETS_BASE_URL}/`).toString();
    }

    if (/^\//.test(normalizedValue)) {
      return new URL(normalizedValue, `${API_BASE_URL}/`).toString();
    }

    return new URL(normalizedValue, `${API_BASE_URL}/`).toString();
  } catch (_) {
    return normalizedValue;
  }
};

export const getJson = async (path, options = {}) => {
  const { query, signal, suppressForbiddenAlert } = options;
  const response = await fetch(buildUrl(path, query), {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
  });

  return handleApiResponse(response, path, { suppressForbiddenAlert });
};

export const requestJson = async (path, options = {}) => {
  const {
    body,
    headers,
    method = 'GET',
    query,
    signal,
    suppressForbiddenAlert,
  } = options;

  const response = await fetch(buildUrl(path, query), {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...getAuthHeaders(),
      ...headers,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });

  return handleApiResponse(response, path, { suppressForbiddenAlert });
};

export const requestFormData = async (path, options = {}) => {
  const {
    body,
    headers,
    method = 'POST',
    query,
    signal,
    suppressForbiddenAlert,
  } = options;

  const response = await fetch(buildUrl(path, query), {
    method,
    signal,
    headers: {
      Accept: 'application/json',
      ...getAuthHeaders(),
      ...headers,
    },
    body,
  });

  return handleApiResponse(response, path, { suppressForbiddenAlert });
};
