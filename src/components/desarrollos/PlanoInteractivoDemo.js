import React, { useEffect, useMemo, useState } from 'react';
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

export default function PlanoInteractivoDemo({ desarrolloId }) {
  const [unidades, setUnidades] = useState([]);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [svgMarkup, setSvgMarkup] = useState(buildDemoSvg());
  const [svgRealDisponible, setSvgRealDisponible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const unidadesPorSvgId = useMemo(
    () => Object.fromEntries(unidades.map((unidad) => [unidad.svgElementId, unidad])),
    [unidades]
  );

  useEffect(() => {
    if (!desarrolloId) {
      setLoading(false);
      setError('No se encontro el desarrollo para cargar unidades.');
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
          setSvgMarkup(text ? sanitizeSvg(text) : buildDemoSvg());
          setSvgRealDisponible(Boolean(text));
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
          setError(err.data?.mensaje || err.data?.message || 'No fue posible cargar las unidades del desarrollo.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargarDatos();

    return () => controller.abort();
  }, [desarrolloId]);

  const svgConInteraccion = useMemo(() => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svgMarkup, 'image/svg+xml');
    const svg = doc.querySelector('svg');

    if (!svg) {
      return buildDemoSvg();
    }

    unidades.forEach((unidad) => {
      const element = svg.querySelector(`#${CSS.escape(unidad.svgElementId)}`);
      if (!element) return;

      element.classList.add('plano-demo-unit', `is-${unidad.estatus.toLowerCase()}`);
      element.setAttribute('data-svg-element-id', unidad.svgElementId);
      element.setAttribute('role', 'button');
      element.setAttribute('tabindex', '0');

      if (unidadSeleccionada?.svgElementId === unidad.svgElementId) {
        element.classList.add('is-selected');
      }
    });

    return sanitizeSvg(svg.outerHTML);
  }, [svgMarkup, unidadSeleccionada?.svgElementId, unidades]);

  const mostrarTooltip = (event, unidad) => {
    if (!unidad) {
      return;
    }

    const bounds = event.currentTarget.ownerSVGElement.getBoundingClientRect();
    setTooltip({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      unidad,
    });
  };

  const obtenerUnidadDesdeEvento = (event) => {
    const element = event.target.closest?.('[data-svg-element-id]');
    if (!element) return null;
    return unidadesPorSvgId[element.getAttribute('data-svg-element-id')] || null;
  };

  const manejarMouseMoveSvg = (event) => {
    const unidad = obtenerUnidadDesdeEvento(event);
    if (!unidad) {
      setTooltip(null);
      return;
    }

    mostrarTooltip(event, unidad);
  };

  const manejarClickSvg = (event) => {
    const unidad = obtenerUnidadDesdeEvento(event);
    if (unidad) setUnidadSeleccionada(unidad);
  };

  const manejarKeyDownSvg = (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const unidad = obtenerUnidadDesdeEvento(event);
    if (!unidad) return;
    event.preventDefault();
    setUnidadSeleccionada(unidad);
  };

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
              <span key={estatus}><i className={`is-${estatus.toLowerCase()}`} />{ESTATUS_LABELS[estatus]}</span>
            ))}
          </div>
        </div>

        {loading ? <p className="plano-demo-state">Cargando disponibilidad...</p> : null}
        {error ? <p className="plano-demo-state is-error">{error}</p> : null}
        {!loading && !error && unidades.length === 0 ? (
          <p className="plano-demo-state">Aun no hay unidades publicadas para este desarrollo.</p>
        ) : null}

        <div className="plano-demo-scroll">
          <div className="plano-demo-stage">
            <div
              className="plano-demo-svg-inline"
              onClick={manejarClickSvg}
              onKeyDown={manejarKeyDownSvg}
              onMouseLeave={() => setTooltip(null)}
              onMouseMove={manejarMouseMoveSvg}
              dangerouslySetInnerHTML={{ __html: svgConInteraccion }}
            />

            {tooltip ? (
              <div className="plano-demo-tooltip" style={{ left: tooltip.x + 14, top: tooltip.y + 14 }}>
                <strong>Unidad {tooltip.unidad.codigoUnidad}</strong>
                <span>{tooltip.unidad.modeloNombre}</span>
                <span>{ESTATUS_LABELS[tooltip.unidad.estatus]}</span>
                <span>{formatCurrency(tooltip.unidad.precio)}</span>
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
            <dl>
              <div><dt>Manzana</dt><dd>{unidadSeleccionada.manzana || 'Sin dato'}</dd></div>
              <div><dt>Modelo</dt><dd>{unidadSeleccionada.modeloNombre}</dd></div>
              <div><dt>Precio</dt><dd>{formatCurrency(unidadSeleccionada.precio)}</dd></div>
              <div><dt>Terreno</dt><dd>{unidadSeleccionada.terrenoM2 ? `${unidadSeleccionada.terrenoM2} m2` : 'Sin dato'}</dd></div>
              <div><dt>Construccion</dt><dd>{unidadSeleccionada.construccionM2 ? `${unidadSeleccionada.construccionM2} m2` : 'Sin dato'}</dd></div>
              <div><dt>Estatus</dt><dd>{ESTATUS_LABELS[unidadSeleccionada.estatus] || unidadSeleccionada.estatus}</dd></div>
            </dl>
            {['DISPONIBLE', 'CONSTRUCCION'].includes(unidadSeleccionada.estatus) ? (
              <button type="button">Apartar unidad</button>
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
