import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import ProspectoDesarrolloModal from '../components/desarrollos/ProspectoDesarrolloModal';
import Tour360Viewer from '../components/tour360/Tour360Viewer';
import { obtenerDesarrolloPorSlug } from '../services/desarrollosService';
import {
  obtenerTourPublicoModelo,
} from '../services/tour360Service';
import './DetalleDesarrolloPage.css';

const DEFAULT_WHATSAPP_NUMBER = '+5215540859798';

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

const normalizeWhatsAppNumber = (value) => String(value || '').replace(/[^\d]/g, '');

const whatsappHref = (desarrollo, modelo) => {
  const telefono =
    normalizeWhatsAppNumber(desarrollo.telefonoContacto) ||
    normalizeWhatsAppNumber(DEFAULT_WHATSAPP_NUMBER);
  const texto = modelo
    ? `Hola, me interesa el modelo ${modelo.nombre} del desarrollo ${desarrollo.nombre}. ¿Me pueden dar más información?`
    : `Hola, me interesa el desarrollo ${desarrollo.nombre}. ¿Me pueden dar más información?`;

  return `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`;
};

export default function DetalleDesarrolloPage() {
  const { id: slug } = useParams();
  const [desarrollo, setDesarrollo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tourModal, setTourModal] = useState({
    isOpen: false,
    title: '',
    tour: null,
    loading: false,
    error: '',
  });
  const [prospectoModal, setProspectoModal] = useState({
    isOpen: false,
    modelo: null,
    origen: 'DESARROLLO',
  });

  useEffect(() => {
    const controller = new AbortController();

    const cargarDesarrollo = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await obtenerDesarrolloPorSlug(slug, { signal: controller.signal });
        setDesarrollo(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setDesarrollo(null);
          setError(
            err.status === 404
              ? 'Desarrollo no encontrado.'
              : err.data?.mensaje || err.data?.message || 'No fue posible cargar el desarrollo.'
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargarDesarrollo();

    return () => controller.abort();
  }, [slug]);

  // TODO: habilitar tour 360 general del desarrollo cuando existan escenas del desarrollo/amenidades.

  if (loading) {
    return (
      <main className="detalle-desarrollo-page">
        <p className="detalle-desarrollo-feedback">Cargando desarrollo...</p>
      </main>
    );
  }

  if (error || !desarrollo) {
    return (
      <main className="detalle-desarrollo-page">
        <section className="detalle-desarrollo-empty">
          <h1>Desarrollo no encontrado</h1>
          <p>{error || 'El proyecto que buscas no esta disponible o cambio de direccion.'}</p>
          <Link to="/desarrollos">Ver desarrollos</Link>
        </section>
      </main>
    );
  }

  const heroStyle = desarrollo.imagenPrincipal
    ? { backgroundImage: `linear-gradient(90deg, rgba(9, 22, 35, 0.88), rgba(26, 61, 124, 0.42)), url(${desarrollo.imagenPrincipal})` }
    : undefined;

  const irAModelos = (event) => {
    event.preventDefault();
    document.getElementById('modelos-disponibles')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const abrirModalProspecto = (modelo = null) => {
    setProspectoModal({
      isOpen: true,
      modelo,
      origen: modelo ? 'MODELO' : 'DESARROLLO',
    });
  };

  const cerrarModalProspecto = () => {
    setProspectoModal((actual) => ({
      ...actual,
      isOpen: false,
    }));
  };

  const abrirWhatsapp = ({ desarrollo: desarrolloActual, modelo }) => {
    window.open(whatsappHref(desarrolloActual, modelo), '_blank', 'noopener,noreferrer');
  };

  const abrirTourModelo = async (modelo) => {
    setTourModal({
      isOpen: true,
      title: `Tour 360 - ${modelo.nombre}`,
      tour: null,
      loading: true,
      error: '',
    });

    try {
      const tour = await obtenerTourPublicoModelo(modelo.id);
      setTourModal((actual) => ({
        ...actual,
        tour,
        loading: false,
        error: tour?.escenas?.length ? '' : 'Este modelo aun no tiene tour 360 disponible.',
      }));
    } catch (err) {
      setTourModal((actual) => ({
        ...actual,
        loading: false,
        error: err.data?.mensaje || err.data?.message || 'No fue posible cargar el tour 360.',
      }));
    }
  };

  const cerrarTourModal = () => {
    setTourModal({
      isOpen: false,
      title: '',
      tour: null,
      loading: false,
      error: '',
    });
  };

  return (
    <main className="detalle-desarrollo-page">
      <section
        className={`detalle-desarrollo-hero ${desarrollo.imagenPrincipal ? '' : 'is-placeholder'}`}
        style={heroStyle}
      >
        <div>
          <p>Desarrollo premium</p>
          <h1>{desarrollo.nombre}</h1>
          <span>{desarrollo.ubicacion || 'Ubicacion por confirmar'}</span>
          {desarrollo.nombreContacto ? (
            <small className="detalle-desarrollo-contacto">Asesor asignado: {desarrollo.nombreContacto}</small>
          ) : null}
          <strong>Desde {formatCurrency(desarrollo.precioDesde)}</strong>
          <div className="detalle-desarrollo-hero-actions">
            <button type="button" onClick={() => abrirModalProspecto()}>WhatsApp</button>
            <a href="#modelos-disponibles" onClick={irAModelos}>Ver modelos</a>
          </div>
        </div>
      </section>

      <section className="detalle-desarrollo-shell">
        <div className="detalle-desarrollo-intro">
          <div>
            <p className="detalle-desarrollo-eyebrow">Concepto</p>
            <h2>Un proyecto pensado para vivir e invertir</h2>
            <p>{desarrollo.descripcion}</p>
          </div>
          <aside>
            <span>Precio desde</span>
            <strong>{formatCurrency(desarrollo.precioDesde)}</strong>
            {desarrollo.nombreContacto ? (
              <small className="detalle-desarrollo-contacto-card">Asesor asignado: {desarrollo.nombreContacto}</small>
            ) : null}
            <button type="button" onClick={() => abrirModalProspecto()}>Solicitar informacion</button>
          </aside>
        </div>

        {desarrollo.galeria.length > 0 ? (
          <section className="detalle-desarrollo-galeria" aria-label="Galeria del desarrollo">
            {desarrollo.galeria.map((imagen, index) => (
              <img key={`${imagen}-${index}`} src={imagen} alt={`${desarrollo.nombre} ${index + 1}`} />
            ))}
          </section>
        ) : (
          <section className="detalle-desarrollo-gallery-empty">
            <p>Galeria proximamente disponible.</p>
          </section>
        )}

        {desarrollo.amenidades.length > 0 ? (
          <section className="detalle-desarrollo-section">
            <div className="detalle-desarrollo-section-head">
              <p className="detalle-desarrollo-eyebrow">Amenidades</p>
              <h2>Servicios que elevan la experiencia residencial</h2>
            </div>
            <div className="detalle-desarrollo-amenidades">
              {desarrollo.amenidades.map((amenidad) => (
                <span key={amenidad}>{amenidad}</span>
              ))}
            </div>
          </section>
        ) : null}

        {desarrollo.financiamiento.length > 0 ? (
          <section className="detalle-desarrollo-section detalle-desarrollo-financiamiento">
            <div className="detalle-desarrollo-section-head">
              <p className="detalle-desarrollo-eyebrow">Financiamiento</p>
              <h2>Opciones para apartar y comprar</h2>
            </div>
            <ul>
              {desarrollo.financiamiento.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ) : null}

        <section id="modelos-disponibles" className="detalle-desarrollo-section">
          <div className="detalle-desarrollo-section-head">
            <p className="detalle-desarrollo-eyebrow">Modelos disponibles</p>
            <h2>Elige la distribucion que encaja con tu plan</h2>
          </div>
          {desarrollo.modelos.length === 0 ? (
            <p className="detalle-desarrollo-modelos-empty">Proximamente modelos disponibles</p>
          ) : (
            <div className="modelos-grid">
              {desarrollo.modelos.map((modelo) => {
                const imagenModelo = modelo.imagenPrincipal || modelo.imagenes[0] || '';

                return (
                  <article key={modelo.id || modelo.nombre} className="modelo-card">
                    <div className={`modelo-card-media ${imagenModelo ? '' : 'is-placeholder'}`}>
                      {imagenModelo ? (
                        <img src={imagenModelo} alt={modelo.nombre} />
                      ) : (
                        <div>Imagen proximamente</div>
                      )}
                      <span className={modelo.disponible ? 'is-available' : 'is-unavailable'}>
                        {modelo.disponible ? 'Disponible' : 'Lista de espera'}
                      </span>
                    </div>
                    <div className="modelo-card-body">
                      <div>
                        <h3>{modelo.nombre}</h3>
                        <strong>{formatCurrency(modelo.precio)}</strong>
                      </div>
                      <p>{modelo.descripcion}</p>
                      <dl>
                        <div><dt>Recamaras</dt><dd>{modelo.recamaras}</dd></div>
                        <div><dt>Banos</dt><dd>{modelo.banos}{modelo.medioBano ? ` + ${modelo.medioBano}/2` : ''}</dd></div>
                        <div><dt>Estac.</dt><dd>{modelo.estacionamientos}</dd></div>
                        <div><dt>Construccion</dt><dd>{modelo.construccionM2} m2</dd></div>
                        <div><dt>Terreno</dt><dd>{modelo.terrenoM2} m2</dd></div>
                      </dl>
                      <button type="button" onClick={() => abrirModalProspecto(modelo)}>
                        Me interesa este modelo
                      </button>
                      <button type="button" className="modelo-card-secondary" onClick={() => abrirTourModelo(modelo)}>
                        Ver tour 360 del modelo
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="detalle-desarrollo-final-cta">
          <div>
            <p className="detalle-desarrollo-eyebrow">Agenda una asesoria</p>
            <h2>Conoce disponibilidad, planes de pago y avances de obra</h2>
          </div>
          <button type="button" onClick={() => abrirModalProspecto()}>Hablar con un asesor</button>
        </section>
      </section>

      <ProspectoDesarrolloModal
        desarrollo={desarrollo}
        isOpen={prospectoModal.isOpen}
        modelo={prospectoModal.modelo}
        onClose={cerrarModalProspecto}
        onSuccess={abrirWhatsapp}
        origen={prospectoModal.origen}
      />
      {tourModal.isOpen ? (
        <div className="detalle-desarrollo-tour-modal" role="presentation" onMouseDown={cerrarTourModal}>
          <section
            className="detalle-desarrollo-tour-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="detalle-desarrollo-tour-title"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="detalle-desarrollo-tour-head">
              <h2 id="detalle-desarrollo-tour-title">{tourModal.title}</h2>
              <button type="button" onClick={cerrarTourModal} aria-label="Cerrar tour 360">x</button>
            </div>
            {tourModal.loading ? <p className="detalle-desarrollo-feedback">Cargando tour 360...</p> : null}
            {tourModal.error ? <p className="detalle-desarrollo-modelos-empty">{tourModal.error}</p> : null}
            {!tourModal.loading && tourModal.tour?.escenas?.length ? <Tour360Viewer tour={tourModal.tour} /> : null}
          </section>
        </div>
      ) : null}
    </main>
  );
}
