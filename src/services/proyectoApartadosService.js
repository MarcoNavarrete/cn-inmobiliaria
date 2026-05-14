import { getJson, requestJson } from './apiClient';
import {
  cleanQuery,
  formatCurrency,
  formatDate,
  normalizeList,
  pickFirst,
  toText,
} from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';

export const adaptProyectoApartado = (item = {}) => {
  const montoApartado = pickFirst(item.montoApartado, item.monto, item.importe);

  return {
    id: pickFirst(item.id, item.apartadoId, item.proyectoApartadoId),
    apartadoId: pickFirst(item.apartadoId, item.id, item.proyectoApartadoId),
    proyectoId: toText(pickFirst(item.proyectoId, item.idProyecto)),
    proyectoNombre: toText(pickFirst(item.proyectoNombre, item.proyecto, item.nombreProyecto), 'Sin proyecto'),
    empresaId: toText(pickFirst(item.empresaId, item.idEmpresa)),
    empresaNombre: toText(pickFirst(item.empresaNombre, item.empresa, item.nombreEmpresa), 'Sin empresa'),
    unidadId: toText(pickFirst(item.unidadId, item.proyectoUnidadId, item.desarrolloUnidadId)),
    unidadCodigo: toText(pickFirst(item.unidadCodigo, item.codigoUnidad, item.codigo, item.unidad?.codigo), 'Sin unidad'),
    prospectoId: toText(pickFirst(item.prospectoId, item.idProspecto)),
    prospectoNombre: toText(pickFirst(item.prospectoNombre, item.nombreProspecto, item.clienteNombre, item.nombreCliente), 'Sin prospecto'),
    montoApartado,
    montoApartadoTexto: formatCurrency(montoApartado),
    estatus: toText(pickFirst(item.estatus, item.status, item.estado), 'VIGENTE').toUpperCase(),
    observaciones: toText(pickFirst(item.observaciones, item.notas, item.comentarios)),
    fechaApartado: formatDate(pickFirst(item.fechaApartado, item.fecha, item.createdAt, item.fechaCreacion)),
    fechaVencimiento: formatDate(pickFirst(item.fechaVencimiento, item.vencimiento)),
  };
};

export const listarApartados = (filtros = {}) => {
  const { signal, ...query } = filtros;

  return (
  getJson(`${BASE_URL}/apartados`, {
    query: cleanQuery(query),
    signal,
  }).then((data) => normalizeList(data).map(adaptProyectoApartado))
  );
};

export const crearApartado = (proyectoId, data) =>
  requestJson(`${BASE_URL}/${proyectoId}/apartados`, { method: 'POST', body: data });

export const actualizarEstatusApartado = (apartadoId, data) =>
  requestJson(`${BASE_URL}/apartados/${apartadoId}/estatus`, { method: 'PATCH', body: data });
