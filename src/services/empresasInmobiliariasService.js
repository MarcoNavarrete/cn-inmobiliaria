import { getJson, requestFormData, requestJson } from './apiClient';
import {
  cleanQuery,
  normalizeList,
  pickFirst,
  toBool,
  toNumberOrNull,
  toText,
} from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/empresas-inmobiliarias';

export const adaptEmpresaInmobiliaria = (item = {}) => ({
  id: toText(pickFirst(item.empresaId, item.id, item.Id)),
  empresaId: toText(pickFirst(item.empresaId, item.id, item.Id)),
  nombre: toText(pickFirst(item.nombre, item.nombreComercial, item.razonSocial), 'Sin nombre'),
  nombreComercial: toText(pickFirst(item.nombreComercial, item.nombre)),
  razonSocial: toText(item.razonSocial),
  rfc: toText(item.rfc),
  telefono: toText(item.telefono),
  email: toText(pickFirst(item.email, item.correo)),
  sitioWeb: toText(pickFirst(item.sitioWeb, item.webSite, item.website)),
  logoUrl: toText(pickFirst(item.logoUrl, item.logoEmpresaUrl, item.logo)),
  usaLogoPropio: toBool(pickFirst(item.usaLogoPropio, item.usarLogoPropio, item.tieneLogoPropio), false),
  estatusSuscripcion: toText(pickFirst(item.estatusSuscripcion, item.suscripcionEstatus, item.statusSuscripcion), 'ACTIVA').toUpperCase(),
  montoMensualidad: toNumberOrNull(pickFirst(item.montoMensualidad, item.mensualidad, item.montoMensual)),
  fechaAlta: toText(pickFirst(item.fechaAlta, item.createdAt, item.fechaCreacion)),
  fechaUltimoPago: toText(pickFirst(item.fechaUltimoPago, item.ultimoPago, item.ultimoPagoFecha)),
  observaciones: toText(item.observaciones),
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

export const uploadLogoEmpresa = (empresaId, file, options = {}) => {
  const formData = new FormData();
  formData.append('file', file);

  return requestFormData(`${BASE_URL}/${empresaId}/logo`, {
    method: 'POST',
    body: formData,
    ...options,
  });
};

export const buildEmpresaPayload = (form = {}) => ({
  nombre: toText(form.nombreComercial || form.nombre),
  nombreComercial: toText(form.nombreComercial || form.nombre),
  razonSocial: toText(form.razonSocial),
  rfc: toText(form.rfc),
  telefono: toText(form.telefono),
  email: toText(form.email),
  correo: toText(form.email),
  sitioWeb: toText(form.sitioWeb),
  webSite: toText(form.sitioWeb),
  website: toText(form.sitioWeb),
  logoUrl: toText(form.logoUrl),
  logoEmpresaUrl: toText(form.logoUrl),
  usaLogoPropio: toBool(form.usaLogoPropio, false),
  usarLogoPropio: toBool(form.usaLogoPropio, false),
  estatusSuscripcion: toText(form.estatusSuscripcion, 'ACTIVA').toUpperCase(),
  suscripcionEstatus: toText(form.estatusSuscripcion, 'ACTIVA').toUpperCase(),
  montoMensualidad: toNumberOrNull(form.montoMensualidad),
  mensualidad: toNumberOrNull(form.montoMensualidad),
  fechaUltimoPago: toText(form.fechaUltimoPago),
  ultimoPago: toText(form.fechaUltimoPago),
  observaciones: toText(form.observaciones),
});

export const obtenerEmpresasActivas = async (options = {}) =>
  listarEmpresas({ soloActivas: true, ...options });
