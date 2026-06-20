export const PROYECTO_ESTATUS_CONFIGURABLES = [
  'DISPONIBLE',
  'APARTADO',
  'VENDIDO',
  'BLOQUEADO',
  'CONSTRUCCION',
];

export const PROYECTO_ESTATUS_LABELS = {
  DISPONIBLE: 'Disponible',
  APARTADO: 'Apartado',
  EN_PROCESO: 'En proceso',
  CONSTRUCCION: 'Construcción',
  VENDIDO: 'Vendido',
  LIQUIDADO: 'Liquidado',
  BLOQUEADO: 'Bloqueado',
  NO_DISPONIBLE: 'No disponible',
};

export const PROYECTO_COLORES_DEFAULT = {
  DISPONIBLE: { colorHex: '#22C55E', colorTextoHex: '#166534', opacity: 0.56 },
  APARTADO: { colorHex: '#FACC15', colorTextoHex: '#713F12', opacity: 0.62 },
  EN_PROCESO: { colorHex: '#3B82F6', colorTextoHex: '#1D4ED8', opacity: 0.48 },
  CONSTRUCCION: { colorHex: '#3B82F6', colorTextoHex: '#1D4ED8', opacity: 0.48 },
  VENDIDO: { colorHex: '#EF4444', colorTextoHex: '#7F1D1D', opacity: 0.52 },
  LIQUIDADO: { colorHex: '#14B8A6', colorTextoHex: '#0F766E', opacity: 0.52 },
  BLOQUEADO: { colorHex: '#9CA3AF', colorTextoHex: '#374151', opacity: 0.58 },
  NO_DISPONIBLE: { colorHex: '#4B5563', colorTextoHex: '#1F2937', opacity: 0.62 },
};

export const PROYECTO_COLOR_FALLBACK = {
  colorHex: '#6B7280',
  colorTextoHex: '#1F2937',
  opacity: 0.55,
  activo: true,
};

export const normalizeProyectoStatus = (status) =>
  String(status || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

export const getProyectoStatusConfigKey = (status) => {
  const normalized = normalizeProyectoStatus(status);
  return normalized === 'EN_PROCESO' ? 'CONSTRUCCION' : normalized;
};

export const normalizeProyectoColorConfig = (item = {}) => {
  const opacityValue = Number(item.opacity);

  return {
    estatus: normalizeProyectoStatus(item.estatus),
    colorHex: String(item.colorHex || '').trim().toUpperCase(),
    colorTextoHex: String(item.colorTextoHex || '').trim().toUpperCase(),
    opacity: Number.isFinite(opacityValue) ? opacityValue : 0.55,
    activo: item.activo !== false,
  };
};

export const getDefaultProyectoColorConfig = (status) => {
  const normalized = normalizeProyectoStatus(status);
  const key = getProyectoStatusConfigKey(normalized);
  const config =
    PROYECTO_COLORES_DEFAULT[normalized] ||
    PROYECTO_COLORES_DEFAULT[key] ||
    PROYECTO_COLOR_FALLBACK;

  return {
    estatus: key || normalized || 'NO_DISPONIBLE',
    ...config,
    activo: true,
  };
};

export const getColorConfigByStatus = (status, coloresEstatusProyecto = []) => {
  const normalized = normalizeProyectoStatus(status);
  const configKey = getProyectoStatusConfigKey(normalized);
  const custom = (Array.isArray(coloresEstatusProyecto) ? coloresEstatusProyecto : [])
    .map(normalizeProyectoColorConfig)
    .find((item) => {
      if (!item.activo) return false;
      const itemStatus = normalizeProyectoStatus(item.estatus);
      return itemStatus === normalized || getProyectoStatusConfigKey(itemStatus) === configKey;
    });

  return custom || getDefaultProyectoColorConfig(normalized);
};

export const buildDefaultProyectoColores = () =>
  PROYECTO_ESTATUS_CONFIGURABLES.map(getDefaultProyectoColorConfig);

export const hexToRgba = (hex, opacity) => {
  const normalized = String(hex || '').replace('#', '');
  if (!/^[0-9A-F]{6}$/i.test(normalized)) {
    return `rgba(107, 114, 128, ${opacity})`;
  }

  const value = Number.parseInt(normalized, 16);
  const red = (value >> 16) & 255;
  const green = (value >> 8) & 255;
  const blue = value & 255;
  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};
