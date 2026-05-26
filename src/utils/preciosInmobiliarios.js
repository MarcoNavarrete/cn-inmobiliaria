const PRECIO_CONTADO_KEYS = new Set([
  'CONTADO',
  'CONTADO_EFECTIVO',
  'CONTADO_EFECTIVO_MXN',
  'PAGO_CONTADO',
  'PAGO_DE_CONTADO',
]);

const normalizeText = (value) =>
  String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .toUpperCase();

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isNaN(number) ? null : number;
};

const pickFirst = (...values) =>
  values.find((value) => value !== undefined && value !== null && value !== '');

export const normalizarListaPrecios = (value) => {
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

export const formatearMonedaMXN = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'Precio por confirmar';
  }

  const number = Number(value);
  if (Number.isNaN(number)) {
    return 'Precio por confirmar';
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(number);
};

export const normalizarPrecioInmobiliario = (precio = {}, index = 0) => {
  const tipoPrecioId = String(pickFirst(
    precio.tipoPrecioId,
    precio.tipoPrecioInmobiliarioId,
    precio.catalogoTipoPrecioId,
    precio.catalogoId,
    precio.idTipoPrecio
  ) ?? '').trim();
  const tipoPrecioNombre = String(pickFirst(
    precio.tipoPrecioNombre,
    precio.nombreTipoPrecio,
    precio.tipoPrecio,
    precio.nombre,
    precio.esquema,
    precio.descripcion
  ) ?? '').trim() || 'Sin esquema';
  const tipoPrecioCodigo = normalizeText(pickFirst(
    precio.tipoPrecioCodigo,
    precio.codigo,
    precio.clave,
    tipoPrecioNombre
  ));
  const precioValor = pickFirst(precio.precio, precio.monto, precio.valor, precio.precioTotal, precio.precioDesde);

  return {
    id: String(pickFirst(precio.precioId, precio.id, precio.Id, `${tipoPrecioId || tipoPrecioCodigo}-${index}`) ?? '').trim(),
    tipoPrecioId,
    tipoPrecioCodigo,
    tipoPrecioNombre,
    descripcion: String(precio.descripcion ?? precio.detalle ?? '').trim(),
    precio: toNumberOrNull(precioValor),
    precioTexto: formatearMonedaMXN(precioValor),
    activo: precio.activo !== false,
    esPrincipal: precio.esPrincipal === true || precio.principal === true,
    orden: Number(precio.orden ?? index) || 0,
  };
};

export const normalizarPreciosInmobiliarios = (value) =>
  normalizarListaPrecios(value).map((precio, index) => normalizarPrecioInmobiliario(precio, index));

export const ordenarPreciosInmobiliarios = (precios = []) =>
  [...precios].sort((a, b) =>
    (a.esPrincipal === b.esPrincipal ? 0 : a.esPrincipal ? -1 : 1) ||
    (Number(a.orden ?? 0) - Number(b.orden ?? 0)) ||
    String(a.tipoPrecioNombre || '').localeCompare(String(b.tipoPrecioNombre || ''), 'es-MX', { numeric: true })
  );

export const filtrarPreciosActivos = (precios = []) => ordenarPreciosInmobiliarios(precios.filter((precio) => precio.activo !== false));

export const obtenerPrecioContado = (precios = []) => {
  const preciosActivos = filtrarPreciosActivos(precios);
  const contado = preciosActivos.find((precio) => PRECIO_CONTADO_KEYS.has(normalizeText(precio.tipoPrecioCodigo)) || PRECIO_CONTADO_KEYS.has(normalizeText(precio.tipoPrecioNombre)));
  return contado || preciosActivos[0] || null;
};

export const obtenerPrecioDesde = (precios = [], fallback = null) => {
  const precioContado = obtenerPrecioContado(precios);
  const primerPrecio = filtrarPreciosActivos(precios)[0] || null;
  return precioContado || primerPrecio || (fallback === null || fallback === undefined || fallback === '' ? null : {
    precio: toNumberOrNull(fallback),
    precioTexto: formatearMonedaMXN(fallback),
  });
};

export const tieneMasDeUnPrecioActivo = (precios = []) => filtrarPreciosActivos(precios).length > 1;

export const obtenerResumenPrecios = ({ precios = [], fallbackPrecio = null } = {}) => {
  const preciosNormalizados = ordenarPreciosInmobiliarios(normalizarPreciosInmobiliarios(precios));
  const preciosActivos = filtrarPreciosActivos(preciosNormalizados);
  const precioDesde = obtenerPrecioDesde(preciosActivos.length ? preciosActivos : preciosNormalizados, fallbackPrecio);
  const precioContado = obtenerPrecioContado(preciosActivos.length ? preciosActivos : preciosNormalizados);

  return {
    precios: preciosNormalizados,
    preciosActivos,
    precioDesde: precioDesde?.precio ?? toNumberOrNull(fallbackPrecio),
    precioDesdeTexto: formatearMonedaMXN(precioDesde?.precio ?? fallbackPrecio),
    precioContado: precioContado?.precio ?? null,
    precioContadoTexto: precioContado ? precioContado.precioTexto : '',
    precioContadoNombre: precioContado?.tipoPrecioNombre || '',
    tienePreciosActivos: preciosActivos.length > 0,
    tieneMasDeUnPrecioActivo: preciosActivos.length > 1,
    tienePrecioContado: Boolean(precioContado),
  };
};

export const determinarOrigenPrecio = ({ preciosPersonalizados = [], preciosModelo = [], fallbackPrecio = null } = {}) => {
  if (filtrarPreciosActivos(preciosPersonalizados).length > 0) {
    return 'PERSONALIZADO';
  }

  if (filtrarPreciosActivos(preciosModelo).length > 0) {
    return 'MODELO';
  }

  if (fallbackPrecio !== null && fallbackPrecio !== undefined && fallbackPrecio !== '') {
    return 'FALLBACK';
  }

  return '';
};

export const obtenerEtiquetaOrigenPrecio = (origen) => {
  switch (String(origen || '').toUpperCase()) {
    case 'PERSONALIZADO':
      return 'Personalizado';
    case 'MODELO':
      return 'Modelo';
    case 'FALLBACK':
      return 'Actual';
    default:
      return '';
  }
};

