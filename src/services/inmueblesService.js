import { getJson, requestJson, resolveApiAssetUrl } from './apiClient';

const formatCurrency = (amount, currency = 'MXN') => {
  if (amount === null || amount === undefined || Number.isNaN(Number(amount))) {
    return 'Precio no disponible';
  }

  try {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount));
  } catch (_) {
    return `${amount} ${currency}`.trim();
  }
};

export const MODALIDADES_OPERACION = ['VENTA', 'RENTA', 'VENTA_RENTA'];

export const MODALIDAD_OPERACION_LABELS = {
  VENTA: 'En venta',
  RENTA: 'En renta',
  VENTA_RENTA: 'En venta y renta',
};

export const normalizeModalidadOperacion = (value) => {
  const modalidad = toStringOrEmpty(value).trim().toUpperCase();
  return MODALIDADES_OPERACION.includes(modalidad) ? modalidad : 'VENTA';
};

export const getModalidadOperacionLabel = (value) =>
  MODALIDAD_OPERACION_LABELS[normalizeModalidadOperacion(value)] || MODALIDAD_OPERACION_LABELS.VENTA;

const normalizePrecioOperacion = (inmueble = {}) => {
  const modalidadOperacion = normalizeModalidadOperacion(inmueble.modalidadOperacion);
  const precioLegacy = toNumberOrNull(inmueble.precio);
  const precioVenta = toNumberOrNull(inmueble.precioVenta ?? (modalidadOperacion !== 'RENTA' ? inmueble.precio : null));
  const rentaMensual = toNumberOrNull(inmueble.rentaMensual ?? (modalidadOperacion === 'RENTA' ? inmueble.precio : null));

  return {
    modalidadOperacion,
    precioLegacy,
    precioVenta,
    rentaMensual,
  };
};

export const getPrecioOperacionLineas = (inmueble = {}) => {
  const moneda = inmueble.moneda || 'MXN';
  const { modalidadOperacion, precioLegacy, precioVenta, rentaMensual } = normalizePrecioOperacion(inmueble);
  const venta = precioVenta ?? precioLegacy;
  const renta = rentaMensual ?? (modalidadOperacion === 'RENTA' ? precioLegacy : null);

  if (modalidadOperacion === 'RENTA') {
    return [{ key: 'renta', label: 'Renta', text: `${formatCurrency(renta, moneda)} / mes` }];
  }

  if (modalidadOperacion === 'VENTA_RENTA') {
    return [
      { key: 'venta', label: 'Venta', text: `Venta: ${formatCurrency(venta, moneda)}` },
      { key: 'renta', label: 'Renta', text: `Renta: ${formatCurrency(renta, moneda)} / mes` },
    ];
  }

  return [{ key: 'venta', label: 'Venta', text: formatCurrency(venta, moneda) }];
};

export const formatPrecioOperacion = (inmueble = {}) => {
  const lineas = getPrecioOperacionLineas(inmueble).map((linea) => linea.text);
  return lineas.length ? lineas.join('\n') : (inmueble.etiquetaPrecio || formatCurrency(inmueble.precio, inmueble.moneda));
};

const buildUbicacion = (inmueble) =>
  [
    inmueble.direccion,
    inmueble.coloniaNombre,
    inmueble.municipioNombre,
    inmueble.estadoNombre,
  ]
    .filter(Boolean)
    .join(', ');

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

const toNumberOrNull = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toStringOrEmpty = (value) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value);
};

const ESTATUS_INMUEBLE_VALIDOS = [
  'BORRADOR',
  'PENDIENTE_REVISION',
  'DISPONIBLE',
  'APARTADO',
  'VENDIDO',
  'RECHAZADO',
  'INACTIVO',
];

const normalizeEstatus = (value) => {
  const estatus = toStringOrEmpty(value).trim().toUpperCase();
  return ESTATUS_INMUEBLE_VALIDOS.includes(estatus) ? estatus : 'BORRADOR';
};

const extractImagenes = (inmueble) => {
  const imagenes = Array.isArray(inmueble?.imagenes)
    ? inmueble.imagenes
    : Array.isArray(inmueble?.fotos)
      ? inmueble.fotos
      : [];

  return imagenes
    .map((imagen) => {
      if (typeof imagen === 'string') {
        return resolveApiAssetUrl(imagen);
      }

      return resolveApiAssetUrl(
        imagen?.urlImagen ||
          imagen?.url ||
          imagen?.imagenUrl ||
          imagen?.rutaImagen
      );
    })
    .filter(Boolean);
};

const extractImagenPrincipal = (inmueble, imagenes = []) => {
  const imagenPrincipal =
    inmueble?.imagenPrincipal ||
    inmueble?.urlImagenPrincipal ||
    inmueble?.imagen?.urlImagen ||
    imagenes[0] ||
    '';

  return imagenPrincipal ? resolveApiAssetUrl(imagenPrincipal) : '';
};

const extractVideo = (inmueble) => {
  const url =
    inmueble?.video ||
    inmueble?.videoUrl ||
    '';

  if (!url) {
    return '';
  }

  const normalizedUrl = resolveApiAssetUrl(url);
  const isVideo =
    inmueble?.visitaVirtual?.tipo?.toLowerCase?.() === 'video' ||
    /\.(mp4|webm|ogg)$/i.test(normalizedUrl);

  return isVideo ? normalizedUrl : '';
};

const extractVisitaVirtual = (inmueble) => {
  const visitaVirtual = inmueble?.visitaVirtual;

  if (!visitaVirtual?.urlVisita) {
    return null;
  }

  return {
    tipo: visitaVirtual.tipo || '',
    urlVisita: resolveApiAssetUrl(visitaVirtual.urlVisita),
    proveedor: visitaVirtual.proveedor || '',
  };
};

const adaptCaracteristica = (item) => {
  if (!item) {
    return null;
  }

  if (item.tipo === 'grupo' && Array.isArray(item.opciones)) {
    return {
      tipo: 'grupo',
      titulo: item.titulo || item.nombre || 'Detalles',
      opciones: item.opciones.filter(Boolean),
    };
  }

  const nombre = item.nombre && item.nombre !== 'texto' ? item.nombre : '';
  const valor = item.valor || item.texto || '';
  const texto = [nombre, valor].filter(Boolean).join(': ');

  if (!texto) {
    return null;
  }

  return {
    tipo: 'simple',
    texto,
  };
};

const adaptInmueble = (inmueble) => {
  const imagenes = extractImagenes(inmueble);
  const imagenPrincipal = extractImagenPrincipal(inmueble, imagenes);
  const visitaVirtual = extractVisitaVirtual(inmueble);
  const tipoInmueble = toStringOrEmpty(pickFirst(inmueble.tipoInmueble, inmueble.tipo_inmueble, inmueble.TipoInmueble, inmueble.tipoInmuebleId));
  const tipoInmuebleNombre = toStringOrEmpty(
    pickFirst(
      inmueble.tipoInmuebleNombre,
      inmueble.tipo_inmueble_nombre,
      inmueble.nombreTipoInmueble,
      inmueble.tipoNombre,
      inmueble.tipoDescripcion,
      inmueble.tipoInmuebleTexto
    )
  );
  const caracteristicasAdaptadas = Array.isArray(inmueble.caracteristicas)
    ? inmueble.caracteristicas.map(adaptCaracteristica).filter(Boolean)
    : [];
  const ubicacion =
    buildUbicacion(inmueble) ||
    inmueble.ubicacion ||
    inmueble.localidadNombre ||
    'Ubicacion no disponible';

  const modalidadOperacion = normalizeModalidadOperacion(inmueble.modalidadOperacion);
  const precioVenta = toNumberOrNull(inmueble.precioVenta ?? (modalidadOperacion !== 'RENTA' ? inmueble.precio : null));
  const rentaMensual = toNumberOrNull(inmueble.rentaMensual ?? (modalidadOperacion === 'RENTA' ? inmueble.precio : null));
  const precioBase = toNumberOrNull(inmueble.precio);
  const precioLineas = getPrecioOperacionLineas({
    ...inmueble,
    modalidadOperacion,
    precioVenta,
    rentaMensual,
  });

  return {
    id: String(inmueble.inmuebleId ?? inmueble.id ?? ''),
    titulo: inmueble.titulo || 'Propiedad sin titulo',
    modalidadOperacion,
    modalidadOperacionLabel: getModalidadOperacionLabel(modalidadOperacion),
    precioVenta,
    rentaMensual,
    precioValor: precioBase,
    etiquetaPrecio: inmueble.etiquetaPrecio || '',
    precioLineas,
    precio: formatPrecioOperacion({
      ...inmueble,
      modalidadOperacion,
      precioVenta,
      rentaMensual,
    }),
    ubicacion,
    descripcion: inmueble.descripcion || 'Sin descripcion disponible.',
    tipoInmueble,
    tipoInmuebleNombre,
    latitud: inmueble.latitud,
    longitud: inmueble.longitud,
    video: extractVideo(inmueble),
    visitaVirtual,
    imagenPrincipal,
    imagenes,
    caracteristicas: caracteristicasAdaptadas.length > 0
      ? caracteristicasAdaptadas
      : [
          inmueble.superficieM2
            ? {
                tipo: 'simple',
                texto: `${inmueble.superficieM2} m2 de terreno`,
              }
            : null,
          inmueble.construccionM2
            ? {
                tipo: 'simple',
                texto: `${inmueble.construccionM2} m2 de construccion`,
              }
            : null,
        ].filter(Boolean),
  };
};

export const obtenerInmueblesPublicos = async (filtros = {}, options = {}) => {
  const data = await getJson('/api/inmuebles/publicos', {
    ...options,
    query: filtros,
  });

  return normalizeList(data).map(adaptInmueble);
};

export const obtenerDetalleInmueble = async (id, options = {}) => {
  const data = await getJson(`/api/inmuebles/${id}/detalle`, options);
  return adaptInmueble(data);
};

export const obtenerInmuebleAdmin = async (id, options = {}) =>
  getJson(`/api/inmuebles/${id}/detalle`, options);

const buildInmueblePayload = (inmueble) => {
  const modalidadOperacion = normalizeModalidadOperacion(inmueble.modalidadOperacion);
  const precioVenta = toNumberOrNull(inmueble.precioVenta);
  const rentaMensual = toNumberOrNull(inmueble.rentaMensual);
  const precio =
    modalidadOperacion === 'RENTA'
      ? null
      : precioVenta;

  return {
    titulo: inmueble.titulo || '',
    descripcion: inmueble.descripcion || '',
    tipoInmueble: toStringOrEmpty(inmueble.tipoInmueble).trim(),
    modalidadOperacion,
    estadoId: toStringOrEmpty(pickFirst(inmueble.estadoId, inmueble.EstadoId)),
    poblacionId: toStringOrEmpty(pickFirst(inmueble.poblacionId, inmueble.municipioId, inmueble.PoblacionId)),
    localidadId: toStringOrEmpty(pickFirst(inmueble.localidadId, inmueble.LocalidadId)),
    direccion: inmueble.direccion || '',
    referencia: inmueble.referencia || '',
    superficieM2: toNumberOrNull(inmueble.superficieM2),
    construccionM2: toNumberOrNull(inmueble.construccionM2),
    precioVenta: modalidadOperacion === 'RENTA' ? null : precioVenta,
    rentaMensual: modalidadOperacion === 'VENTA' ? null : rentaMensual,
    precio,
    recalcularPrecio: inmueble.recalcularPrecio === true || inmueble.recalcularPrecio === 'true',
    moneda: inmueble.moneda || 'MXN',
    estatus: normalizeEstatus(inmueble.estatus),
    destacado: inmueble.destacado === true || inmueble.destacado === 'true',
    latitud: toNumberOrNull(inmueble.latitud),
    longitud: toNumberOrNull(inmueble.longitud),
  };
};

const logPayloadInDevelopment = (payload) => {
  if (process.env.NODE_ENV === 'development') {
    console.log('[AdminInmueble] payload', JSON.stringify(payload, null, 2));
  }
};

export const crearInmueble = async (inmueble) => {
  const payload = buildInmueblePayload(inmueble);
  logPayloadInDevelopment(payload);

  return requestJson('/api/inmuebles', {
    method: 'POST',
    body: payload,
  });
};

export const actualizarInmueble = async (id, inmueble) => {
  const payload = buildInmueblePayload(inmueble);
  logPayloadInDevelopment(payload);

  return requestJson(`/api/inmuebles/${id}`, {
    method: 'PUT',
    body: payload,
  });
};

export const enviarRevisionInmueble = (id) =>
  requestJson(`/api/inmuebles/${id}/enviar-revision`, {
    method: 'POST',
  });

export const publicarInmueble = (id) =>
  requestJson(`/api/inmuebles/${id}/publicar`, {
    method: 'POST',
  });

export const rechazarInmueble = (id) =>
  requestJson(`/api/inmuebles/${id}/rechazar`, {
    method: 'POST',
  });

export const cambiarEstatusInmueble = (id, estatus) =>
  requestJson(`/api/inmuebles/${id}/estatus`, {
    method: 'PUT',
    body: {
      estatus,
    },
  });
