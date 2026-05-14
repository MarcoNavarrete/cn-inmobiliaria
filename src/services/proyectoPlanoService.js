import { getJson, requestFormData, requestJson } from './apiClient';
import { pickFirst, toText } from './proyectosInmobiliariosUtils';

const BASE_URL = '/api/admin/proyectos-inmobiliarios';

export const adaptProyectoPlano = (item = {}) => {
  if (!item) return null;

  return {
    id: toText(pickFirst(item.planoId, item.proyectoPlanoId, item.id, item.Id)),
    nombre: toText(item.nombre, 'Plano general'),
    svgUrl: toText(pickFirst(item.svgUrl, item.urlSvg)),
    imagenFondoUrl: toText(pickFirst(item.imagenFondoUrl, item.fondoUrl)),
    descripcion: toText(item.descripcion),
    activo: item.activo !== false,
  };
};

export const obtenerPlano = (proyectoId, options = {}) =>
  getJson(`${BASE_URL}/${proyectoId}/plano`, options).then(adaptProyectoPlano);

export const guardarPlano = (proyectoId, data) =>
  requestJson(`${BASE_URL}/${proyectoId}/plano`, { method: 'PUT', body: data });

export const subirPlanoSvg = (proyectoId, { descripcion, file, nombre } = {}) => {
  const body = new FormData();
  body.append('file', file);
  if (nombre) body.append('nombre', nombre);
  if (descripcion) body.append('descripcion', descripcion);

  return requestFormData(`${BASE_URL}/${proyectoId}/plano/upload`, {
    method: 'POST',
    body,
  }).then(adaptProyectoPlano);
};
