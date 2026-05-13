import { getJson, requestJson } from './apiClient';
import {
  cleanQuery,
  normalizeList,
  pickFirst,
  toText,
} from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/empresas-inmobiliarias';

export const adaptEmpresaInmobiliaria = (item = {}) => ({
  id: toText(pickFirst(item.empresaId, item.id, item.Id)),
  empresaId: toText(pickFirst(item.empresaId, item.id, item.Id)),
  nombre: toText(pickFirst(item.nombre, item.razonSocial), 'Sin nombre'),
  razonSocial: toText(item.razonSocial),
  rfc: toText(item.rfc),
  telefono: toText(item.telefono),
  email: toText(pickFirst(item.email, item.correo)),
  activo: item.activo !== false,
});

export const listarEmpresas = async ({ soloActivas = true, ...options } = {}) =>
  normalizeList(await getJson(BASE_URL, {
    ...options,
    query: cleanQuery({ soloActivas }),
  })).map(adaptEmpresaInmobiliaria);

export const obtenerEmpresa = async (empresaId, options = {}) =>
  adaptEmpresaInmobiliaria(await getJson(`${BASE_URL}/${empresaId}`, options));

export const crearEmpresa = (data) =>
  requestJson(BASE_URL, { method: 'POST', body: data });

export const actualizarEmpresa = (empresaId, data) =>
  requestJson(`${BASE_URL}/${empresaId}`, { method: 'PUT', body: data });

export const setEmpresaActivo = (empresaId, activo) =>
  requestJson(`${BASE_URL}/${empresaId}/activo`, {
    method: 'PATCH',
    body: { activo },
  });
