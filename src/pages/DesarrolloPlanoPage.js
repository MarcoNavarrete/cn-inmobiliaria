import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import PlanoInteractivoDemo from '../components/desarrollos/PlanoInteractivoDemo';
import { getWhatsAppPhone } from '../config/contacto';
import { obtenerPlanoPublico } from '../services/adminDesarrolloPlanoService';
import { obtenerDesarrolloPorSlug } from '../services/desarrollosService';
import { formatearMonedaMXN } from '../utils/preciosInmobiliarios';
import './DesarrolloPlanoPage.css';

const CN_LOGO = './assets/logo.png';

const isInternalSvgUrl = (value) => {
  const url = String(value || '').trim();
  return /^\/uploads\/.+\.svg($|\?)/i.test(url) || /^\.?\/assets\/.+\.svg($|\?)/i.test(url);
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No se pudo cargar el plano interactivo.';

const cleanText = (value) => String(value || '').trim();

const isDesarrolloValido = (desarrollo) =>
  Boolean(desarrollo && (desarrollo.id || desarrollo.slug || desarrollo.nombre));

const getImagenDesarrollo = (desarrollo) => {
  if (!desarrollo) return '';
  return desarrollo.imagenPrincipal || desarrollo.imagenPrincipalUrl || desarrollo.logoUrl || '';
};

const buildUnidadMessage = (unit, desarrollo) => {
  const manzana = cleanText(unit?.manzana || unit?.manzanaNombre);
  const lote = cleanText(unit?.lote || unit?.loteNumero || unit?.codigoLote || unit?.codigoUnidad || unit?.codigo);
  const codigo = cleanText(unit?.codigoUnidad || unit?.codigo);
  const modelo = cleanText(unit?.modeloNombre || unit?.modelo || unit?.nombreModelo);
  const desarrolloNombre = cleanText(desarrollo?.nombre || desarrollo?.titulo || desarrollo?.slug);
  const unidadTexto = [
    manzana ? `Manzana ${manzana}` : '',
    lote ? `lote ${lote}` : '',
  ].filter(Boolean).join(' ') || (codigo ? `unidad ${codigo}` : 'unidad seleccionada');
  const modeloTexto = modelo && modelo !== 'Modelo por confirmar' ? ` del modelo ${modelo}` : '';
  const desarrolloTexto = desarrolloNombre ? ` del desarrollo ${desarrolloNombre}` : '';

  return `Me interesa la casa ${unidadTexto}${modeloTexto}${desarrolloTexto}. Quiero información sobre precios y formas de pago.`
    .replace(/\s+/g, ' ')
    .trim();
};

export default function DesarrolloPlanoPage() {
  const { slug } = useParams();
  const [desarrollo, setDesarrollo] = useState(null);
  const [planoDisponible, setPlanoDisponible] = useState(false);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const cargar = async () => {
      setLoading(true);
      setNotFound(false);
      setError('');
      setPlanoDisponible(false);
      setUnidadSeleccionada(null);

      try {
        const desarrolloData = await obtenerDesarrolloPorSlug(slug, { signal: controller.signal });

        if (!isDesarrolloValido(desarrolloData)) {
          setDesarrollo(null);
          setNotFound(true);
          return;
        }

        setDesarrollo(desarrolloData);

        try {
          const planoData = await obtenerPlanoPublico(desarrolloData.id, { signal: controller.signal });
          if (!controller.signal.aborted) {
            setPlanoDisponible(Boolean(planoData?.activo && planoData.svgUrl && isInternalSvgUrl(planoData.svgUrl)));
          }
        } catch (err) {
          if (err.name !== 'AbortError') {
            if (err.status === 404) {
              setPlanoDisponible(false);
            } else {
              setError(getApiErrorMessage(err));
            }
          }
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setDesarrollo(null);
          setPlanoDisponible(false);
          if (err.status === 404) {
            setNotFound(true);
          } else {
            setError(getApiErrorMessage(err));
          }
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargar();

    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = desarrollo?.nombre
      ? `Plano interactivo de ${desarrollo.nombre} | CN Inmobiliaria`
      : 'Plano interactivo | CN Inmobiliaria';

    return () => {
      document.title = previousTitle;
    };
  }, [desarrollo?.nombre]);

  const imagenUrl = useMemo(() => getImagenDesarrollo(desarrollo) || CN_LOGO, [desarrollo]);
  const detalleUrl = desarrollo?.slug || slug;

  const abrirWhatsapp = (unidad = unidadSeleccionada) => {
    if (!desarrollo) return;

    const telefono = getWhatsAppPhone(desarrollo.telefonoContacto);
    if (!telefono) return;

    const text = unidad
      ? buildUnidadMessage(unidad, desarrollo)
      : `Me interesa el desarrollo ${desarrollo.nombre}. Quiero más información.`;

    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <main className="desarrollo-plano-page">
        <p className="desarrollo-plano-page-feedback">Cargando plano interactivo...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="desarrollo-plano-page">
        <section className="desarrollo-plano-page-empty">
          <h1>Plano interactivo</h1>
          <p>No se pudo cargar el plano interactivo.</p>
          <Link to="/desarrollos">Ver desarrollos disponibles</Link>
        </section>
      </main>
    );
  }

  if (notFound || !desarrollo) {
    return (
      <main className="desarrollo-plano-page">
        <section className="desarrollo-plano-page-empty">
          <h1>Desarrollo no encontrado</h1>
          <p>No encontramos el desarrollo solicitado o ya no está disponible.</p>
          <Link to="/desarrollos">Ver desarrollos disponibles</Link>
        </section>
      </main>
    );
  }

  return (
    <main className="desarrollo-plano-page">
      <section className="desarrollo-plano-page-hero">
        <div className="desarrollo-plano-page-brand">
          <img src={imagenUrl} alt={desarrollo.nombre} />
          <div>
            <p>Plano interactivo</p>
            <h1>{desarrollo.nombre}</h1>
            <span>{desarrollo.ubicacion || 'Ubicación por confirmar'}</span>
            <small>Desde {formatearMonedaMXN(desarrollo.precioDesde)}</small>
          </div>
        </div>
        <div className="desarrollo-plano-page-actions">
          <Link to={`/desarrollos/${detalleUrl}`}>Ver información completa</Link>
          <button type="button" onClick={() => abrirWhatsapp()}>WhatsApp</button>
        </div>
      </section>

      <section className="desarrollo-plano-page-shell">
        <section className="desarrollo-plano-page-main">
          <header>
            <p>Disponibilidad por unidad</p>
            <h2>Explora el plano del desarrollo</h2>
          </header>

          {planoDisponible ? (
            <PlanoInteractivoDemo
              desarrolloId={desarrollo.id}
              onApartarUnidad={abrirWhatsapp}
              onUnidadSelect={setUnidadSeleccionada}
              requireRealSvg
              onUnavailable={() => setPlanoDisponible(false)}
            />
          ) : (
            <p className="desarrollo-plano-page-feedback">Este desarrollo aún no tiene plano interactivo disponible.</p>
          )}
        </section>

        <aside className="desarrollo-plano-page-panel">
          <div>
            <span>Desarrollo</span>
            <strong>{desarrollo.nombre}</strong>
            <p>{desarrollo.ubicacion || 'Ubicación por confirmar'}</p>
            {desarrollo.nombreContacto ? <small>Asesor asignado: {desarrollo.nombreContacto}</small> : null}
          </div>

          {unidadSeleccionada ? (
            <div className="desarrollo-plano-page-unit">
              <span>Unidad seleccionada</span>
              <strong>Unidad {unidadSeleccionada.codigoUnidad}</strong>
              <p>
                {unidadSeleccionada.modeloNombre}
                {unidadSeleccionada.manzana ? ` · Manzana ${unidadSeleccionada.manzana}` : ''}
                {unidadSeleccionada.lote ? ` · Lote ${unidadSeleccionada.lote}` : ''}
              </p>
              <dl>
                <div><dt>Estatus</dt><dd>{unidadSeleccionada.estatus}</dd></div>
                <div><dt>Precio</dt><dd>{unidadSeleccionada.precioDesdeTexto || unidadSeleccionada.precioTexto || formatearMonedaMXN(unidadSeleccionada.precio)}</dd></div>
                <div><dt>Terreno</dt><dd>{unidadSeleccionada.terrenoM2 ? `${unidadSeleccionada.terrenoM2} m2` : 'Sin dato'}</dd></div>
                <div><dt>Construcción</dt><dd>{unidadSeleccionada.construccionM2 ? `${unidadSeleccionada.construccionM2} m2` : 'Sin dato'}</dd></div>
              </dl>
              <button type="button" onClick={() => abrirWhatsapp(unidadSeleccionada)}>Me interesa esta unidad</button>
            </div>
          ) : (
            <p className="desarrollo-plano-page-muted">Selecciona una unidad en el plano para ver su información.</p>
          )}
        </aside>
      </section>
    </main>
  );
}