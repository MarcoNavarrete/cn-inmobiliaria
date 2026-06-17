import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import ImageLightbox from '../components/common/ImageLightbox';
import RichTextContent from '../components/common/RichTextContent';
import PlanoInteractivoDemo from '../components/desarrollos/PlanoInteractivoDemo';
import ProspectoDesarrolloModal from '../components/desarrollos/ProspectoDesarrolloModal';
import Tour360Viewer from '../components/tour360/Tour360Viewer';
import useAuthSession from '../hooks/useAuthSession';
import { trackEvent } from '../lib/analytics';
import { EVENTOS_CONVERSION, trackConversionEvent } from '../lib/conversionEvents';
import { trackMetaCustomEvent, trackMetaEvent } from '../lib/metaPixel';
import { obtenerAsesorPorReferencia } from '../services/asesoresService';
import { obtenerDesarrolloPorSlug } from '../services/desarrollosService';
import { obtenerPlanoPublico } from '../services/adminDesarrolloPlanoService';
import {
  obtenerTourPublicoModelo,
} from '../services/tour360Service';
import { getWhatsAppPhone } from '../config/contacto';
import { formatearMonedaMXN } from '../utils/preciosInmobiliarios';
import './DetalleDesarrolloPage.css';

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

const isInternalSvgUrl = (value) => {
  const url = String(value || '').trim();
  return /^\/uploads\/.+\.svg($|\?)/i.test(url) || /^\.?\/assets\/.+\.svg($|\?)/i.test(url);
};

const whatsappHref = (desarrollo, modelo, telefonoDestino, shareUrl = '') => {
  const telefono = telefonoDestino || getWhatsAppPhone(desarrollo?.telefonoContacto);
  const texto = modelo
    ? `Me interesa el modelo ${modelo.nombre} del desarrollo ${desarrollo.nombre}. Quiero mas información.`
    : `Me interesa el desarrollo ${desarrollo.nombre}. Quiero mas información.`;

  return `https://wa.me/${telefono}?text=${encodeURIComponent(shareUrl ? `${texto} ${shareUrl}` : texto)}`;
};

const cleanText = (value) => String(value || '').trim();

const buildApartarMessage = (unit, desarrollo) => {
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

const buildMapsUrl = (latitud, longitud) => {
  const lat = String(latitud || '').trim();
  const lng = String(longitud || '').trim();
  if (!lat || !lng) {
    return '';
  }
  return `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
};

const getDesarrolloRefStorageKey = (slug) => `cn_desarrollo_ref_${slug}`;
const getDesarrolloRefDataStorageKey = (slug) => `cn_desarrollo_ref_data_${slug}`;

const readStorageValue = (key) => {
  try {
    return window.localStorage.getItem(key) || '';
  } catch (_) {
    return '';
  }
};

const writeStorageValue = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch (_) {
    // Storage can be unavailable in private contexts; state attribution still works.
  }
};

const readStorageJson = (key) => {
  try {
    return JSON.parse(window.localStorage.getItem(key) || 'null');
  } catch (_) {
    return null;
  }
};

const buildDesarrolloShareUrl = (slug, codigoAsesor = '') => {
  if (typeof window === 'undefined') {
    const base = slug ? `https://cninmobiliaria.com.mx/#/desarrollos/${slug}` : '';
    return codigoAsesor && base ? `${base}?ref=${encodeURIComponent(codigoAsesor)}` : base;
  }

  if (!slug) {
    return window.location.href;
  }

  const base = `${window.location.origin}${window.location.pathname}#/desarrollos/${slug}`;
  return codigoAsesor ? `${base}?ref=${encodeURIComponent(codigoAsesor)}` : base;
};

const copiarTexto = async (texto) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = texto;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand('copy');
  document.body.removeChild(textArea);
};

export default function DetalleDesarrolloPage() {
  const { id: slug } = useParams();
  const location = useLocation();
  const { usuario } = useAuthSession();
  const [desarrollo, setDesarrollo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imagenActual, setImagenActual] = useState(0);
  const [imagenesModeloActivas, setImagenesModeloActivas] = useState({});
  const [lightbox, setLightbox] = useState({
    images: [],
    initialIndex: 0,
    isOpen: false,
    title: '',
  });
  const [tourModal, setTourModal] = useState({
    isOpen: false,
    title: '',
    tour: null,
    loading: false,
    error: '',
  });
  const viewContentTrackedRef = useRef('');
  const [prospectoModal, setProspectoModal] = useState({
    isOpen: false,
    initialMessage: '',
    modelo: null,
    origen: 'DESARROLLO',
    unidad: null,
  });
  const [mostrarPlanoInteractivo, setMostrarPlanoInteractivo] = useState(false);
  const [asesorReferido, setAsesorReferido] = useState(null);
  const [shareFeedback, setShareFeedback] = useState('');

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

  useEffect(() => {
    if (!slug) return undefined;

    const params = new URLSearchParams(location.search || '');
    const refFromUrl = String(params.get('ref') || '').trim();
    const storageKey = getDesarrolloRefStorageKey(slug);
    const storageDataKey = getDesarrolloRefDataStorageKey(slug);
    const ref = refFromUrl || readStorageValue(storageKey).trim();

    if (!ref) {
      setAsesorReferido(null);
      return undefined;
    }

    writeStorageValue(storageKey, ref);

    const cachedAsesor = readStorageJson(storageDataKey);
    if (cachedAsesor?.codigoAsesor === ref) {
      setAsesorReferido(cachedAsesor);
    }

    const controller = new AbortController();
    obtenerAsesorPorReferencia(ref, { signal: controller.signal })
      .then((asesor) => {
        if (!asesor?.codigoAsesor) {
          setAsesorReferido(null);
          return;
        }

        setAsesorReferido(asesor);
        writeStorageValue(storageDataKey, JSON.stringify(asesor));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setAsesorReferido(null);
        }
      });

    return () => controller.abort();
  }, [location.search, slug]);

  useEffect(() => {
    if (!desarrollo?.id) {
      setMostrarPlanoInteractivo(false);
      return undefined;
    }

    const controller = new AbortController();

    const validarPlanoPublico = async () => {
      setMostrarPlanoInteractivo(false);

      try {
        const plano = await obtenerPlanoPublico(desarrollo.id, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setMostrarPlanoInteractivo(Boolean(plano?.activo && plano.svgUrl && isInternalSvgUrl(plano.svgUrl)));
        }
      } catch (err) {
        if (err.name !== 'AbortError') {
          setMostrarPlanoInteractivo(false);
        }
      }
    };

    validarPlanoPublico();

    return () => controller.abort();
  }, [desarrollo?.id]);

  const imagenesCarrusel = useMemo(() => {
    if (!desarrollo) {
      return [];
    }

    const imagenes = [
      desarrollo.imagenPrincipal,
      ...(desarrollo.imagenes || desarrollo.galeria || []),
    ].filter(Boolean);

    return [...new Set(imagenes)];
  }, [desarrollo]);

  useEffect(() => {
    setImagenActual(0);
  }, [slug, imagenesCarrusel.length]);

  useEffect(() => {
    setImagenesModeloActivas({});
  }, [slug]);

  useEffect(() => {
    if (!desarrollo?.id) {
      viewContentTrackedRef.current = '';
      return undefined;
    }

    const trackingKey = String(desarrollo.id);
    if (viewContentTrackedRef.current === trackingKey) {
      return undefined;
    }

    viewContentTrackedRef.current = trackingKey;
    trackConversionEvent({
      tipoEvento: EVENTOS_CONVERSION.LANDING_VIEW,
      entidadTipo: 'DESARROLLO',
      entidadId: desarrollo.id,
      slug,
      origen: 'landing',
      gaParams: { desarrollo_name: desarrollo.nombre || '' },
    });

    trackMetaEvent('ViewContent', {
      content_name: desarrollo.nombre || '',
      content_category: 'Desarrollo inmobiliario',
      content_type: 'desarrollo',
      desarrollo: desarrollo.nombre || '',
      precio_desde: desarrollo.precioDesde || undefined,
    });

    return undefined;
  }, [desarrollo?.id, desarrollo?.nombre, desarrollo?.precioDesde, slug]);


  const trackDesarrolloConversion = useCallback((tipoEvento, metadata = {}, gaParams = {}) => {
    if (!desarrollo?.id) {
      return;
    }

    trackConversionEvent({
      tipoEvento,
      entidadTipo: 'DESARROLLO',
      entidadId: desarrollo.id,
      slug,
      origen: 'landing',
      metadata,
      gaParams,
    });
  }, [desarrollo?.id, slug]);
  // TODO: habilitar tour 360 general del desarrollo cuando existan escenas del desarrollo/amenidades.

  const ocultarPlanoInteractivo = useCallback(() => {
    setMostrarPlanoInteractivo(false);
  }, []);

  const codigoAsesorParaCompartir = useMemo(
    () => String(usuario?.codigoAsesor || asesorReferido?.codigoAsesor || '').trim(),
    [asesorReferido?.codigoAsesor, usuario?.codigoAsesor]
  );

  const telefonoWhatsappDesarrollo = useMemo(
    () => getWhatsAppPhone(asesorReferido?.telefono || desarrollo?.telefonoContacto),
    [asesorReferido?.telefono, desarrollo?.telefonoContacto]
  );

  const shareData = useMemo(() => {
    if (!desarrollo) return null;

    const shareUrl = buildDesarrolloShareUrl(slug || desarrollo.slug, codigoAsesorParaCompartir);
    const texto = `Conoce ${desarrollo.nombre}, un desarrollo inmobiliario disponible en CN Inmobiliaria.`;

    return {
      shareUrl,
      texto,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(`${texto} ${shareUrl}`)}`,
      facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      twitterUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(shareUrl)}`,
      linkedinUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    };
  }, [codigoAsesorParaCompartir, desarrollo, slug]);

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
  const googleMapsUrl = desarrollo.urlGoogleMaps || '';
  const coordinatesMapsUrl = buildMapsUrl(desarrollo.latitud, desarrollo.longitud);


  const irAModelos = (event) => {
    event.preventDefault();
    document.getElementById('modelos-disponibles')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  };

  const abrirModalProspecto = (modelo = null, opciones = {}) => {
    const origen = opciones.origen || (modelo ? 'MODELO' : 'DESARROLLO');

    if (origen !== 'PLANO_UNIDAD') {
      trackDesarrolloConversion(EVENTOS_CONVERSION.ME_INTERESA_CLICK, {
        boton: opciones.boton || 'me_interesa',
        modeloId: modelo?.id || null,
      });
    }

    setProspectoModal({
      isOpen: true,
      initialMessage: opciones.initialMessage || '',
      modelo,
      origen,
      unidad: opciones.unidad || null,
    });
  };

  const cerrarModalProspecto = () => {
    setProspectoModal((actual) => ({
      ...actual,
      isOpen: false,
    }));
  };

  const copiarShareUrl = async () => {
    if (!shareData?.shareUrl) return;

    try {
      await copiarTexto(shareData.shareUrl);
      setShareFeedback(codigoAsesorParaCompartir ? 'Link con asesor copiado.' : 'Enlace copiado.');
    } catch (_) {
      setShareFeedback('No se pudo copiar el enlace. Copia la URL desde la barra del navegador.');
    }
  };

  const abrirWhatsapp = ({ desarrollo: desarrolloActual, mensaje, modelo }) => {
    trackDesarrolloConversion(EVENTOS_CONVERSION.WHATSAPP_CLICK, {
      boton: modelo ? 'whatsapp_modelo' : 'whatsapp_cta',
      modeloId: modelo?.id || null,
    });

    trackEvent('click_whatsapp', {
      source: 'detalle_desarrollo',
      desarrollo_slug: slug,
      desarrollo_name: desarrolloActual?.nombre || '',
      modelo_name: modelo?.nombre || '',
    });
    trackMetaEvent('Contact', {
      content_name: desarrolloActual?.nombre || '',
      content_category: 'Desarrollo inmobiliario',
      content_type: 'desarrollo',
      desarrollo: desarrolloActual?.nombre || '',
      modelo: modelo?.nombre || '',
    });

    if (mensaje) {
      const telefono = telefonoWhatsappDesarrollo;
      if (!telefono) return;
      const mensajeWhatsapp = shareData?.shareUrl ? `${mensaje} ${shareData.shareUrl}` : mensaje;
      window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(mensajeWhatsapp)}`, '_blank', 'noopener,noreferrer');
      return;
    }

    window.open(whatsappHref(desarrolloActual, modelo, telefonoWhatsappDesarrollo, shareData?.shareUrl || ''), '_blank', 'noopener,noreferrer');
  };

  const abrirApartadoUnidad = (unidad) => {
    if (!unidad) {
      return;
    }

    trackDesarrolloConversion(EVENTOS_CONVERSION.APARTAR_CLICK, {
      unidadId: unidad?.unidadId || unidad?.id || null,
      modeloId: unidad?.modeloId || null,
      manzana: unidad?.manzana || '',
      lote: unidad?.lote || unidad?.codigoUnidad || '',
    });

    trackEvent('click_apartar_unidad', {
      source: 'plano_interactivo_demo',
      desarrollo_slug: slug,
      desarrollo_name: desarrollo?.nombre || '',
      unit_code: unidad?.codigoUnidad || unidad?.codigo || '',
    });
    trackMetaEvent('Lead', {
      content_name: desarrollo?.nombre || '',
      content_category: 'Desarrollo inmobiliario',
      content_type: 'desarrollo',
      desarrollo: desarrollo?.nombre || '',
      unidad: unidad?.codigoUnidad || unidad?.codigo || '',
    });

    const modeloNombre = cleanText(unidad.modeloNombre || unidad.modelo || unidad.nombreModelo);
    const modelo = unidad.modeloId || modeloNombre
      ? {
        id: unidad.modeloId || null,
        nombre: modeloNombre || 'Modelo por confirmar',
      }
      : null;

    abrirModalProspecto(modelo, {
      initialMessage: buildApartarMessage(unidad, desarrollo),
      origen: 'PLANO_UNIDAD',
      unidad,
    });
  };

  const abrirLightbox = (images, initialIndex, title) => {
    setLightbox({
      images,
      initialIndex,
      isOpen: true,
      title,
    });
  };

  const cerrarLightbox = () => {
    setLightbox((actual) => ({ ...actual, isOpen: false }));
  };

  const moverCarrusel = (direccion) => {
    setImagenActual((actual) => {
      if (imagenesCarrusel.length <= 1) {
        return 0;
      }

      return (actual + direccion + imagenesCarrusel.length) % imagenesCarrusel.length;
    });
  };

  const moverImagenModelo = (modeloId, total, direccion) => {
    if (total <= 1) {
      return;
    }

    setImagenesModeloActivas((actuales) => {
      const actual = actuales[modeloId] || 0;
      return {
        ...actuales,
        [modeloId]: (actual + direccion + total) % total,
      };
    });
  };

  const seleccionarImagenModelo = (modeloId, index) => {
    setImagenesModeloActivas((actuales) => ({
      ...actuales,
      [modeloId]: index,
    }));
  };

  const abrirTourModelo = async (modelo) => {
    trackDesarrolloConversion(EVENTOS_CONVERSION.TOUR360_OPEN, {
      tourId: modelo?.tour360Id || null,
      modeloId: modelo?.id || null,
    });

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
          <span>{desarrollo.ubicacion || 'Ubicación por confirmar'}</span>
          {desarrollo.nombreContacto ? (
            <small className="detalle-desarrollo-contacto">Asesor asignado: {desarrollo.nombreContacto}</small>
          ) : null}
          <strong>Desde {formatCurrency(desarrollo.precioDesde)}</strong>
          <div className="detalle-desarrollo-hero-actions">
            <button
              type="button"
              onClick={() => {
                trackEvent('click_me_interesa', {
                  source: 'detalle_desarrollo_hero',
                  desarrollo_slug: slug,
                  desarrollo_name: desarrollo.nombre || '',
                });
                trackMetaEvent('Lead', {
                  content_name: desarrollo.nombre || '',
                  content_category: 'Desarrollo inmobiliario',
                  content_type: 'desarrollo',
                  desarrollo: desarrollo.nombre || '',
                });
                abrirModalProspecto();
              }}
            >
              WhatsApp
            </button>
            <a href="#modelos-disponibles" onClick={irAModelos}>Ver modelos</a>
          </div>
        </div>
      </section>

      <section className="detalle-desarrollo-shell">
        {shareData ? (
          <section className="detalle-desarrollo-share" aria-label="Compartir desarrollo">
            <div>
              <p className="detalle-desarrollo-eyebrow">Compartir desarrollo</p>
              <span>{shareFeedback || 'Comparte este desarrollo con alguien que pueda estar interesado.'}</span>
            </div>
            <div className="detalle-desarrollo-share-buttons">
              <a href={shareData.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="Compartir por WhatsApp">
                WhatsApp
              </a>
              <a href={shareData.facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="Compartir en Facebook">
                Facebook
              </a>
              <a href={shareData.twitterUrl} target="_blank" rel="noopener noreferrer" aria-label="Compartir en X">
                X
              </a>
              <a href={shareData.linkedinUrl} target="_blank" rel="noopener noreferrer" aria-label="Compartir en LinkedIn">
                LinkedIn
              </a>
              <button type="button" onClick={copiarShareUrl} aria-label="Copiar enlace del desarrollo">
                Copiar enlace
              </button>
            </div>
          </section>
        ) : null}

        <div className="detalle-desarrollo-intro">
          <div>
            <p className="detalle-desarrollo-eyebrow">Concepto</p>
            <h2>Un proyecto pensado para vivir e invertir</h2>
            <RichTextContent content={desarrollo.descripcion || 'Conoce disponibilidad, amenidades y modelos de este desarrollo.'} />
          </div>
          <aside>
            <span>Precio desde</span>
            <strong>{formatCurrency(desarrollo.precioDesde)}</strong>
            {desarrollo.nombreContacto ? (
              <small className="detalle-desarrollo-contacto-card">Asesor asignado: {desarrollo.nombreContacto}</small>
            ) : null}
            <button
              type="button"
              onClick={() => {
                trackEvent('click_me_interesa', {
                  source: 'detalle_desarrollo_contacto',
                  desarrollo_slug: slug,
                  desarrollo_name: desarrollo.nombre || '',
                });
                trackMetaEvent('Lead', {
                  content_name: desarrollo.nombre || '',
                  content_category: 'Desarrollo inmobiliario',
                  content_type: 'desarrollo',
                  desarrollo: desarrollo.nombre || '',
                });
                abrirModalProspecto();
              }}
            >
              Solicitar información
            </button>
          </aside>
        </div>

        <section className="detalle-desarrollo-ubicacion">
          <div className="detalle-desarrollo-section-head">
            <p className="detalle-desarrollo-eyebrow">Ubicación</p>
            <h2>Conoce dónde está ubicado el desarrollo</h2>
          </div>
          {googleMapsUrl || coordinatesMapsUrl ? (
            <div className="detalle-desarrollo-ubicacion-actions">
              {googleMapsUrl ? (
                <a href={googleMapsUrl} target="_blank" rel="noreferrer">
                  Ver ubicación en Google Maps
                </a>
              ) : null}
              {coordinatesMapsUrl ? (
                <a href={coordinatesMapsUrl} target="_blank" rel="noreferrer">
                  Cómo llegar
                </a>
              ) : null}
            </div>
          ) : (
            <p className="detalle-desarrollo-ubicacion-empty">Ubicación disponible bajo solicitud</p>
          )}
        </section>

        {imagenesCarrusel.length > 0 ? (
          <section className="detalle-desarrollo-carousel" aria-label="Galería del desarrollo">
            <div className="detalle-desarrollo-carousel-main">
              <img
                src={imagenesCarrusel[imagenActual]}
                alt={`${desarrollo.nombre} ${imagenActual + 1}`}
              />
              <span className="detalle-desarrollo-carousel-counter">
                {imagenActual + 1} / {imagenesCarrusel.length}
              </span>
              {imagenesCarrusel.length > 1 ? (
                <div className="detalle-desarrollo-carousel-controls">
                  <button type="button" onClick={() => moverCarrusel(-1)} aria-label="Imagen anterior">
                    Anterior
                  </button>
                  <button type="button" onClick={() => moverCarrusel(1)} aria-label="Imagen siguiente">
                    Siguiente
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                className="detalle-desarrollo-view-large"
                onClick={() => abrirLightbox(imagenesCarrusel, imagenActual, desarrollo.nombre)}
              >
                Ver en grande
              </button>
            </div>
            {imagenesCarrusel.length > 1 ? (
              <div className="detalle-desarrollo-carousel-thumbs">
                {imagenesCarrusel.map((imagen, index) => (
                  <button
                    key={`${imagen}-${index}`}
                    type="button"
                    className={index === imagenActual ? 'is-active' : ''}
                    onClick={() => setImagenActual(index)}
                    aria-label={`Ver imagen ${index + 1}`}
                  >
                    <img src={imagen} alt="" />
                  </button>
                ))}
              </div>
            ) : null}
          </section>
        ) : (
          <section className="detalle-desarrollo-gallery-empty">
            <p>Galería próximamente disponible.</p>
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

        {mostrarPlanoInteractivo ? (
          <section className="detalle-desarrollo-section">
            <div className="detalle-desarrollo-section-head">
              <p className="detalle-desarrollo-eyebrow">Disponibilidad</p>
              <h2>Plano interactivo de disponibilidad</h2>
            </div>
            <PlanoInteractivoDemo
              desarrolloId={desarrollo.id}
              onApartarUnidad={abrirApartadoUnidad}
              onUnidadSelect={(unidad) => trackDesarrolloConversion(EVENTOS_CONVERSION.MAPA_INTERACTIVO, {
                unidadId: unidad?.unidadId || unidad?.id || null,
                svgElementId: unidad?.svgElementId || '',
                estatus: unidad?.estatus || '',
              })}
              requireRealSvg
              onUnavailable={ocultarPlanoInteractivo}
            />
          </section>
        ) : null}

        <section id="modelos-disponibles" className="detalle-desarrollo-section">
          <div className="detalle-desarrollo-section-head">
            <p className="detalle-desarrollo-eyebrow">Modelos disponibles</p>
            <h2>Elige la distribución que encaja con tu plan</h2>
          </div>
          {desarrollo.modelos.length === 0 ? (
            <p className="detalle-desarrollo-modelos-empty">Próximamente modelos disponibles</p>
          ) : (
            <div className="modelos-grid">
              {desarrollo.modelos.map((modelo) => {
                const galeriaModelo = [...new Set([
                  modelo.imagenPrincipal,
                  ...(modelo.imagenes || []),
                ].filter(Boolean))];
                const modeloKey = modelo.id || modelo.nombre;
                const imagenModeloActual = Math.min(imagenesModeloActivas[modeloKey] || 0, Math.max(galeriaModelo.length - 1, 0));
                const imagenModelo = galeriaModelo[imagenModeloActual] || '';
                const preciosModelo = modelo.preciosActivos || modelo.precios || [];
                const precioDesdeTexto = modelo.precioDesdeTexto || modelo.precioTexto || formatearMonedaMXN(modelo.precioDesde || modelo.precio);

                return (
                  <article key={modeloKey} className="modelo-card">
                    <div className={`modelo-card-media ${imagenModelo ? '' : 'is-placeholder'}`}>
                      {imagenModelo ? (
                        <img src={imagenModelo} alt={modelo.nombre} />
                      ) : (
                        <div>Imagen próximamente</div>
                      )}
                      <span className={modelo.disponible ? 'is-available' : 'is-unavailable'}>
                        {modelo.disponible ? 'Disponible' : 'Lista de espera'}
                      </span>
                      {galeriaModelo.length > 1 ? (
                        <>
                          <span className="modelo-card-counter">
                            {imagenModeloActual + 1} / {galeriaModelo.length}
                          </span>
                          <div className="modelo-card-media-controls">
                            <button type="button" onClick={() => moverImagenModelo(modeloKey, galeriaModelo.length, -1)} aria-label="Imagen anterior del modelo">
                              Anterior
                            </button>
                            <button type="button" onClick={() => moverImagenModelo(modeloKey, galeriaModelo.length, 1)} aria-label="Imagen siguiente del modelo">
                              Siguiente
                            </button>
                          </div>
                        </>
                      ) : null}
                      {galeriaModelo.length > 0 ? (
                        <button
                          type="button"
                          className="modelo-card-view-large"
                          onClick={() => abrirLightbox(galeriaModelo, imagenModeloActual, modelo.nombre)}
                        >
                          Ver en grande
                        </button>
                      ) : null}
                    </div>
                    {galeriaModelo.length > 1 ? (
                      <div className="modelo-card-thumbs" aria-label={`Galería de ${modelo.nombre}`}>
                        {galeriaModelo.slice(0, 4).map((imagen, index) => (
                          <button
                            key={`${modeloKey}-${imagen}-${index}`}
                            type="button"
                            className={index === imagenModeloActual ? 'is-active' : ''}
                            onClick={() => seleccionarImagenModelo(modeloKey, index)}
                            aria-label={`Ver imagen ${index + 1} de ${modelo.nombre}`}
                          >
                            <img src={imagen} alt="" />
                          </button>
                        ))}
                        {galeriaModelo.length > 4 ? <span>+{galeriaModelo.length - 4}</span> : null}
                      </div>
                    ) : null}
                    <div className="modelo-card-body">
                      <div>
                        <h3>{modelo.nombre}</h3>
                        <strong>Desde {precioDesdeTexto}</strong>
                        {preciosModelo.length > 0 ? <span className="modelo-card-price-note">Precio de contado</span> : null}
                        {modelo.tieneMasDeUnPrecioActivo ? <span className="modelo-card-price-note">Otros esquemas de financiamiento disponibles</span> : null}
                      </div>
                      <RichTextContent content={modelo.descripcion || 'Modelo disponible dentro del desarrollo.'} />
                      {preciosModelo.length > 0 ? (
                        <section className="modelo-card-prices" aria-label={`Opciones de compra de ${modelo.nombre}`}>
                          <h4>Opciones de compra</h4>
                          <div className="modelo-card-prices-grid">
                            {preciosModelo.map((precio) => (
                              <article key={precio.id || `${modeloKey}-${precio.tipoPrecioId || precio.tipoPrecioCodigo || precio.tipoPrecioNombre}`}>
                                <span>{precio.tipoPrecioNombre}</span>
                                <strong>{precio.precioTexto || formatearMonedaMXN(precio.precio)}</strong>
                                {precio.descripcion ? <small>{precio.descripcion}</small> : null}
                              </article>
                            ))}
                          </div>
                          <small className="modelo-card-prices-note">Precios sujetos a disponibilidad, forma de pago y autorización de crédito.</small>
                        </section>
                      ) : null}
                      <dl>
                        <div><dt>Recámaras</dt><dd>{modelo.recamaras}</dd></div>
                        <div><dt>Baños</dt><dd>{modelo.banos}{modelo.medioBano ? ` + ${modelo.medioBano}/2` : ''}</dd></div>
                        <div><dt>Estac.</dt><dd>{modelo.estacionamientos}</dd></div>
                        <div><dt>Construcción</dt><dd>{modelo.construccionM2} m2</dd></div>
                        <div><dt>Terreno</dt><dd>{modelo.terrenoM2} m2</dd></div>
                      </dl>
                      <button
                        type="button"
                        onClick={() => {
                          trackEvent('click_me_interesa', {
                            source: 'detalle_desarrollo_modelo',
                            desarrollo_slug: slug,
                            desarrollo_name: desarrollo.nombre || '',
                            modelo_name: modelo.nombre || '',
                          });
                          trackMetaEvent('Lead', {
                            content_name: desarrollo.nombre || '',
                            content_category: 'Desarrollo inmobiliario',
                            content_type: 'desarrollo',
                            desarrollo: desarrollo.nombre || '',
                            modelo: modelo.nombre || '',
                          });
                          abrirModalProspecto(modelo);
                        }}
                      >
                        Me interesa este modelo
                      </button>
                      <button
                        type="button"
                        className="modelo-card-secondary"
                        onClick={() => {
                          trackEvent('click_tour_360', {
                            source: 'detalle_desarrollo_modelo',
                            desarrollo_slug: slug,
                            desarrollo_name: desarrollo.nombre || '',
                            modelo_name: modelo.nombre || '',
                          });
                          trackMetaCustomEvent('ClickTour360', {
                            content_name: desarrollo.nombre || '',
                            content_category: 'Desarrollo inmobiliario',
                            content_type: 'desarrollo',
                            desarrollo: desarrollo.nombre || '',
                            modelo: modelo.nombre || '',
                          });
                          abrirTourModelo(modelo);
                        }}
                      >
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
        codigoAsesor={asesorReferido?.codigoAsesor || null}
        desarrollo={desarrollo}
        initialMessage={prospectoModal.initialMessage}
        isOpen={prospectoModal.isOpen}
        modelo={prospectoModal.modelo}
        onClose={cerrarModalProspecto}
        onSuccess={abrirWhatsapp}
        origen={prospectoModal.origen}
        unidad={prospectoModal.unidad}
      />
      <ImageLightbox
        images={lightbox.images}
        initialIndex={lightbox.initialIndex}
        isOpen={lightbox.isOpen}
        onClose={cerrarLightbox}
        title={lightbox.title}
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
