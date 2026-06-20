import React, { useEffect, useMemo, useRef, useState } from 'react';
import { resolveApiAssetUrl } from '../../services/apiClient';
import {
  getColorConfigByStatus,
  hexToRgba,
  normalizeProyectoStatus,
  PROYECTO_ESTATUS_LABELS,
} from '../../utils/proyectoColoresEstatus';
import './ProyectoPlanoInteractivo.css';

const ESTATUS_LEYENDA = [
  'DISPONIBLE',
  'APARTADO',
  'CONSTRUCCION',
  'VENDIDO',
  'LIQUIDADO',
  'BLOQUEADO',
  'NO_DISPONIBLE',
];
const PAINTABLE_SELECTOR = 'rect,path,polygon,polyline,circle,ellipse,line';
const AREA_TAGS = new Set(['rect', 'path', 'polygon', 'circle', 'ellipse']);

const SCRIPT_PROTOCOL = ['java', 'script:'].join('');

const normalizeStatus = normalizeProyectoStatus;

const getStatusClass = (status) => `is-${normalizeStatus(status).toLowerCase()}`;

const getStatusLabel = (status) => PROYECTO_ESTATUS_LABELS[normalizeStatus(status)] || String(status || 'Sin estatus');

const getPaintableElements = (element) => {
  const tagName = element?.tagName?.toLowerCase();
  if (!tagName) return [];
  if (tagName === 'g') return Array.from(element.querySelectorAll(PAINTABLE_SELECTOR));
  if (element.matches?.(PAINTABLE_SELECTOR)) return [element];
  return Array.from(element.querySelectorAll?.(PAINTABLE_SELECTOR) || []);
};

const applyProyectoUnitPaint = (element, unidad, colorConfig, selected) => {
  const shapes = getPaintableElements(element);
  const opacity = Math.min(Math.max(Number(colorConfig.opacity), 0), 1);

  element.classList.add('proyecto-plano-unit', getStatusClass(unidad.estatus));
  element.style.setProperty('--proyecto-unit-color', colorConfig.colorHex);
  element.style.setProperty('--proyecto-unit-opacity', String(opacity));
  element.style.setProperty('--proyecto-unit-hover-opacity', String(Math.min(1, opacity + 0.16)));
  element.style.setProperty('--proyecto-unit-selected-opacity', String(Math.min(1, opacity + 0.24)));
  element.style.setProperty('--proyecto-unit-stroke', colorConfig.colorTextoHex || colorConfig.colorHex);
  if (selected) element.classList.add('is-selected');

  shapes.forEach((shape) => {
    const hasArea = AREA_TAGS.has(shape.tagName.toLowerCase());
    shape.classList.add('proyecto-plano-unit-shape');
    shape.removeAttribute('fill');
    shape.style.setProperty('fill', hasArea ? 'var(--proyecto-unit-color)' : 'none', 'important');
    shape.style.setProperty('fill-opacity', 'var(--proyecto-unit-current-opacity, var(--proyecto-unit-opacity))', 'important');
    shape.style.setProperty('stroke', 'var(--proyecto-unit-current-stroke, var(--proyecto-unit-stroke))', 'important');
    shape.style.setProperty('stroke-width', 'var(--proyecto-unit-stroke-width, 2)', 'important');
    shape.style.setProperty('pointer-events', 'all', 'important');
    shape.style.setProperty('cursor', 'pointer', 'important');
  });
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

const sanitizeSvg = (svgText) =>
  String(svgText || '')
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(new RegExp(`\\s(?:href|xlink:href)\\s*=\\s*(['"])\\s*${SCRIPT_PROTOCOL}[\\s\\S]*?\\1`, 'gi'), '');

const sanitizeSvgDom = (svg) => {
  svg.querySelectorAll('script, foreignObject, iframe, object, embed').forEach((element) => {
    element.remove();
  });

  svg.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      const value = String(attr.value || '').trim().toLowerCase();
      if (name.startsWith('on') || ((name === 'href' || name === 'xlink:href') && value.startsWith(SCRIPT_PROTOCOL))) {
        element.removeAttribute(attr.name);
      }
    });
  });
};

const escapeCssId = (value) => {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }

  return String(value).replace(/([ #;?%&,.+*~':"!^$[\]()=>|/@])/g, '\\$1');
};

const formatCurrency = (value) => {
  if (!value || Number.isNaN(Number(value))) return 'Precio por confirmar';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value));
};

export default function ProyectoPlanoInteractivo({
  svgUrl,
  unidades = [],
  coloresEstatus = [],
  selectedUnidadId,
  onUnidadSelect,
}) {
  const stageRef = useRef(null);
  const dragStartRef = useRef(null);
  const isDraggingRef = useRef(false);
  const hasDraggedRef = useRef(false);
  const activePointerIdRef = useRef(null);
  const [svgMarkup, setSvgMarkup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tooltip, setTooltip] = useState(null);
  const [vista, setVista] = useState(VISTA_INICIAL);
  const [isPanning, setIsPanning] = useState(false);

  const resolvedSvgUrl = useMemo(() => resolveApiAssetUrl(svgUrl), [svgUrl]);
  const unidadesConSvg = useMemo(() => unidades.filter((unidad) => unidad.svgElementId), [unidades]);
  const unidadesPorSvgId = useMemo(
    () => Object.fromEntries(unidadesConSvg.map((unidad) => [unidad.svgElementId, unidad])),
    [unidadesConSvg]
  );

  useEffect(() => {
    if (!resolvedSvgUrl) {
      setSvgMarkup('');
      setError('');
      return undefined;
    }

    const controller = new AbortController();
    setLoading(true);
    setError('');

    const cargarSvg = async () => {
      try {
        const response = await fetch(resolvedSvgUrl, { signal: controller.signal });
        if (!response.ok) {
          throw new Error('No fue posible cargar el plano interactivo.');
        }

        const text = await response.text();
        const limpio = sanitizeSvg(text);
        if (!limpio.includes('<svg')) {
          throw new Error('El plano configurado no es un SVG valido.');
        }

        setSvgMarkup(limpio);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'No fue posible cargar el plano interactivo.');
          setSvgMarkup('');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargarSvg();

    return () => controller.abort();
  }, [resolvedSvgUrl]);

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

  const svgInteractivo = useMemo(() => {
    if (!svgMarkup) return '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
    const svg = doc.querySelector('svg');
    if (!svg) return '';

    sanitizeSvgDom(svg);
    svg.classList.add('proyecto-plano-svg-root');
    svg.querySelectorAll('text').forEach((textElement) => {
      textElement.setAttribute('pointer-events', 'none');
    });

    unidadesConSvg.forEach((unidad) => {
      const element = svg.querySelector(`#${escapeCssId(unidad.svgElementId)}`);
      if (!element) return;

      const selected = String(selectedUnidadId || '') === String(unidad.id || unidad.unidadId);
      const colorConfig = getColorConfigByStatus(unidad.estatus, coloresEstatus);

      element.setAttribute('data-svg-element-id', unidad.svgElementId);
      element.setAttribute('data-unidad-id', unidad.id || unidad.unidadId);
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      applyProyectoUnitPaint(element, unidad, colorConfig, selected);
    });

    return sanitizeSvg(svg.outerHTML);
  }, [coloresEstatus, selectedUnidadId, svgMarkup, unidadesConSvg]);

  const leyenda = useMemo(
    () => ESTATUS_LEYENDA.map((estatus) => ({
      estatus,
      config: getColorConfigByStatus(estatus, coloresEstatus),
    })),
    [coloresEstatus]
  );

  const getUnidadFromEvent = (event) => {
    const element = event.target?.closest?.('[data-svg-element-id]');
    if (!element) return null;
    return unidadesPorSvgId[element.getAttribute('data-svg-element-id')] || null;
  };

  const mostrarTooltip = (event) => {
    if (isDraggingRef.current || hasDraggedRef.current) {
      setTooltip(null);
      return;
    }

    const unidad = getUnidadFromEvent(event);
    if (!unidad || !stageRef.current) {
      setTooltip(null);
      return;
    }

    const bounds = stageRef.current.getBoundingClientRect();
    setTooltip({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      unidad,
    });
  };

  const seleccionarConTeclado = (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const unidad = getUnidadFromEvent(event);
    if (unidad) {
      event.preventDefault();
      onUnidadSelect?.(unidad);
    }
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

    const unidadInicial = getUnidadFromEvent(event);
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
      mostrarTooltip(event);
      return;
    }

    const dragStart = dragStartRef.current;
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
    const unidad = shouldSelect ? dragStartRef.current?.unidadInicial || getUnidadFromEvent(event) : null;

    if (unidad) {
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

    const contenedor = stageRef.current;
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

  if (!svgUrl) {
    return <p className="proyecto-plano-state">Plano interactivo proximamente disponible.</p>;
  }

  const vistaSegura = normalizarVista(vista);

  return (
    <div className="proyecto-plano">
      <div className="proyecto-plano-legend">
        {leyenda.map(({ estatus, config }) => (
          <span
            key={estatus}
            className={getStatusClass(estatus)}
            style={{
              backgroundColor: hexToRgba(config.colorHex, 0.12),
              color: config.colorTextoHex,
            }}
          >
            <i style={{ backgroundColor: config.colorHex, borderColor: config.colorHex }} />
            {getStatusLabel(estatus)}
          </span>
        ))}
      </div>
      {loading ? <p className="proyecto-plano-state">Cargando plano interactivo...</p> : null}
      {error ? <p className="proyecto-plano-state is-error">{error}</p> : null}
      {!loading && svgInteractivo ? (
        <div
          className={`proyecto-plano-stage ${isPanning ? 'is-dragging' : ''}`}
          ref={stageRef}
          onPointerCancel={cancelarPointer}
          onPointerDown={iniciarPointer}
          onPointerLeave={cancelarPointer}
          onPointerMove={moverPointer}
          onPointerUp={terminarPointer}
          onWheel={manejarWheel}
        >
          <div
            className="proyecto-plano-controls"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <button type="button" onClick={() => actualizarZoom(ZOOM_STEP)} aria-label="Acercar plano">+</button>
            <button type="button" onClick={() => actualizarZoom(-ZOOM_STEP)} aria-label="Alejar plano">-</button>
            <button type="button" onClick={restablecerVista} aria-label="Restablecer vista del plano">Restablecer</button>
          </div>
          <div
            className="proyecto-plano-svg-inline"
            onKeyDown={seleccionarConTeclado}
            onPointerLeave={() => setTooltip(null)}
            style={{
              transform: `translate(${vistaSegura.translateX}px, ${vistaSegura.translateY}px) scale(${vistaSegura.zoom})`,
            }}
            dangerouslySetInnerHTML={{ __html: svgInteractivo }}
          />
          {tooltip ? (
            <div className="proyecto-plano-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}>
              <strong>{tooltip.unidad.codigo}</strong>
              <span>{getStatusLabel(tooltip.unidad.estatus)}</span>
              <span>{tooltip.unidad.tipoUnidad}</span>
              <span>{tooltip.unidad.precioDesdeTexto || tooltip.unidad.precioTotalTexto || formatCurrency(tooltip.unidad.precioTotal)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

