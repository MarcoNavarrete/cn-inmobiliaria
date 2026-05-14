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
  const [svgMarkup, setSvgMarkup] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [tooltip, setTooltip] = useState(null);

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

  const seleccionarUnidad = (event) => {
    const unidad = getUnidadFromEvent(event);
    if (unidad) {
      onUnidadSelect?.(unidad);
    }
  };

  const seleccionarConTeclado = (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const unidad = getUnidadFromEvent(event);
    if (unidad) {
      event.preventDefault();
      onUnidadSelect?.(unidad);
    }
  };

  if (!svgUrl) {
    return <p className="proyecto-plano-state">Plano interactivo proximamente disponible.</p>;
  }

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
          className="proyecto-plano-stage"
          ref={stageRef}
          onMouseMove={mostrarTooltip}
          onMouseLeave={() => setTooltip(null)}
          onClick={seleccionarUnidad}
          onKeyDown={seleccionarConTeclado}
        >
          <div
            className="proyecto-plano-svg-inline"
            dangerouslySetInnerHTML={{ __html: svgInteractivo }}
          />
          {tooltip ? (
            <div className="proyecto-plano-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}>
              <strong>{tooltip.unidad.codigo}</strong>
              <span>{getStatusLabel(tooltip.unidad.estatus)}</span>
              <span>{tooltip.unidad.tipoUnidad}</span>
              <span>{formatCurrency(tooltip.unidad.precioTotal)}</span>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
