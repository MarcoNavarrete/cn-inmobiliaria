const DEFAULT_API_BASE_URL = 'https://localhost:7206';
const DEFAULT_FRONTEND_ASSETS_BASE_URL = process.env.PUBLIC_URL || '/';
const AUTH_TOKEN_KEY = 'cn_inmobiliaria_auth_token';

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
  const { query, signal } = options;
  const response = await fetch(buildUrl(path, query), {
    method: 'GET',
    signal,
    headers: {
      Accept: 'application/json',
      ...getAuthHeaders(),
    },
  });

  const rawBody = await response.text();
  const data = rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    const error = new Error(data?.message || `Error HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const requestJson = async (path, options = {}) => {
  const {
    body,
    headers,
    method = 'GET',
    query,
    signal,
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

  const rawBody = await response.text();
  const data = rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    const error = new Error(data?.message || `Error HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};

export const requestFormData = async (path, options = {}) => {
  const {
    body,
    headers,
    method = 'POST',
    query,
    signal,
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

  const rawBody = await response.text();
  const data = rawBody ? JSON.parse(rawBody) : null;

  if (!response.ok) {
    const error = new Error(data?.message || `Error HTTP ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
};
