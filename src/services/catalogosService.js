import { getJson } from './apiClient';

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

const toStringId = (value) => (value === null || value === undefined ? '' : String(value));

const adaptEstado = (estado) => ({
  id: toStringId(estado?.estadoId ?? estado?.estado_id ?? estado?.id),
  nombre: estado?.nomEstado ?? estado?.nombre ?? '',
});

const adaptPoblacion = (poblacion) => ({
  id: toStringId(poblacion?.poblacionId ?? poblacion?.poblacion_id ?? poblacion?.id),
  nombre: poblacion?.nomPoblacion ?? poblacion?.nombre ?? poblacion?.municipioNombre ?? '',
  estadoId: toStringId(poblacion?.estadoId ?? poblacion?.estado_id),
});

const adaptLocalidad = (localidad) => ({
  id: toStringId(localidad?.localidadId ?? localidad?.localidad_id ?? localidad?.id),
  nombre: localidad?.nomLocalidad ?? localidad?.nombre ?? localidad?.coloniaNombre ?? '',
  estadoId: toStringId(localidad?.estadoId ?? localidad?.estado_id),
  poblacionId: toStringId(localidad?.poblacionId ?? localidad?.poblacion_id),
  latitud: localidad?.latitud ?? localidad?.latitude ?? localidad?.lat ?? '',
  longitud: localidad?.longitud ?? localidad?.longitude ?? localidad?.lng ?? '',
});

const adaptTipoInmueble = (tipo) => ({
  id: toStringId(tipo?.tipoInmuebleId ?? tipo?.id),
  nombre: tipo?.nombre ?? '',
});

const adaptRol = (rol) => ({
  id: toStringId(rol?.rolId ?? rol?.rol_id ?? rol?.id ?? rol?.rol),
  nombre: rol?.nombre ?? rol?.nomRol ?? rol?.rol ?? '',
});

const adaptCodigoNumeroPais = (pais) => ({
  id: toStringId(pais?.codigoNumeroPaisId ?? pais?.id),
  codigoNumeroPaisId: toStringId(pais?.codigoNumeroPaisId ?? pais?.id),
  iso2: String(pais?.iso2 || '').toUpperCase(),
  nombrePais: pais?.nombrePais ?? pais?.nombre ?? '',
  codigoMarcacion: pais?.codigoMarcacion ?? pais?.lada ?? '',
  emojiBandera: pais?.emojiBandera ?? pais?.bandera ?? '',
});

export const listarEstados = (options = {}) =>
  getJson('/api/catalogos/estados', options)
    .then((data) => normalizeList(data).map(adaptEstado).filter((item) => item.id));

export const listarPoblacionesPorEstado = (estadoId, options = {}) =>
  getJson('/api/catalogos/poblaciones', {
    ...options,
    query: {
      estadoId,
    },
  })
    .then((data) => normalizeList(data).map(adaptPoblacion).filter((item) => item.id));

export const listarLocalidadesPorPoblacion = (estadoId, poblacionId, options = {}) =>
  getJson('/api/catalogos/localidades', {
    ...options,
    query: {
      estadoId,
      poblacionId,
    },
  })
    .then((data) => normalizeList(data).map(adaptLocalidad).filter((item) => item.id));

export const obtenerTiposInmueble = (options = {}) =>
  getJson('/api/catalogos/tipos-inmueble', options)
    .then((data) => normalizeList(data).map(adaptTipoInmueble).filter((item) => item.id));

export const obtenerRoles = (options = {}) =>
  getJson('/api/catalogos/roles', options)
    .then((data) => normalizeList(data).map(adaptRol).filter((item) => item.id));

export const getCodigosNumeroPaises = (options = {}) =>
  getJson('/api/catalogos/codigos-numero-paises', options)
    .then((data) => normalizeList(data).map(adaptCodigoNumeroPais).filter((item) => item.id));

export const obtenerEstados = listarEstados;
export const obtenerPoblaciones = listarPoblacionesPorEstado;
export const obtenerLocalidades = listarLocalidadesPorPoblacion;
