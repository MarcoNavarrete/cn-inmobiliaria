import React, { useMemo, useState } from 'react';
import { desarrolloUnidadesDemo } from '../../data/desarrolloUnidadesMock';
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

export default function PlanoInteractivoDemo() {
  const unidades = desarrolloUnidadesDemo.unidades;
  const unidadesPorSvgId = useMemo(
    () => Object.fromEntries(unidades.map((unidad) => [unidad.svgElementId, unidad])),
    [unidades]
  );
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(unidades[0]);
  const [tooltip, setTooltip] = useState(null);

  const mostrarTooltip = (event, unidad) => {
    const bounds = event.currentTarget.ownerSVGElement.getBoundingClientRect();
    setTooltip({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
      unidad,
    });
  };

  return (
    <div className="plano-demo">
      <div className="plano-demo-map-card">
        <div className="plano-demo-map-head">
          <div>
            <h3>Disponibilidad por unidad</h3>
            <p>Prototipo visual temporal para preparar integracion con SVG real.</p>
          </div>
          <div className="plano-demo-legend">
            {Object.keys(ESTATUS_LABELS).map((estatus) => (
              <span key={estatus}><i className={`is-${estatus.toLowerCase()}`} />{ESTATUS_LABELS[estatus]}</span>
            ))}
          </div>
        </div>

        <div className="plano-demo-scroll">
          <div className="plano-demo-stage">
            <svg viewBox="0 0 520 390" role="img" aria-label="Plano interactivo demo de unidades">
              <defs>
                <filter id="plano-shadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#071521" floodOpacity="0.16" />
                </filter>
              </defs>
              <rect x="22" y="26" width="476" height="338" rx="18" className="plano-demo-base" />
              <path d="M40 194 H480" className="plano-demo-street" />
              <path d="M472 54 V338" className="plano-demo-street secondary" />
              <text x="54" y="198" className="plano-demo-street-label">Paseo central</text>
              <text x="462" y="188" className="plano-demo-street-label rotate">Acceso</text>

              {unidadShapes.map((shape) => {
                const unidad = unidadesPorSvgId[shape.id];
                const selected = unidadSeleccionada?.svgElementId === shape.id;
                const className = `plano-demo-unit is-${unidad.estatus.toLowerCase()} ${selected ? 'is-selected' : ''}`;

                return (
                  <g
                    key={shape.id}
                    id={shape.id}
                    className="plano-demo-unit-group"
                    onClick={() => setUnidadSeleccionada(unidad)}
                    onMouseMove={(event) => mostrarTooltip(event, unidad)}
                    onMouseLeave={() => setTooltip(null)}
                    role="button"
                    tabIndex="0"
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setUnidadSeleccionada(unidad);
                      }
                    }}
                  >
                    {shape.type === 'rect' ? (
                      <rect className={className} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx="10" />
                    ) : (
                      <polygon className={className} points={shape.points} />
                    )}
                    <text className="plano-demo-unit-label" x={shape.x ? shape.x + 58 : 382} y={shape.y ? shape.y + 45 : shape.label === '103' ? 129 : 272}>
                      {shape.label}
                    </text>
                  </g>
                );
              })}
            </svg>

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
        <p className="plano-demo-eyebrow">Unidad seleccionada</p>
        <h3>Unidad {unidadSeleccionada.codigoUnidad}</h3>
        <dl>
          <div><dt>Manzana</dt><dd>{unidadSeleccionada.manzana}</dd></div>
          <div><dt>Modelo</dt><dd>{unidadSeleccionada.modeloNombre}</dd></div>
          <div><dt>Precio</dt><dd>{formatCurrency(unidadSeleccionada.precio)}</dd></div>
          <div><dt>Terreno</dt><dd>{unidadSeleccionada.terrenoM2} m2</dd></div>
          <div><dt>Construccion</dt><dd>{unidadSeleccionada.construccionM2} m2</dd></div>
          <div><dt>Estatus</dt><dd>{ESTATUS_LABELS[unidadSeleccionada.estatus]}</dd></div>
        </dl>
        {['DISPONIBLE', 'CONSTRUCCION'].includes(unidadSeleccionada.estatus) ? (
          <button type="button">Apartar unidad</button>
        ) : (
          <span className="plano-demo-panel-note">Esta unidad no esta disponible para apartado.</span>
        )}
      </aside>
    </div>
  );
}
