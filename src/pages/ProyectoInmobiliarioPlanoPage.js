import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProyectoPlanoInteractivo from '../components/proyectos/ProyectoPlanoInteractivo';
import { getWhatsAppPhone } from '../config/contacto';
import { resolveApiAssetUrl } from '../services/apiClient';
import {
  listarUnidadesPublicas,
  obtenerPlanoPublico,
  obtenerProyectoPublico,
} from '../services/proyectosInmobiliariosPublicService';
import './ProyectoInmobiliarioPlanoPage.css';

const CN_LOGO = './assets/logo.png';

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No se pudo cargar el plano interactivo.';

const formatArea = (value) => {
  if (!value || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toLocaleString('es-MX')} m2`;
};

const getStatusClass = (status) =>
  `is-${String(status || '').trim().toLowerCase().replace(/\s+/g, '_')}`;

const getLogoProyecto = (proyecto) => {
  if (!proyecto) return '';

  if (proyecto.usarLogoEmpresa && proyecto.logoEmpresaUrl) {
    return proyecto.logoEmpresaUrl;
  }

  return proyecto.logoProyectoUrl || proyecto.logoUrl || proyecto.logoEmpresaUrl || proyecto.imagenPrincipalUrl || '';
};

const isProyectoValido = (proyecto) =>
  Boolean(proyecto && (proyecto.id || proyecto.proyectoId || proyecto.slug || proyecto.nombre));

export default function ProyectoInmobiliarioPlanoPage() {
  const { slug } = useParams();
  const [proyecto, setProyecto] = useState(null);
  const [plano, setPlano] = useState(null);
  const [unidades, setUnidades] = useState([]);
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

      try {
        const proyectoData = await obtenerProyectoPublico(slug, { signal: controller.signal });

        if (!isProyectoValido(proyectoData)) {
          setProyecto(null);
          setPlano(null);
          setUnidades([]);
          setUnidadSeleccionada(null);
          setNotFound(true);
          return;
        }

        const [planoData, unidadesData] = await Promise.all([
          obtenerPlanoPublico(slug, { signal: controller.signal }).catch(() => null),
          listarUnidadesPublicas(slug, { signal: controller.signal }).catch(() => []),
        ]);

        setProyecto(proyectoData);
        setPlano(planoData?.activo ? planoData : null);
        setUnidades(Array.isArray(unidadesData) ? unidadesData : []);
        setUnidadSeleccionada(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setProyecto(null);
          setPlano(null);
          setUnidades([]);
          setUnidadSeleccionada(null);

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
    document.title = proyecto?.nombre
      ? `Plano interactivo de ${proyecto.nombre} | CN Inmobiliaria`
      : 'Plano interactivo | CN Inmobiliaria';

    return () => {
      document.title = previousTitle;
    };
  }, [proyecto?.nombre]);

  const logoUrl = useMemo(() => resolveApiAssetUrl(getLogoProyecto(proyecto)) || CN_LOGO, [proyecto]);
  const detalleUrl = proyecto?.slug || slug;

  const seleccionarUnidad = useCallback((unidad) => {
    setUnidadSeleccionada(unidad);
  }, []);

  const abrirWhatsapp = () => {
    if (!proyecto) return;

    const telefono = getWhatsAppPhone(proyecto.telefonoContacto || proyecto.whatsappContacto);
    if (!telefono) return;

    const unidadTexto = unidadSeleccionada
      ? ` sobre la unidad ${unidadSeleccionada.codigo}`
      : '';
    const text = `Hola, me interesa el proyecto ${proyecto.nombre}${unidadTexto}. Me gustaría recibir más información.`;
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <main className="proyecto-plano-page">
        <p className="proyecto-plano-page-feedback">Cargando plano interactivo...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main className="proyecto-plano-page">
        <section className="proyecto-plano-page-empty">
          <h1>Plano interactivo</h1>
          <p>No se pudo cargar el plano interactivo.</p>
          <Link to="/proyectos-inmobiliarios">Ver proyectos disponibles</Link>
        </section>
      </main>
    );
  }

  if (notFound || !proyecto) {
    return (
      <main className="proyecto-plano-page">
        <section className="proyecto-plano-page-empty">
          <h1>Proyecto no encontrado</h1>
          <p>No encontramos el proyecto solicitado o ya no está disponible.</p>
          <Link to="/proyectos-inmobiliarios">Ver proyectos disponibles</Link>
        </section>
      </main>
    );
  }
  return (
    <main className="proyecto-plano-page">
      <section className="proyecto-plano-page-hero">
        <div className="proyecto-plano-page-brand">
          <img src={logoUrl} alt={proyecto.empresaNombre || proyecto.nombre} />
          <div>
            <p>Plano interactivo</p>
            <h1>{proyecto.nombre}</h1>
            {proyecto.empresaNombre ? <span>{proyecto.empresaNombre}</span> : null}
            <small>{proyecto.ubicacionTexto || proyecto.ubicacion}</small>
          </div>
        </div>
        <div className="proyecto-plano-page-actions">
          <Link to={`/proyectos-inmobiliarios/${detalleUrl}`}>Ver información completa</Link>
          <button type="button" onClick={abrirWhatsapp}>WhatsApp</button>
        </div>
      </section>

      <section className="proyecto-plano-page-shell">
        <section className="proyecto-plano-page-main">
          <header>
            <p>Disponibilidad por unidad</p>
            <h2>Explora el plano del proyecto</h2>
          </header>

          {plano?.svgUrl ? (
            <ProyectoPlanoInteractivo
              svgUrl={plano.svgUrl}
              unidades={unidades}
              selectedUnidadId={unidadSeleccionada?.id || unidadSeleccionada?.unidadId}
              onUnidadSelect={seleccionarUnidad}
            />
          ) : (
            <p className="proyecto-plano-page-feedback">Este proyecto aún no tiene plano interactivo disponible.</p>
          )}
        </section>

        <aside className="proyecto-plano-page-panel">
          <div>
            <span>Proyecto</span>
            <strong>{proyecto.nombre}</strong>
            <p>{proyecto.ubicacionTexto || proyecto.ubicacion}</p>
          </div>

          {unidadSeleccionada ? (
            <div className="proyecto-plano-page-unit">
              <span>Unidad seleccionada</span>
              <strong>{unidadSeleccionada.codigo}</strong>
              <p>
                {unidadSeleccionada.tipoUnidad}
                {unidadSeleccionada.manzana ? ` · Manzana ${unidadSeleccionada.manzana}` : ''}
                {unidadSeleccionada.lote ? ` · Lote ${unidadSeleccionada.lote}` : ''}
              </p>
              <dl>
                <div><dt>Estatus</dt><dd className={getStatusClass(unidadSeleccionada.estatus)}>{unidadSeleccionada.estatus}</dd></div>
                <div><dt>Precio</dt><dd>{unidadSeleccionada.precioDesdeTexto || unidadSeleccionada.precioTotalTexto}</dd></div>
                <div><dt>Terreno</dt><dd>{formatArea(unidadSeleccionada.superficieTerrenoM2)}</dd></div>
                <div><dt>Construcción</dt><dd>{formatArea(unidadSeleccionada.superficieConstruccionM2)}</dd></div>
              </dl>
              <button type="button" onClick={abrirWhatsapp}>Me interesa esta unidad</button>
            </div>
          ) : (
            <p className="proyecto-plano-page-muted">Selecciona una unidad en el plano para ver su información.</p>
          )}
        </aside>
      </section>
    </main>
  );
}