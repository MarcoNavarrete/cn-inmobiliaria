import { getJson } from './apiClient';

const toText = (value) => (value === null || value === undefined ? '' : String(value).trim());

export const obtenerAsesorPorReferencia = (codigoAsesor, options = {}) =>
  getJson(`/api/asesores/ref/${encodeURIComponent(codigoAsesor)}`, options).then((data = {}) => ({
    codigoAsesor: toText(data.codigoAsesor || data.codigo || codigoAsesor),
    nombre: toText(data.nombre),
    telefono: toText(data.telefono),
    telefonoLocal: toText(data.telefonoLocal),
    codigoMarcacion: toText(data.codigoMarcacion),
    emojiBanderaTelefono: toText(data.emojiBanderaTelefono),
  }));
