import React, { useEffect, useMemo, useRef, useState } from 'react';
import { resolveApiAssetUrl } from '../../services/apiClient';
import './ProyectoPlanoInteractivo.css';

const ESTATUS_LABELS = {
  DISPONIBLE: 'Disponible',
  APARTADO: 'Apartado',
  EN_PROCESO: 'En proceso',
  VENDIDO: 'Vendido',
  LIQUIDADO: 'Liquidado',
  BLOQUEADO: 'Bloqueado',
  NO_DISPONIBLE: 'No disponible',
};

const ESTATUS_COLORES = {
  DISPONIBLE: { fill: 'rgba(34, 197, 94, 0.56)', stroke: '#15803d' },
  APARTADO: { fill: 'rgba(250, 204, 21, 0.62)', stroke: '#a16207' },
  EN_PROCESO: { fill: 'rgba(59, 130, 246, 0.48)', stroke: '#1d4ed8' },
  VENDIDO: { fill: 'rgba(239, 68, 68, 0.52)', stroke: '#b91c1c' },
  LIQUIDADO: { fill: 'rgba(20, 184, 166, 0.52)', stroke: '#0f766e' },
  BLOQUEADO: { fill: 'rgba(156, 163, 175, 0.58)', stroke: '#4b5563' },
  NO_DISPONIBLE: { fill: 'rgba(75, 85, 99, 0.62)', stroke: '#1f2937' },
};

const SCRIPT_PROTOCOL = ['java', 'script:'].join('');

const normalizeStatus = (status) =>
  String(status || '')
    .trim()
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, '_');

const getStatusClass = (status) => `is-${normalizeStatus(status).toLowerCase()}`;

const getStatusLabel = (status) => ESTATUS_LABELS[normalizeStatus(status)] || String(status || 'Sin estatus');

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

      const estatus = normalizeStatus(unidad.estatus);
      const colores = ESTATUS_COLORES[estatus] || ESTATUS_COLORES.NO_DISPONIBLE;
      element.classList.add('proyecto-plano-unit', getStatusClass(estatus));
      if (String(selectedUnidadId || '') === String(unidad.id || unidad.unidadId)) {
        element.classList.add('is-selected');
      }

      element.setAttribute('data-svg-element-id', unidad.svgElementId);
      element.setAttribute('data-unidad-id', unidad.id || unidad.unidadId);
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');
      element.style.fill = colores.fill;
      element.style.stroke = colores.stroke;
      element.style.strokeWidth = String(selectedUnidadId || '') === String(unidad.id || unidad.unidadId) ? '4' : '2';
      element.style.cursor = 'pointer';
    });

    return sanitizeSvg(svg.outerHTML);
  }, [selectedUnidadId, svgMarkup, unidadesConSvg]);

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
        {Object.keys(ESTATUS_LABELS).map((estatus) => (
          <span key={estatus} className={getStatusClass(estatus)}>
            <i />
            {ESTATUS_LABELS[estatus]}
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

