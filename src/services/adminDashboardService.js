import { getJson } from './apiClient';

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const read = (source, ...paths) => {
  for (const path of paths) {
    const value = path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), source);

    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }

  return undefined;
};

const adaptDashboard = (data = {}) => {
  const prospectos = pickFirst(data.prospectos, data.Prospectos, {});
  const inventario = pickFirst(data.inventario, data.Inventario, {});
  const contenidoPendiente = pickFirst(data.contenidoPendiente, data.ContenidoPendiente, data.pendientes, {});
  const actividad = pickFirst(data.actividad, data.Actividad, {});

  return {
    prospectos: {
      nuevosHoy: toNumber(pickFirst(read(prospectos, 'nuevosHoy', 'NuevosHoy'), read(data, 'prospectosNuevosHoy', 'nuevosHoy'))),
      sinAtender: toNumber(pickFirst(read(prospectos, 'sinAtender', 'SinAtender'), read(data, 'prospectosSinAtender', 'sinAtender'))),
      contactados: toNumber(pickFirst(read(prospectos, 'contactados', 'Contactados'), read(data, 'prospectosContactados', 'contactados'))),
      interesados: toNumber(pickFirst(read(prospectos, 'interesados', 'Interesados'), read(data, 'prospectosInteresados', 'interesados'))),
      visitaAgendada: toNumber(pickFirst(read(prospectos, 'visitaAgendada', 'VisitaAgendada'), read(data, 'prospectosVisitaAgendada', 'visitaAgendada'))),
      cerrados: toNumber(pickFirst(read(prospectos, 'cerrados', 'Cerrados'), read(data, 'prospectosCerrados', 'cerrados'))),
    },
    inventario: {
      inmueblesActivos: toNumber(pickFirst(read(inventario, 'inmueblesActivos', 'InmueblesActivos'), read(data, 'inmueblesActivos'))),
      desarrollosActivos: toNumber(pickFirst(read(inventario, 'desarrollosActivos', 'DesarrollosActivos'), read(data, 'desarrollosActivos'))),
      modelosActivos: toNumber(pickFirst(read(inventario, 'modelosActivos', 'ModelosActivos'), read(data, 'modelosActivos'))),
    },
    contenidoPendiente: {
      inmueblesSinImagenes: toNumber(pickFirst(read(contenidoPendiente, 'inmueblesSinImagenes', 'InmueblesSinImagenes'), read(data, 'inmueblesSinImagenes'))),
      inmueblesSinTour360: toNumber(pickFirst(read(contenidoPendiente, 'inmueblesSinTour360', 'InmueblesSinTour360'), read(data, 'inmueblesSinTour360'))),
      desarrollosSinImagenes: toNumber(pickFirst(read(contenidoPendiente, 'desarrollosSinImagenes', 'DesarrollosSinImagenes'), read(data, 'desarrollosSinImagenes'))),
      modelosSinImagenes: toNumber(pickFirst(read(contenidoPendiente, 'modelosSinImagenes', 'ModelosSinImagenes'), read(data, 'modelosSinImagenes'))),
      modelosSinTour360: toNumber(pickFirst(read(contenidoPendiente, 'modelosSinTour360', 'ModelosSinTour360'), read(data, 'modelosSinTour360'))),
    },
    actividad: {
      publicacionesUltimos7Dias: toNumber(pickFirst(read(actividad, 'publicacionesUltimos7Dias', 'PublicacionesUltimos7Dias'), read(data, 'publicacionesUltimos7Dias'))),
      prospectosUltimos7Dias: toNumber(pickFirst(read(actividad, 'prospectosUltimos7Dias', 'ProspectosUltimos7Dias'), read(data, 'prospectosUltimos7Dias'))),
      usuariosConBusquedasGuardadas: toNumber(pickFirst(read(actividad, 'usuariosConBusquedasGuardadas', 'UsuariosConBusquedasGuardadas'), read(data, 'usuariosConBusquedasGuardadas'))),
      alertasNoLeidas: toNumber(pickFirst(read(actividad, 'alertasNoLeidas', 'AlertasNoLeidas'), read(data, 'alertasNoLeidas'))),
    },
  };
};

export const obtenerDashboardAdmin = async (options = {}) =>
  adaptDashboard(await getJson('/api/admin/dashboard', options));
