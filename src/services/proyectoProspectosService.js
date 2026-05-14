import { getJson, requestJson } from './apiClient';
import {
  cleanQuery,
  formatDate,
  normalizeList,
  pickFirst,
  toBool,
  toText,
} from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios/prospectos';

export const adaptProyectoProspecto = (item = {}) => {
  const unidadCodigo = toText(pickFirst(
    item.unidadCodigo,
    item.codigoUnidad,
    item.codigo,
    item.unidad?.codigo,
    item.unidad?.codigoUnidad
  ));

  return {
    id: pickFirst(item.id, item.prospectoId, item.proyectoProspectoId),
    prospectoId: pickFirst(item.prospectoId, item.id, item.proyectoProspectoId),
    proyectoId: toText(pickFirst(item.proyectoId, item.idProyecto)),
    proyectoNombre: toText(pickFirst(item.proyectoNombre, item.proyecto, item.nombreProyecto), 'Sin proyecto'),
    empresaId: toText(pickFirst(item.empresaId, item.idEmpresa)),
    empresaNombre: toText(pickFirst(item.empresaNombre, item.empresa, item.nombreEmpresa), 'Sin empresa'),
    unidadId: toText(pickFirst(item.unidadId, item.proyectoUnidadId, item.desarrolloUnidadId)),
    unidadCodigo: unidadCodigo || 'Sin unidad',
    nombre: toText(pickFirst(item.nombre, item.nombreProspecto, item.clienteNombre), 'Sin nombre'),
    telefono: toText(pickFirst(item.telefono, item.telefonoProspecto, item.celular, item.whatsapp)),
    correo: toText(pickFirst(item.correo, item.email, item.emailProspecto)),
    origen: toText(pickFirst(item.origen, item.source, item.canal), 'Sin origen'),
    estatus: toText(pickFirst(item.estatus, item.status, item.estado), 'NUEVO').toUpperCase(),
    mensaje: toText(pickFirst(item.mensaje, item.message, item.comentario)),
    observaciones: toText(pickFirst(item.observaciones, item.notas, item.comentarios)),
    fechaContacto: formatDate(pickFirst(item.fechaContacto, item.contactadoEn, item.fechaUltimoContacto)),
    fechaCreacion: formatDate(pickFirst(item.fechaCreacion, item.createdAt, item.fechaAlta, item.fecha)),
    activo: toBool(pickFirst(item.activo, item.esActivo, item.active), true),
  };
};

export const listarProspectos = (filtros = {}) => {
  const { signal, ...query } = filtros;

  return (
  getJson(BASE_URL, {
    query: cleanQuery(query),
    signal,
  }).then((data) => normalizeList(data).map(adaptProyectoProspecto))
  );
};

export const actualizarEstatusProspecto = (prospectoId, data) =>
  requestJson(`${BASE_URL}/${prospectoId}/estatus`, { method: 'PATCH', body: data });
