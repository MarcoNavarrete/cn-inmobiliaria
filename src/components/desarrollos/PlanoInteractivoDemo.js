import React, { useEffect, useMemo, useRef, useState } from 'react';
import { resolveApiAssetUrl } from '../../services/apiClient';
import { obtenerPlanoPublico } from '../../services/adminDesarrolloPlanoService';
import { listarUnidadesPorDesarrollo } from '../../services/desarrolloUnidadesService';
import './PlanoInteractivoDemo.css';

const ESTATUS_LABELS = {
  DISPONIBLE: 'Disponible',
  APARTADO: 'Apartado',
  VENDIDO: 'Vendido',
  CONSTRUCCION: 'Construccion',
  BLOQUEADO: 'Bloqueado',
};

const normalizeStatus = (status) =>
  String(status || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

const getStatusClass = (status) => `is-${normalizeStatus(status).toLowerCase()}`;

const getStatusLabel = (status) => {
  const normalized = normalizeStatus(status);
  return ESTATUS_LABELS[normalized] || String(status || 'Sin estatus');
};

const ESTATUS_COLORS = {
  DISPONIBLE: '#22c55e',
  APARTADO: '#facc15',
  VENDIDO: '#ef4444',
  CONSTRUCCION: '#ffffff',
  BLOQUEADO: '#9ca3af',
};

const PAINTABLE_SELECTOR = 'rect,path,polygon,polyline,circle,ellipse,line';
const AREA_TAGS = new Set(['rect', 'path', 'polygon', 'circle', 'ellipse']);
const IS_DEVELOPMENT = process.env.NODE_ENV === 'development';

const getStatusColor = (status) =>
  ESTATUS_COLORS[normalizeStatus(status)] || ESTATUS_COLORS.BLOQUEADO;

const getPaintableElements = (element) => {
  const tagName = element?.tagName?.toLowerCase();
  if (!tagName) return [];

  if (tagName === 'g') {
    return Array.from(element.querySelectorAll(PAINTABLE_SELECTOR));
  }

  if (element.matches?.(PAINTABLE_SELECTOR)) {
    return [element];
  }

  return Array.from(element.querySelectorAll?.(PAINTABLE_SELECTOR) || []);
};

const applyUnitPaint = (element, unidad, selected) => {
  const color = getStatusColor(unidad.estatus);
  const paintableElements = getPaintableElements(element);
  const elementsToInspect = [element, ...paintableElements];
  const hadFillNone = elementsToInspect.some((candidate) => {
    const originalFill = candidate.getAttribute('fill');
    const originalStyle = candidate.getAttribute('style') || '';
    return (
      String(originalFill || '').trim().toLowerCase() === 'none' ||
      /(?:^|;)\s*fill\s*:\s*none(?:\s*!important)?\s*(?:;|$)/i.test(originalStyle)
    );
  });

  element.classList.add('plano-demo-unit', getStatusClass(unidad.estatus));
  element.style.setProperty('--plano-unit-status-color', color);
  if (selected) {
    element.classList.add('is-selected');
  }

  paintableElements.forEach((shape) => {
    const tagName = shape.tagName.toLowerCase();
    const hasArea = AREA_TAGS.has(tagName);

    shape.classList.add('plano-demo-unit-shape');
    shape.removeAttribute('fill');
    shape.style.setProperty('fill', hasArea ? color : 'none', 'important');
    shape.style.setProperty('fill-opacity', 'var(--plano-unit-fill-opacity, 0.45)', 'important');
    shape.style.setProperty(
      'stroke',
      'var(--plano-unit-stroke, var(--plano-unit-status-color, #071521))',
      'important'
    );
    shape.style.setProperty('stroke-opacity', '1', 'important');
    shape.style.setProperty('stroke-width', 'var(--plano-unit-stroke-width, 0.35)', 'important');
    shape.style.setProperty('pointer-events', 'all', 'important');
    shape.style.setProperty('cursor', 'pointer', 'important');

    if (IS_DEVELOPMENT && !hasArea) {
      console.warn('[PlanoInteractivoDemo] Unidad sin area rellenable', {
        svgElementId: unidad.svgElementId,
        tagName,
      });
    }
  });

  if (IS_DEVELOPMENT) {
    console.debug('[PlanoInteractivoDemo] Pintado de unidad SVG', {
      svgElementId: unidad.svgElementId,
      existe: true,
      tagName: element.tagName.toLowerCase(),
      estatus: unidad.estatus,
      color,
      teniaFillNone: hadFillNone,
      esGrupo: element.tagName.toLowerCase() === 'g',
      hijosPintables: paintableElements.length,
    });
  }
};

const ZOOM_MIN = 0.4;
const ZOOM_MAX = 3;
const ZOOM_STEP = 0.2;
const DRAG_THRESHOLD = 4;
const VISTA_INICIAL = {
  zoom: 1,
  translateX: 0,
  translateY: 0,
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const normalizarVista = (value) => ({
  ...VISTA_INICIAL,
  ...(value || {}),
});

const formatCurrency = (value) => {
  if (!value || Number.isNaN(Number(value))) {
    return 'Precio por confirmar';
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

const unidadShapes = [
  { id: 'unidad-101', label: '101', type: 'rect', x: 68, y: 86, width: 116, height: 78 },
  { id: 'unidad-102', label: '102', type: 'rect', x: 194, y: 86, width: 116, height: 78 },
  { id: 'unidad-103', label: '103', type: 'polygon', points: '320,86 448,86 430,164 320,164' },
  { id: 'unidad-104', label: '104', type: 'polygon', points: '68,248 184,218 184,316 68,316' },
  { id: 'unidad-105', label: '105', type: 'rect', x: 196, y: 218, width: 116, height: 98 },
  { id: 'unidad-106', label: '106', type: 'polygon', points: '324,218 448,248 448,316 324,316' },
];

const isInternalSvgUrl = (value) => {
  const url = String(value || '').trim();
  return /^\/uploads\/.+\.svg($|\?)/i.test(url) || /^\.?\/assets\/.+\.svg($|\?)/i.test(url);
};

const sanitizeSvg = (svgText) =>
  String(svgText || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\s(?:href|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\1/gi, '');

const buildDemoSvg = () => `
  <svg viewBox="0 0 520 390" role="img" aria-label="Plano interactivo demo de unidades">
    <defs>
      <filter id="plano-shadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#071521" flood-opacity="0.16" />
      </filter>
    </defs>
    <rect x="22" y="26" width="476" height="338" rx="18" class="plano-demo-base" />
    <path d="M40 194 H480" class="plano-demo-street" />
    <path d="M472 54 V338" class="plano-demo-street secondary" />
    <text x="54" y="198" class="plano-demo-street-label">Paseo central</text>
    <text x="462" y="188" class="plano-demo-street-label rotate">Acceso</text>
    ${unidadShapes.map((shape) => {
      const labelX = shape.x ? shape.x + 58 : 382;
      const labelY = shape.y ? shape.y + 45 : shape.label === '103' ? 129 : 272;
      const figure = shape.type === 'rect'
        ? `<rect id="${shape.id}" class="plano-demo-unit" x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="10" />`
        : `<polygon id="${shape.id}" class="plano-demo-unit" points="${shape.points}" />`;

      return `<g class="plano-demo-unit-group">${figure}<text class="plano-demo-unit-label" x="${labelX}" y="${labelY}">${shape.label}</text></g>`;
    }).join('')}
  </svg>
`;

export default function PlanoInteractivoDemo({
  desarrolloId,
  onApartarUnidad,
  onUnidadSelect,
  requireRealSvg = false,
  onUnavailable,
}) {
  const svgContainerRef = useRef(null);
  const dragStartRef = useRef(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const activePointerIdRef = useRef(null);
  const [unidades, setUnidades] = useState([]);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [svgMarkup, setSvgMarkup] = useState(requireRealSvg ? '' : buildDemoSvg());
  const [svgRealDisponible, setSvgRealDisponible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [vista, setVista] = useState(VISTA_INICIAL);
  const [isPanning, setIsPanning] = useState(false);
  const unidadesPorSvgId = useMemo(
    () => Object.fromEntries(unidades.map((unidad) => [unidad.svgElementId, unidad])),
    [unidades]
  );

  useEffect(() => {
    if (!desarrolloId) {
      setLoading(false);
      if (requireRealSvg) {
        onUnavailable?.();
      } else {
        setError('No se encontro el desarrollo para cargar unidades.');
      }
      return undefined;
    }

    const controller = new AbortController();

    const cargarDatos = async () => {
      setLoading(true);
      setError('');

      try {
        const [data, plano] = await Promise.all([
          listarUnidadesPorDesarrollo(desarrolloId, { signal: controller.signal }),
          obtenerPlanoPublico(desarrolloId, { signal: controller.signal }).catch(() => null),
        ]);

        if (plano?.activo && plano.svgUrl && isInternalSvgUrl(plano.svgUrl)) {
          const response = await fetch(resolveApiAssetUrl(plano.svgUrl), { signal: controller.signal });
          const text = response.ok ? await response.text() : '';
          if (text) {
            setSvgMarkup(sanitizeSvg(text));
            setSvgRealDisponible(true);
          } else if (requireRealSvg) {
            setSvgMarkup('');
            setSvgRealDisponible(false);
            onUnavailable?.();
            return;
          } else {
            setSvgMarkup(buildDemoSvg());
            setSvgRealDisponible(false);
          }
        } else if (requireRealSvg) {
          setSvgMarkup('');
          setSvgRealDisponible(false);
          onUnavailable?.();
          return;
        } else {
          setSvgMarkup(buildDemoSvg());
          setSvgRealDisponible(false);
        }

        setUnidades(data);
        setUnidadSeleccionada((actual) => {
          if (actual && data.some((unidad) => unidad.unidadId === actual.unidadId)) {
            return data.find((unidad) => unidad.unidadId === actual.unidadId);
          }

          return data[0] || null;
        });
      } catch (err) {
        if (err.name !== 'AbortError') {
          setUnidades([]);
          setUnidadSeleccionada(null);
          if (requireRealSvg) {
            setSvgMarkup('');
            setSvgRealDisponible(false);
            onUnavailable?.();
          } else {
            setError(err.data?.mensaje || err.data?.message || 'No fue posible cargar las unidades del desarrollo.');
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargarDatos();

    return () => controller.abort();
  }, [desarrolloId, onUnavailable, requireRealSvg]);

  useEffect(() => {
    setTooltip(null);
    setVista(VISTA_INICIAL);
    dragStartRef.current = null;
    isDraggingRef.current = false;
    hasDraggedRef.current = false;
    activePointerIdRef.current = null;
    setIsPanning(false);

    return () => {
      setTooltip(null);
      dragStartRef.current = null;
      isDraggingRef.current = false;
      activePointerIdRef.current = null;
    };
  }, [svgMarkup]);

  useEffect(() => () => {
    dragStartRef.current = null;
    isDraggingRef.current = false;
    hasDraggedRef.current = false;
    activePointerIdRef.current = null;
  }, []);

  const svgConInteraccion = useMemo(() => {
    if (requireRealSvg && !svgMarkup) {
      return '';
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
      return requireRealSvg ? '' : buildDemoSvg();
    }

    svg.querySelectorAll('text').forEach((textElement) => {
      textElement.setAttribute('pointer-events', 'none');
    });

    unidades.forEach((unidad) => {
      const element = svg.querySelector(`#${CSS.escape(unidad.svgElementId)}`);
      if (!element) {
        if (IS_DEVELOPMENT) {
          console.warn('[PlanoInteractivoDemo] No se encontro svgElementId', {
            svgElementId: unidad.svgElementId,
            estatus: unidad.estatus,
          });
        }
        return;
      }

      element.setAttribute('data-svg-element-id', unidad.svgElementId);
      element.setAttribute('data-unidad-id', unidad.unidadId || unidad.id || unidad.codigoUnidad || unidad.svgElementId);
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');

      applyUnitPaint(
        element,
        unidad,
        unidadSeleccionada?.svgElementId === unidad.svgElementId
      );
    });

    return sanitizeSvg(svg.outerHTML);
  }, [requireRealSvg, svgMarkup, unidadSeleccionada?.svgElementId, unidades]);

  const mostrarTooltip = (event, unidad) => {
    if (!event || !unidad) {
      setTooltip(null);
      return;
    }

    const contenedor = svgContainerRef.current;
    if (!contenedor || typeof contenedor.getBoundingClientRect !== 'function') {
      setTooltip(null);
      return;
    }

    if (!Number.isFinite(event.clientX) || !Number.isFinite(event.clientY)) {
      setTooltip(null);
      return;
    }

    const bounds = contenedor.getBoundingClientRect();
    setTooltip({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      unidad,
    });
  };

  const obtenerUnidadDesdeEvento = (event) => {
    const target = event?.target;
    if (!target) return null;

    const element = target.closest?.('[data-svg-element-id]');
    if (element) {
      return unidadesPorSvgId[element.getAttribute('data-svg-element-id')] || null;
    }

    const id = target.id || target.closest?.('[id]')?.id;
    return id ? unidadesPorSvgId[id] || null : null;
  };

  const manejarMouseMoveSvg = (event) => {
    if (isDraggingRef.current || hasDraggedRef.current) {
      setTooltip(null);
      return;
    }

    const unidad = obtenerUnidadDesdeEvento(event);
    if (!unidad) {
      setTooltip(null);
      return;
    }

    mostrarTooltip(event, unidad);
  };

  const manejarKeyDownSvg = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const unidad = obtenerUnidadDesdeEvento(event);
    if (!unidad) return;
    event.preventDefault();
    setUnidadSeleccionada(unidad);
    onUnidadSelect?.(unidad);
  };

  const actualizarZoom = (delta, punto = null) => {
    setVista((actual) => {
      const safeActual = normalizarVista(actual);
      const siguienteZoom = clamp(Number((safeActual.zoom + delta).toFixed(2)), ZOOM_MIN, ZOOM_MAX);
      if (siguienteZoom === safeActual.zoom) {
        return safeActual;
      }

      if (!punto) {
        return {
          ...safeActual,
          zoom: siguienteZoom,
        };
      }

      const ratio = siguienteZoom / safeActual.zoom;
      return {
        ...safeActual,
        zoom: siguienteZoom,
        translateX: punto.x - (punto.x - safeActual.translateX) * ratio,
        translateY: punto.y - (punto.y - safeActual.translateY) * ratio,
      };
    });
  };

  const restablecerVista = () => {
    dragStartRef.current = null;
    isDraggingRef.current = false;
    hasDraggedRef.current = false;
    activePointerIdRef.current = null;
    setTooltip(null);
    setIsPanning(false);
    setVista(VISTA_INICIAL);
  };

  const iniciarPointer = (event) => {
    if (event.button !== undefined && event.button !== 0) {
      return;
    }

    const unidadInicial = obtenerUnidadDesdeEvento(event);
    activePointerIdRef.current = event.pointerId;
    const vistaActual = normalizarVista(vista);
    dragStartRef.current = {
      clientX: event.clientX,
      clientY: event.clientY,
      translateX: vistaActual.translateX,
      translateY: vistaActual.translateY,
      unidadInicial,
    };
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    setTooltip(null);

    if (event.currentTarget?.setPointerCapture) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const moverPointer = (event) => {
    if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
      return;
    }

    if (!dragStartRef.current) {
      manejarMouseMoveSvg(event);
      return;
    }

    const dragStart = dragStartRef.current;
    if (
      !dragStart ||
      !Number.isFinite(dragStart.clientX) ||
      !Number.isFinite(dragStart.clientY) ||
      !Number.isFinite(dragStart.translateX) ||
      !Number.isFinite(dragStart.translateY)
    ) {
      return;
    }

    const deltaX = event.clientX - dragStart.clientX;
    const deltaY = event.clientY - dragStart.clientY;
    const nextHasDragged = Math.abs(deltaX) > DRAG_THRESHOLD || Math.abs(deltaY) > DRAG_THRESHOLD;

    if (!nextHasDragged) {
      return;
    }

    hasDraggedRef.current = true;
    if (!isPanning) {
      setIsPanning(true);
    }

    event.preventDefault();
    setTooltip(null);
    setVista((actual) => {
      const safeActual = normalizarVista(actual);
      return {
        ...safeActual,
        translateX: dragStart.translateX + deltaX,
        translateY: dragStart.translateY + deltaY,
      };
    });
  };

  const terminarPointer = (event) => {
    if (activePointerIdRef.current !== null && event.pointerId !== activePointerIdRef.current) {
      return;
    }

    const shouldSelect = !hasDraggedRef.current;
    const unidad = shouldSelect ? dragStartRef.current?.unidadInicial || obtenerUnidadDesdeEvento(event) : null;

    if (unidad) {
      setUnidadSeleccionada(unidad);
      onUnidadSelect?.(unidad);
      setTooltip(null);
    }

    if (event.currentTarget?.releasePointerCapture && activePointerIdRef.current !== null) {
      try {
        event.currentTarget.releasePointerCapture(activePointerIdRef.current);
      } catch (_) {
        // Pointer capture can be released by the browser before pointerup.
      }
    }

    dragStartRef.current = null;
    isDraggingRef.current = false;
    hasDraggedRef.current = false;
    activePointerIdRef.current = null;
    setIsPanning(false);
  };

  const cancelarPointer = (event) => {
    if (event?.currentTarget?.releasePointerCapture && activePointerIdRef.current !== null) {
      try {
        event.currentTarget.releasePointerCapture(activePointerIdRef.current);
      } catch (_) {
        // Pointer capture can be released by the browser before cancel.
      }
    }

    dragStartRef.current = null;
    isDraggingRef.current = false;
    hasDraggedRef.current = false;
    activePointerIdRef.current = null;
    setIsPanning(false);
    setTooltip(null);
  };

  const manejarWheel = (event) => {
    event.preventDefault();

    const contenedor = svgContainerRef.current;
    if (!contenedor || typeof contenedor.getBoundingClientRect !== 'function') {
      actualizarZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP);
      return;
    }

    const bounds = contenedor.getBoundingClientRect();
    actualizarZoom(event.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP, {
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  if (requireRealSvg && (!svgRealDisponible || !svgConInteraccion)) {
    return null;
  }

  const vistaSegura = normalizarVista(vista);

  return (
    <div className="plano-demo">
      <div className="plano-demo-map-card">
        <div className="plano-demo-map-head">
          <div>
            <h3>Disponibilidad por unidad</h3>
            <p>{svgRealDisponible ? 'Plano interactivo del desarrollo.' : 'Vista demo temporal mientras se configura el SVG del desarrollo.'}</p>
          </div>
          <div className="plano-demo-legend">
            {Object.keys(ESTATUS_LABELS).map((estatus) => (
              <span key={estatus} className={getStatusClass(estatus)}>
                <i />
                {ESTATUS_LABELS[estatus]}
              </span>
            ))}
          </div>
        </div>

        {loading ? <p className="plano-demo-state">Cargando disponibilidad...</p> : null}
        {error ? <p className="plano-demo-state is-error">{error}</p> : null}
        {!loading && !error && unidades.length === 0 ? (
          <p className="plano-demo-state">Aun no hay unidades publicadas para este desarrollo.</p>
        ) : null}

        <div className="plano-demo-scroll">
          <div
            ref={svgContainerRef}
            className={`plano-demo-stage ${isPanning ? 'is-dragging' : ''}`}
            onPointerCancel={cancelarPointer}
            onPointerDown={iniciarPointer}
            onPointerLeave={cancelarPointer}
            onPointerMove={moverPointer}
            onPointerUp={terminarPointer}
            onWheel={manejarWheel}
          >
            <div
              className="plano-demo-controls"
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => event.stopPropagation()}
            >
              <button type="button" onClick={() => actualizarZoom(ZOOM_STEP)} aria-label="Acercar plano">+</button>
              <button type="button" onClick={() => actualizarZoom(-ZOOM_STEP)} aria-label="Alejar plano">-</button>
              <button type="button" onClick={restablecerVista}>Restablecer</button>
            </div>
            <div
              className="plano-demo-svg-inline"
              onKeyDown={manejarKeyDownSvg}
              onPointerLeave={() => setTooltip(null)}
              style={{
                transform: `translate(${vistaSegura.translateX}px, ${vistaSegura.translateY}px) scale(${vistaSegura.zoom})`,
              }}
              dangerouslySetInnerHTML={{ __html: svgConInteraccion }}
            />

            {tooltip ? (
              <div className="plano-demo-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}>
                <strong>Unidad {tooltip.unidad.codigoUnidad}</strong>
                <span>{tooltip.unidad.modeloNombre}</span>
                <span>{getStatusLabel(tooltip.unidad.estatus)}</span>
                <span>{tooltip.unidad.precioDesdeTexto || tooltip.unidad.precioTexto || formatCurrency(tooltip.unidad.precio)}</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <aside className="plano-demo-panel">
        {unidadSeleccionada ? (
          <>
            <p className="plano-demo-eyebrow">Unidad seleccionada</p>
            <h3>Unidad {unidadSeleccionada.codigoUnidad}</h3>
            <div className="plano-demo-price-summary">
              <strong>{unidadSeleccionada.precioDesdeTexto || unidadSeleccionada.precioTexto || formatCurrency(unidadSeleccionada.precio)}</strong>
              {unidadSeleccionada.precioContadoTexto ? <span>Precio de contado</span> : null}
              {unidadSeleccionada.tieneMasDeUnPrecioActivo ? <span>Otros esquemas de financiamiento disponibles</span> : null}
            </div>
            <dl>
              <div><dt>Manzana</dt><dd>{unidadSeleccionada.manzana || 'Sin dato'}</dd></div>
              <div><dt>Modelo</dt><dd>{unidadSeleccionada.modeloNombre}</dd></div>
              <div><dt>Precio</dt><dd>{unidadSeleccionada.precioDesdeTexto || unidadSeleccionada.precioTexto || formatCurrency(unidadSeleccionada.precio)}</dd></div>
              <div><dt>Terreno</dt><dd>{unidadSeleccionada.terrenoM2 ? `${unidadSeleccionada.terrenoM2} m2` : 'Sin dato'}</dd></div>
              <div><dt>Construccion</dt><dd>{unidadSeleccionada.construccionM2 ? `${unidadSeleccionada.construccionM2} m2` : 'Sin dato'}</dd></div>
              <div><dt>Estatus</dt><dd>{getStatusLabel(unidadSeleccionada.estatus)}</dd></div>
            </dl>
            {unidadSeleccionada.preciosActivos?.length ? (
              <div className="plano-demo-prices">
                <h4>Precios disponibles</h4>
                <div className="plano-demo-prices-grid">
                  {unidadSeleccionada.preciosActivos.map((precio) => (
                    <article key={precio.id || `${unidadSeleccionada.unidadId}-${precio.tipoPrecioId || precio.tipoPrecioCodigo || precio.tipoPrecioNombre}`}>
                      <span>{precio.tipoPrecioNombre}</span>
                      <strong>{precio.precioTexto || formatCurrency(precio.precio)}</strong>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}
            {['DISPONIBLE', 'CONSTRUCCION'].includes(normalizeStatus(unidadSeleccionada.estatus)) ? (
              <button type="button" onClick={() => onApartarUnidad?.(unidadSeleccionada)}>
                Apartar unidad
              </button>
            ) : (
              <span className="plano-demo-panel-note">Esta unidad no esta disponible para apartado.</span>
            )}
          </>
        ) : (
          <span className="plano-demo-panel-note">Selecciona una unidad disponible en el plano.</span>
        )}
      </aside>
    </div>
  );
}
