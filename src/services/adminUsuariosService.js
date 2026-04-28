import { getJson, requestJson } from './apiClient';

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

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

const toText = (value, fallback = '') => {
  if (value === null || value === undefined) {
    return fallback;
  }

  const text = String(value).trim();
  return text || fallback;
};

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const formatDate = (value) => {
  if (!value) {
    return 'Sin fecha';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const adaptUsuario = (usuario) => ({
  id: String(pickFirst(usuario?.usuarioId, usuario?.UsuarioId, usuario?.id, usuario?.Id, '')),
  nombre: toText(pickFirst(usuario?.nombre, usuario?.Nombre), 'Sin nombre'),
  email: toText(pickFirst(usuario?.email, usuario?.Email), 'Sin email'),
  rol: toText(pickFirst(usuario?.rol, usuario?.Rol), 'USUARIO'),
  maxPublicaciones: pickFirst(usuario?.maxPublicaciones, usuario?.MaxPublicaciones, ''),
  activo: pickFirst(usuario?.activo, usuario?.Activo, usuario?.esActivo, usuario?.EsActivo, true) === true,
  fechaCreacion: formatDate(pickFirst(usuario?.fechaCreacion, usuario?.FechaCreacion, usuario?.createdAt)),
});

const buildUsuarioPayload = (usuario) => ({
  nombre: usuario.nombre || '',
  email: usuario.email || '',
  rol: usuario.rol || 'USUARIO',
  maxPublicaciones: toNumberOrNull(usuario.maxPublicaciones),
  ...(usuario.passwordTemporal ? { passwordTemporal: usuario.passwordTemporal } : {}),
});

export const obtenerAdminUsuarios = async (options = {}) => {
  const data = await getJson('/api/admin/usuarios', options);
  return normalizeList(data).map(adaptUsuario);
};

export const crearUsuario = (usuario) =>
  requestJson('/api/admin/usuarios', {
    method: 'POST',
    body: buildUsuarioPayload(usuario),
  });

export const actualizarUsuario = (usuarioId, usuario) =>
  requestJson(`/api/admin/usuarios/${usuarioId}`, {
    method: 'PUT',
    body: buildUsuarioPayload(usuario),
  });

export const activarUsuario = (usuarioId) =>
  requestJson(`/api/admin/usuarios/${usuarioId}/activar`, {
    method: 'PUT',
  });

export const desactivarUsuario = (usuarioId) =>
  requestJson(`/api/admin/usuarios/${usuarioId}/desactivar`, {
    method: 'PUT',
  });

export const resetPasswordUsuario = (usuarioId) =>
  requestJson(`/api/admin/usuarios/${usuarioId}/reset-password`, {
    method: 'PUT',
  });
