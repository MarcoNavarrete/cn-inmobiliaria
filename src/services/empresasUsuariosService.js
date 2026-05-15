import { getJson, requestJson } from './apiClient';
import {
  cleanQuery,
  normalizeList,
  pickFirst,
  toBool,
  toText,
} from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/empresas-inmobiliarias/usuarios';

export const ROLES_EMPRESA = ['ADMIN_EMPRESA', 'VENDEDOR', 'LECTURA'];

export const adaptEmpresaUsuario = (item = {}) => {
  const id = toText(pickFirst(item.empresaUsuarioId, item.id, item.Id));
  const empresaId = toText(pickFirst(item.empresaId, item.idEmpresa));
  const usuarioId = toText(pickFirst(item.usuarioId, item.idUsuario));

  return {
    id,
    empresaUsuarioId: id,
    empresaId,
    usuarioId,
    empresaNombre: toText(pickFirst(item.empresaNombre, item.nombreEmpresa, item.empresa?.nombre), empresaId ? `Empresa ${empresaId}` : 'Sin empresa'),
    usuarioNombre: toText(pickFirst(item.usuarioNombre, item.nombreUsuario, item.usuario?.nombre)),
    usuarioEmail: toText(pickFirst(item.usuarioEmail, item.emailUsuario, item.usuario?.email)),
    rolEmpresa: toText(pickFirst(item.rolEmpresa, item.rol), 'LECTURA').toUpperCase(),
    activo: toBool(pickFirst(item.activo, item.esActivo), true),
  };
};

export const listarEmpresaUsuarios = async ({
  empresaId,
  usuarioId,
  soloActivos = true,
  ...options
} = {}) =>
  normalizeList(await getJson(BASE_URL, {
    ...options,
    query: cleanQuery({ empresaId, usuarioId, soloActivos }),
  })).map(adaptEmpresaUsuario);

export const asignarUsuarioEmpresa = ({ empresaId, usuarioId, rolEmpresa, activo = true }) =>
  requestJson(BASE_URL, {
    method: 'POST',
    body: {
      empresaId: Number(empresaId),
      usuarioId: Number(usuarioId),
      rolEmpresa,
      activo,
    },
  });

export const setEmpresaUsuarioActivo = (empresaUsuarioId, activo) =>
  requestJson(`${BASE_URL}/${empresaUsuarioId}/activo`, {
    method: 'PATCH',
    body: { activo },
  });

export const obtenerRelacionesEmpresaUsuarioActual = async (usuarioId, options = {}) => {
  if (!usuarioId) {
    return [];
  }

  return listarEmpresaUsuarios({
    usuarioId,
    soloActivos: true,
    ...options,
  });
};
