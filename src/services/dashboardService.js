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

const pickFirst = (...values) => values.find((value) => value !== undefined && value !== null);

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const adaptResumen = (resumen = {}) => ({
  totalInmuebles: toNumber(pickFirst(resumen.totalInmuebles, resumen.TotalInmuebles)),
  pendientesRevision: toNumber(
    pickFirst(
      resumen.pendientesRevision,
      resumen.pendientesDeRevision,
      resumen.pendientesAprobacion,
      resumen.inmueblesPendientesRevision,
      resumen.PendientesRevision,
      resumen.PendientesDeRevision
    )
  ),
  disponibles: toNumber(pickFirst(resumen.disponibles, resumen.inmueblesDisponibles, resumen.Disponibles)),
  apartados: toNumber(pickFirst(resumen.apartados, resumen.inmueblesApartados, resumen.Apartados)),
  vendidos: toNumber(pickFirst(resumen.vendidos, resumen.inmueblesVendidos, resumen.Vendidos)),
  inactivos: toNumber(pickFirst(resumen.inactivos, resumen.inmueblesInactivos, resumen.Inactivos)),
  totalProspectos: toNumber(pickFirst(resumen.totalProspectos, resumen.TotalProspectos)),
  prospectosUltimos7Dias: toNumber(
    pickFirst(resumen.prospectosUltimos7Dias, resumen.prospectos7Dias, resumen.ProspectosUltimos7Dias)
  ),
  prospectosUltimos30Dias: toNumber(
    pickFirst(resumen.prospectosUltimos30Dias, resumen.prospectos30Dias, resumen.ProspectosUltimos30Dias)
  ),
});

const adaptTopInmueble = (item) => ({
  inmuebleId: String(pickFirst(item?.inmuebleId, item?.InmuebleId, item?.id, item?.Id, '')),
  titulo: item?.tituloInmueble || item?.titulo || item?.TituloInmueble || 'Sin titulo',
  totalProspectos: toNumber(pickFirst(item?.totalProspectos, item?.prospectos, item?.TotalProspectos)),
});

export const obtenerDashboardResumen = async (options = {}) => {
  const data = await getJson('/api/admin/dashboard/resumen', options);
  return adaptResumen(data);
};

export const obtenerTopInmuebles = async (options = {}) => {
  const data = await getJson('/api/admin/dashboard/top-inmuebles', options);
  return normalizeList(data).map(adaptTopInmueble);
};
