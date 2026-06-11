import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FaDirections,
  FaFacebookF,
  FaLink,
  FaLinkedinIn,
  FaMapMarkerAlt,
  FaSearchPlus,
  FaTimes,
  FaTwitter,
  FaWhatsapp,
} from 'react-icons/fa';
import { Link, useParams } from 'react-router-dom';
import RichTextContent from '../components/common/RichTextContent';
import ProyectoPlanoInteractivo from '../components/proyectos/ProyectoPlanoInteractivo';
import { getWhatsAppPhone } from '../config/contacto';
import { trackEvent } from '../lib/analytics';
import { EVENTOS_CONVERSION, trackConversionEvent } from '../lib/conversionEvents';
import { trackMetaCustomEvent, trackMetaEvent } from '../lib/metaPixel';
import { resolveApiAssetUrl } from '../services/apiClient';
import {
  crearProspectoPublico,
  listarImagenesPublicas,
  listarModelosPublicos,
  listarUnidadesPublicas,
  obtenerPlanoPublico,
  obtenerProyectoPublico,
} from '../services/proyectosInmobiliariosPublicService';
import './ProyectoInmobiliarioDetallePage.css';

const CN_LOGO = './assets/logo.png';
const UNIDADES_PAGE_SIZE = 12;
const ESTATUS_UNIDAD = ['DISPONIBLE', 'APARTADO', 'EN_PROCESO', 'VENDIDO', 'LIQUIDADO', 'BLOQUEADO', 'NO_DISPONIBLE'];
const TIPOS_UNIDAD = ['LOTE', 'CASA', 'DEPARTAMENTO', 'LOCAL', 'OFICINA', 'MACROLOTE', 'OTRO'];
const FILTROS_UNIDADES_INICIALES = {
  texto: '',
  estatus: '',
  tipoUnidad: '',
  modeloId: '',
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible procesar la solicitud.';

const formatArea = (value) => {
  if (!value || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toLocaleString('es-MX')} m2`;
};

const getStatusClass = (status) =>
  `is-${String(status || '').trim().toLowerCase().replace(/\s+/g, '_')}`;

const getImagenDescripcion = (imagen) =>
  imagen?.descripcion || imagen?.titulo || imagen?.alt || imagen?.nombre || imagen?.texto || '';

const getImagenAlt = (imagen, proyectoNombre) =>
  imagen?.descripcion || imagen?.titulo || imagen?.alt || imagen?.nombre || imagen?.texto || proyectoNombre || 'Imagen del proyecto';

const cleanLocationText = (value) => {
  const text = String(value || '').trim();
  if (!text || /^ubicaci[oó]n por confirmar$/i.test(text)) return '';
  return text;
};

const hasCoordinate = (value) => {
  const text = String(value ?? '').trim();
  return text !== '' && !Number.isNaN(Number(text));
};

const buildGoogleMapsSearchUrl = (query) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

const buildProyectoMapsUrl = (proyecto) => {
  const directUrl = cleanLocationText(proyecto?.googleMapsUrl || proyecto?.mapaUrl || proyecto?.ubicacionUrl);
  if (directUrl) return directUrl;

  if (hasCoordinate(proyecto?.latitud) && hasCoordinate(proyecto?.longitud)) {
    return buildGoogleMapsSearchUrl(`${proyecto.latitud},${proyecto.longitud}`);
  }

  const locationParts = [
    proyecto?.localidadNombre,
    proyecto?.poblacionNombre || proyecto?.municipioNombre,
    proyecto?.estadoNombre,
    proyecto?.ubicacionTexto,
    proyecto?.ubicacion,
  ].map(cleanLocationText).filter(Boolean);

  if (!locationParts.length) return '';

  return buildGoogleMapsSearchUrl([proyecto?.nombre, ...locationParts].filter(Boolean).join(' '));
};

const buildProyectoMapsEmbedUrl = (proyecto) => {
  if (!hasCoordinate(proyecto?.latitud) || !hasCoordinate(proyecto?.longitud)) return '';
  return `https://www.google.com/maps?q=${encodeURIComponent(`${proyecto.latitud},${proyecto.longitud}`)}&output=embed`;
};

const buildProyectoShareUrl = (slug) => {
  if (typeof window === 'undefined') {
    return slug ? `https://cninmobiliaria.com.mx/#/proyectos-inmobiliarios/${slug}` : '';
  }

  if (!slug) {
    return window.location.href;
  }

  return `${window.location.origin}${window.location.pathname}#/proyectos-inmobiliarios/${slug}`;
};

const copiarTexto = async (texto) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(texto);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = texto;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.top = '-9999px';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const buildUnidadMessage = (unidad, proyecto) =>
  `Me interesa la unidad ${unidad?.codigo || 'seleccionada'} del proyecto ${proyecto?.nombre || ''}. Quiero recibir mas información.`
    .replace(/\s+/g, ' ')
    .trim();

const FORM_INICIAL = {
  nombre: '',
  telefono: '',
  correo: '',
  mensaje: '',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const buildSolicitudWhatsappText = ({ form, proyecto, unidadSeleccionada }) => {
  const lines = [
    `Hola, me interesa el proyecto ${proyecto?.nombre || ''}. Acabo de enviar mi solicitud desde la página de CN Inmobiliaria.`,
    unidadSeleccionada?.codigo ? `Unidad: ${unidadSeleccionada.codigo}` : '',
    `Nombre: ${form.nombre.trim()}`,
    `Teléfono: ${form.telefono.trim()}`,
    form.correo.trim() ? `Correo: ${form.correo.trim()}` : '',
    form.mensaje.trim() ? `Mensaje: ${form.mensaje.trim()}` : '',
    '',
    `Vengo desde: ${window.location.href}`,
  ];

  return lines.filter((line) => line !== '').join('\n');
};

export default function ProyectoInmobiliarioDetallePage() {
  const { slug } = useParams();
  const contactoRef = useRef(null);
  const unidadesRef = useRef(null);
  const planoRef = useRef(null);
  const conversionViewTrackedRef = useRef('');
  const [proyecto, setProyecto] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [plano, setPlano] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [filtrosUnidades, setFiltrosUnidades] = useState(FILTROS_UNIDADES_INICIALES);
  const [unidadesVisibles, setUnidadesVisibles] = useState(UNIDADES_PAGE_SIZE);
  const [imagenSeleccionada, setImagenSeleccionada] = useState(null);
  const [modeloImagenModal, setModeloImagenModal] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [formError, setFormError] = useState('');
  const [shareFeedback, setShareFeedback] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const cargar = async () => {
      setLoading(true);
      setError('');

      try {
        const proyectoData = await obtenerProyectoPublico(slug, { signal: controller.signal });
        const [modelosData, unidadesData, planoData, imagenesData] = await Promise.all([
          listarModelosPublicos(slug, { signal: controller.signal }).catch(() => []),
          listarUnidadesPublicas(slug, { signal: controller.signal }).catch(() => []),
          obtenerPlanoPublico(slug, { signal: controller.signal }).catch(() => null),
          listarImagenesPublicas(slug, { signal: controller.signal }).catch(() => []),
        ]);

        setProyecto(proyectoData);
        setModelos(modelosData);
        setUnidades(unidadesData);
        setPlano(planoData?.activo ? planoData : null);
        setImagenes(imagenesData);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setProyecto(null);
          setError(err.status === 404 ? 'Proyecto no encontrado.' : getApiErrorMessage(err));
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
    if (!proyecto?.nombre) return undefined;
    const previousTitle = document.title;
    document.title = `${proyecto.nombre} | CN Inmobiliaria`;
    return () => {
      document.title = previousTitle;
    };
  }, [proyecto?.nombre]);


  useEffect(() => {
    if (!proyecto?.id) {
      conversionViewTrackedRef.current = '';
      return undefined;
    }

    const trackingKey = String(proyecto.id);
    if (conversionViewTrackedRef.current === trackingKey) {
      return undefined;
    }

    conversionViewTrackedRef.current = trackingKey;
    trackConversionEvent({
      tipoEvento: EVENTOS_CONVERSION.LANDING_VIEW,
      entidadTipo: 'PROYECTO',
      entidadId: proyecto.id,
      slug,
      origen: 'landing',
      gaParams: { project_name: proyecto.nombre || '' },
    });

    return undefined;
  }, [proyecto?.id, proyecto?.nombre, slug]);
  useEffect(() => {
    setUnidadesVisibles(UNIDADES_PAGE_SIZE);
  }, [filtrosUnidades]);

  useEffect(() => {
    if (!modeloImagenModal && !imagenSeleccionada) return undefined;

    const cerrarConEscape = (event) => {
      if (event.key === 'Escape') {
        setModeloImagenModal(null);
        setImagenSeleccionada(null);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', cerrarConEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', cerrarConEscape);
    };
  }, [imagenSeleccionada, modeloImagenModal]);

  const imagenPrincipal = useMemo(() => {
    const principal = imagenes.find((imagen) => imagen.tipoImagen === 'PRINCIPAL')?.url || proyecto?.imagenPrincipalUrl;
    return resolveApiAssetUrl(principal);
  }, [imagenes, proyecto?.imagenPrincipalUrl]);

  const logoUrl = useMemo(() => {
    const logoHero = proyecto?.usarLogoEmpresa && proyecto?.logoEmpresaUrl
      ? proyecto.logoEmpresaUrl
      : proyecto?.logoProyectoUrl || proyecto?.logoUrl || '';

    return resolveApiAssetUrl(logoHero) || CN_LOGO;
  }, [proyecto?.logoEmpresaUrl, proyecto?.logoProyectoUrl, proyecto?.logoUrl, proyecto?.usarLogoEmpresa]);

  const galeria = useMemo(() => {
    const items = imagenes
      .filter((imagen) => imagen.url && imagen.tipoImagen !== 'LOGO')
      .map((imagen) => ({
        ...imagen,
        urlResolved: resolveApiAssetUrl(imagen.url),
      }));

    if (!items.length && imagenPrincipal) {
      return [{ id: 'principal', tipoImagen: 'PRINCIPAL', urlResolved: imagenPrincipal, titulo: proyecto?.nombre }];
    }

    return items;
  }, [imagenes, imagenPrincipal, proyecto?.nombre]);

  const ubicacionProyecto = useMemo(() => {
    const estado = cleanLocationText(proyecto?.estadoNombre);
    const municipio = cleanLocationText(proyecto?.poblacionNombre || proyecto?.municipioNombre);
    const localidad = cleanLocationText(proyecto?.localidadNombre);
    const direccion = cleanLocationText(proyecto?.direccion);
    const referencia = cleanLocationText(proyecto?.referencia);
    const ubicacionTexto = cleanLocationText(proyecto?.ubicacionTexto);
    const ubicacionGeneral = cleanLocationText(proyecto?.ubicacion);
    const mapsUrl = buildProyectoMapsUrl(proyecto);
    const embedUrl = buildProyectoMapsEmbedUrl(proyecto);
    const resumen = [localidad, municipio, estado].filter(Boolean).join(', ') ||
      ubicacionTexto ||
      ubicacionGeneral ||
      direccion ||
      (embedUrl ? 'Ubicación por coordenadas' : '') ||
      (mapsUrl ? 'Ubicación en Google Maps' : '');
    const detalles = [
      { label: 'Estado', value: estado },
      { label: 'Municipio/Poblacion', value: municipio },
      { label: 'Localidad', value: localidad },
      { label: 'Direccion', value: direccion },
      { label: 'Referencia', value: referencia },
    ].filter((item) => item.value);

    return {
      resumen,
      detalles,
      mapsUrl,
      embedUrl,
      hasData: Boolean(resumen || detalles.length || mapsUrl || embedUrl),
    };
  }, [proyecto]);

  const shareData = useMemo(() => {
    if (!proyecto) return null;

    const shareUrl = buildProyectoShareUrl(slug || proyecto.slug);
    const ubicacion = cleanLocationText(proyecto.ubicacionTexto || proyecto.ubicacion);
    let texto = `Conoce ${proyecto.nombre}, un proyecto inmobiliario disponible en CN Inmobiliaria.`;

    if (ubicacion) {
      texto = `Conoce ${proyecto.nombre} en ${ubicacion}, disponible en CN Inmobiliaria.`;
    } else if (proyecto.empresaNombre) {
      texto = `Conoce ${proyecto.nombre} de ${proyecto.empresaNombre}, disponible en CN Inmobiliaria.`;
    }

    return {
      facebookUrl: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`,
      linkedinUrl: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
      shareText: texto,
      shareUrl,
      twitterUrl: `https://twitter.com/intent/tweet?text=${encodeURIComponent(texto)}&url=${encodeURIComponent(shareUrl)}`,
      whatsappUrl: `https://wa.me/?text=${encodeURIComponent(`${texto} ${shareUrl}`)}`,
    };
  }, [proyecto, slug]);

  const modelosConUnidades = useMemo(() => {
    const ids = new Set(unidades.map((unidad) => String(unidad.modeloId || '')).filter(Boolean));
    return modelos.filter((modelo) => ids.has(String(modelo.id || modelo.modeloId)));
  }, [modelos, unidades]);

  const unidadesFiltradas = useMemo(() => {
    const term = filtrosUnidades.texto.trim().toLowerCase();

    return unidades.filter((unidad) => {
      const coincideTexto = !term || [
        unidad.codigo,
        unidad.nombre,
        unidad.manzana,
        unidad.lote,
        unidad.torre,
        unidad.nivel,
        unidad.numeroInterior,
      ].join(' ').toLowerCase().includes(term);
      const coincideEstatus = !filtrosUnidades.estatus || unidad.estatus === filtrosUnidades.estatus;
      const coincideTipo = !filtrosUnidades.tipoUnidad || unidad.tipoUnidad === filtrosUnidades.tipoUnidad;
      const coincideModelo = !filtrosUnidades.modeloId || String(unidad.modeloId) === String(filtrosUnidades.modeloId);

      return coincideTexto && coincideEstatus && coincideTipo && coincideModelo;
    });
  }, [filtrosUnidades, unidades]);

  const unidadesOrdenadas = useMemo(() => {
    const prioridad = {
      DISPONIBLE: 0,
      APARTADO: 1,
      EN_PROCESO: 2,
      VENDIDO: 3,
      LIQUIDADO: 4,
      BLOQUEADO: 5,
      NO_DISPONIBLE: 6,
    };

    return [...unidades].sort((a, b) =>
      (prioridad[a.estatus] ?? 10) - (prioridad[b.estatus] ?? 10) ||
      String(a.manzana || '').localeCompare(String(b.manzana || ''), 'es-MX', { numeric: true }) ||
      String(a.lote || '').localeCompare(String(b.lote || ''), 'es-MX', { numeric: true }) ||
      String(a.codigo).localeCompare(String(b.codigo))
    );
  }, [unidades]);

  const unidadesFiltradasOrdenadas = useMemo(() => {
    const visiblesSet = new Set(unidadesFiltradas.map((unidad) => String(unidad.id)));
    return unidadesOrdenadas.filter((unidad) => visiblesSet.has(String(unidad.id)));
  }, [unidadesFiltradas, unidadesOrdenadas]);

  const unidadesMostradas = useMemo(
    () => unidadesFiltradasOrdenadas.slice(0, unidadesVisibles),
    [unidadesFiltradasOrdenadas, unidadesVisibles]
  );


  const trackProyectoConversion = useCallback((tipoEvento, metadata = {}, gaParams = {}) => {
    if (!proyecto?.id) {
      return;
    }

    trackConversionEvent({
      tipoEvento,
      entidadTipo: 'PROYECTO',
      entidadId: proyecto.id,
      slug,
      origen: 'landing',
      metadata,
      gaParams,
    });
  }, [proyecto?.id, slug]);
  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const seleccionarUnidad = useCallback((unidad) => {
    setUnidadSeleccionada(unidad);
    setForm((actual) => ({
      ...actual,
      mensaje: buildUnidadMessage(unidad, proyecto),
    }));
  }, [proyecto]);

  const seleccionarUnidadYContactar = (unidad) => {
    seleccionarUnidad(unidad);
    trackProyectoConversion(EVENTOS_CONVERSION.ME_INTERESA_CLICK, {
      boton: 'me_interesa_tabla',
      unidadId: unidad?.id || unidad?.unidadId || null,
      modeloId: unidad?.modeloId || null,
    });
    trackEvent('click_me_interesa', {
      source: 'proyecto_inmobiliario_tabla',
      project_slug: slug,
      project_name: proyecto?.nombre || '',
      unit_code: unidad?.codigo || '',
    });
    trackMetaEvent('Lead', {
      content_name: proyecto?.nombre || '',
      content_category: 'Proyecto inmobiliario',
      content_type: 'proyecto_inmobiliario',
      desarrollo: proyecto?.nombre || '',
      unidad: unidad?.codigo || '',
    });
    window.setTimeout(() => scrollTo(contactoRef), 80);
  };

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({ ...actual, [name]: value }));
  };

  const actualizarFiltroUnidades = (event) => {
    const { name, value } = event.target;
    setFiltrosUnidades((actual) => ({ ...actual, [name]: value }));
  };

  const limpiarFiltrosUnidades = () => {
    setFiltrosUnidades(FILTROS_UNIDADES_INICIALES);
  };

  const abrirWhatsapp = () => {
    if (!proyecto) return;
    const telefono = getWhatsAppPhone(proyecto.telefonoContacto || proyecto.whatsappContacto);
    const text = `Hola, me interesa el proyecto ${proyecto.nombre}. Me gustaria recibir mas información.`;
    trackEvent('click_whatsapp', {
      source: 'proyecto_inmobiliario_detalle',
      project_slug: slug,
      project_name: proyecto.nombre || '',
    });
    trackMetaEvent('Contact', {
      content_name: proyecto.nombre || '',
      content_category: 'Proyecto inmobiliario',
      content_type: 'proyecto_inmobiliario',
      desarrollo: proyecto.nombre || '',
    });
    window.open(`https://wa.me/${telefono}?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const copiarEnlaceProyecto = async () => {
    if (!shareData?.shareUrl) return;

    try {
      await copiarTexto(shareData.shareUrl);
      setShareFeedback('Enlace copiado al portapapeles.');
    } catch (_) {
      setShareFeedback('No se pudo copiar el enlace. Copia la URL desde la barra del navegador.');
    }

    window.setTimeout(() => setShareFeedback(''), 3600);
  };

  const enviarProspecto = async (event) => {
    event.preventDefault();

    if (enviando) return;

    setFormError('');
    setMensaje('');

    const nombre = form.nombre.trim();
    const telefono = form.telefono.trim();
    const correo = form.correo.trim();
    const mensajeFormulario = form.mensaje.trim();

    if (!nombre) {
      setFormError('Ingresa tu nombre.');
      return;
    }

    if (!telefono) {
      setFormError('Ingresa tu teléfono.');
      return;
    }

    if (correo && !EMAIL_REGEX.test(correo)) {
      setFormError('Ingresa un correo válido.');
      return;
    }

    setEnviando(true);

    try {
      await crearProspectoPublico(slug, {
        nombre,
        telefono,
        correo: correo || null,
        email: correo || null,
        mensaje: mensajeFormulario || `Me interesa recibir información del proyecto ${proyecto.nombre}.`,
        unidadId: unidadSeleccionada?.id || unidadSeleccionada?.unidadId || null,
        proyectoId: proyecto.id || proyecto.proyectoId || null,
        slug: proyecto.slug || slug,
        origen: 'landing',
      });

      trackProyectoConversion(EVENTOS_CONVERSION.ME_INTERESA_CLICK, {
        boton: 'formulario_contacto_enviado',
        unidadId: unidadSeleccionada?.id || unidadSeleccionada?.unidadId || null,
        modeloId: unidadSeleccionada?.modeloId || null,
      });

      setMensaje('Solicitud enviada correctamente. Un asesor se pondrá en contacto contigo.');

      const telefonoDestino = getWhatsAppPhone(proyecto.telefonoContacto || proyecto.whatsappContacto);
      if (telefonoDestino) {
        const whatsappText = buildSolicitudWhatsappText({
          form: { nombre, telefono, correo, mensaje: mensajeFormulario },
          proyecto,
          unidadSeleccionada,
        });
        window.open(`https://wa.me/${telefonoDestino}?text=${encodeURIComponent(whatsappText)}`, '_blank', 'noopener,noreferrer');
      }

      setForm(FORM_INICIAL);
      setUnidadSeleccionada(null);
    } catch (err) {
      setFormError(err.data?.mensaje || err.data?.message || 'No se pudo enviar la solicitud. Intenta nuevamente o contáctanos por WhatsApp.');
    } finally {
      setEnviando(false);
    }
  };
  const seleccionarUnidadEnMapa = useCallback((unidad) => {
    trackProyectoConversion(EVENTOS_CONVERSION.MAPA_INTERACTIVO, {
      unidadId: unidad?.id || unidad?.unidadId || null,
      svgElementId: unidad?.svgElementId || '',
      estatus: unidad?.estatus || '',
    });
    trackEvent('click_mapa_interactivo', {
      source: 'proyecto_inmobiliario_plano',
      project_slug: slug,
      project_name: proyecto?.nombre || '',
      unit_code: unidad?.codigo || '',
    });
    trackMetaCustomEvent('ClickMapaInteractivo', {
      content_name: proyecto?.nombre || '',
      content_category: 'Proyecto inmobiliario',
      content_type: 'proyecto_inmobiliario',
      desarrollo: proyecto?.nombre || '',
      unidad: unidad?.codigo || '',
    });
    seleccionarUnidad(unidad);
  }, [proyecto?.nombre, seleccionarUnidad, slug, trackProyectoConversion]);

  if (loading) {
    return (
      <main className="proyecto-publico-page">
        <p className="proyecto-publico-feedback">Cargando proyecto...</p>
      </main>
    );
  }

  if (error || !proyecto) {
    return (
      <main className="proyecto-publico-page">
        <section className="proyecto-publico-empty">
          <h1>Proyecto no encontrado</h1>
          <p>{error || 'El proyecto que buscas no esta disponible.'}</p>
          <Link to="/">Volver al inicio</Link>
        </section>
      </main>
    );
  }

  const heroStyle = imagenPrincipal
    ? { backgroundImage: `linear-gradient(90deg, rgba(9, 22, 35, 0.9), rgba(15, 27, 45, 0.48)), url(${imagenPrincipal})` }
    : undefined;

  const irAPlano = () => {
    trackProyectoConversion(EVENTOS_CONVERSION.MAPA_INTERACTIVO, {
      boton: plano?.svgUrl ? 'ver_plano' : 'ver_unidades',
    });
    trackEvent('click_mapa_interactivo', {
      source: plano?.svgUrl ? 'proyecto_inmobiliario_hero' : 'proyecto_inmobiliario_hero_unidades',
      project_slug: slug,
      project_name: proyecto.nombre || '',
    });
    scrollTo(plano?.svgUrl ? planoRef : unidadesRef);
  };

  return (
    <main className="proyecto-publico-page">
      <section className={`proyecto-publico-hero ${imagenPrincipal ? '' : 'is-placeholder'}`} style={heroStyle}>
        <div className="proyecto-publico-hero-content">
          <img className="proyecto-publico-hero-logo" src={logoUrl} alt={proyecto.empresaNombre || proyecto.nombre} />
          <p>Proyecto inmobiliario</p>
          <div className="proyecto-publico-hero-title-row">
            <h1>{proyecto.nombre}</h1>
            {proyecto.empresaNombre ? <span className="proyecto-publico-hero-company">{proyecto.empresaNombre}</span> : null}
          </div>
          <span>{proyecto.ubicacionTexto || proyecto.ubicacion}</span>
          {proyecto.resumen ? <strong>{proyecto.resumen}</strong> : null}
          <dl>
            <div><dt>Precio desde</dt><dd>{proyecto.precioDesdeTexto}</dd></div>
            <div><dt>Superficie</dt><dd>{formatArea(proyecto.superficieDesdeM2)} - {formatArea(proyecto.superficieHastaM2)}</dd></div>
            <div><dt>Unidades</dt><dd>{proyecto.totalUnidades || unidades.length}</dd></div>
          </dl>
          <div className="proyecto-publico-hero-actions">
              <button
                type="button"
                onClick={() => {
                  trackProyectoConversion(EVENTOS_CONVERSION.ME_INTERESA_CLICK, { boton: 'me_interesa_contacto' });
                trackEvent('click_me_interesa', {
                    source: 'proyecto_inmobiliario_hero',
                    project_slug: slug,
                    project_name: proyecto.nombre || '',
                  });
                  trackMetaEvent('Lead', {
                    content_name: proyecto.nombre || '',
                    content_category: 'Proyecto inmobiliario',
                    content_type: 'proyecto_inmobiliario',
                    desarrollo: proyecto.nombre || '',
                  });
                  scrollTo(contactoRef);
                }}
              >
              Me interesa
            </button>
            <button type="button" onClick={irAPlano}>
              {plano?.svgUrl ? 'Ver plano' : 'Ver unidades'}
            </button>
            <button type="button" onClick={abrirWhatsapp}>WhatsApp</button>
          </div>
          {shareData ? (
            <div className="proyecto-share-section" aria-label="Compartir proyecto">
              <div className="proyecto-share-title">
                <span>Compartir proyecto</span>
                {shareFeedback ? <small role="status">{shareFeedback}</small> : <small>Ayuda a alguien más a conocer esta oportunidad.</small>}
              </div>
              <div className="proyecto-share-buttons">
                <a
                  className="proyecto-share-button whatsapp"
                  href={shareData.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir por WhatsApp"
                >
                  <FaWhatsapp aria-hidden="true" />
                  <span>WhatsApp</span>
                </a>
                <a
                  className="proyecto-share-button facebook"
                  href={shareData.facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir en Facebook"
                >
                  <FaFacebookF aria-hidden="true" />
                  <span>Facebook</span>
                </a>
                <a
                  className="proyecto-share-button twitter"
                  href={shareData.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir en X"
                >
                  <FaTwitter aria-hidden="true" />
                  <span>X</span>
                </a>
                <a
                  className="proyecto-share-button linkedin"
                  href={shareData.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Compartir en LinkedIn"
                >
                  <FaLinkedinIn aria-hidden="true" />
                  <span>LinkedIn</span>
                </a>
                <button
                  type="button"
                  className="proyecto-share-button copy"
                  onClick={copiarEnlaceProyecto}
                  aria-label="Copiar enlace del proyecto"
                >
                  <FaLink aria-hidden="true" />
                  <span>Copiar enlace</span>
                </button>
              </div>
            </div>
          ) : null}
          <small>Publicado en CN Inmobiliaria</small>
        </div>
      </section>

      <section className="proyecto-publico-shell">
        <section className="proyecto-publico-intro">
          <div>
            <p className="proyecto-publico-eyebrow">Descripción</p>
            <h2>Conoce el proyecto</h2>
            <RichTextContent
              className="proyecto-publico-descripcion"
              content={proyecto.descripcion || proyecto.resumen || 'Información del proyecto próximamente disponible.'}
            />
          </div>
          <aside>
            <span>Contacto comercial</span>
            <strong>{proyecto.nombreContacto || proyecto.empresaNombre}</strong>
            <p>{proyecto.telefonoContacto || proyecto.whatsappContacto || 'Telefono por confirmar'}</p>
            {proyecto.correoContacto ? <p>{proyecto.correoContacto}</p> : null}
            {proyecto.direccion ? <p>{proyecto.direccion}</p> : null}
            <button
              type="button"
              onClick={() => {
                trackProyectoConversion(EVENTOS_CONVERSION.ME_INTERESA_CLICK, { boton: 'me_interesa_contacto' });
                trackEvent('click_me_interesa', {
                  source: 'proyecto_inmobiliario_contacto',
                  project_slug: slug,
                  project_name: proyecto.nombre || '',
                });
                trackMetaEvent('Lead', {
                  content_name: proyecto.nombre || '',
                  content_category: 'Proyecto inmobiliario',
                  content_type: 'proyecto_inmobiliario',
                  desarrollo: proyecto.nombre || '',
                });
                scrollTo(contactoRef);
              }}
            >
              Solicitar información
            </button>
          </aside>
        </section>

        {galeria.length ? (
          <section className="proyecto-publico-section">
            <div className="proyecto-publico-section-head">
              <p className="proyecto-publico-eyebrow">Galería</p>
              <h2>Imágenes del proyecto</h2>
            </div>
            <div className="proyecto-publico-gallery">
              {galeria.map((imagen, index) => {
                const descripcionImagen = getImagenDescripcion(imagen);
                const altImagen = getImagenAlt(imagen, proyecto.nombre);

                return (
                  <figure key={`${imagen.id || imagen.urlResolved}-${index}`}>
                    <button
                      type="button"
                      className="proyecto-gallery-item"
                      onClick={() => setImagenSeleccionada({ ...imagen, descripcionModal: descripcionImagen, alt: altImagen })}
                      aria-label={`Ampliar ${altImagen}`}
                    >
                      <img className="proyecto-gallery-image" src={imagen.urlResolved} alt={altImagen} />
                      <span className="proyecto-gallery-overlay" aria-hidden="true">
                        <span className="proyecto-gallery-zoom-icon">
                          <FaSearchPlus />
                        </span>
                      </span>
                    </button>
                    <figcaption>{descripcionImagen || imagen.tipoImagen}</figcaption>
                  </figure>
                );
              })}
            </div>
          </section>
        ) : null}

        {ubicacionProyecto.hasData ? (
          <section className="proyecto-publico-section proyecto-publico-location">
            <div className="proyecto-publico-section-head">
              <p className="proyecto-publico-eyebrow">Ubicación</p>
              <h2>Ubicación del proyecto</h2>
              <span>Conoce la zona donde se encuentra {proyecto.nombre}.</span>
            </div>
            <div className="proyecto-publico-location-layout">
              <div className="proyecto-publico-location-info">
                <div className="proyecto-publico-location-summary">
                  <FaMapMarkerAlt aria-hidden="true" />
                  <strong>{ubicacionProyecto.resumen}</strong>
                </div>
                {ubicacionProyecto.detalles.length ? (
                  <dl className="proyecto-publico-location-details">
                    {ubicacionProyecto.detalles.map((item) => (
                      <div key={item.label}>
                        <dt>{item.label}</dt>
                        <dd>{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {ubicacionProyecto.mapsUrl ? (
                  <a
                    className="proyecto-publico-location-action"
                    href={ubicacionProyecto.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <FaDirections aria-hidden="true" />
                    Cómo llegar
                  </a>
                ) : null}
              </div>
              <div className="proyecto-publico-location-map">
                {ubicacionProyecto.embedUrl ? (
                  <iframe
                    title={`Ubicación de ${proyecto.nombre}`}
                    src={ubicacionProyecto.embedUrl}
                    loading="lazy"
                    allowFullScreen
                  />
                ) : (
                  <div className="proyecto-publico-location-placeholder" aria-hidden="true">
                    <FaMapMarkerAlt />
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : null}

        {modelos.length ? (
          <section className="proyecto-publico-section">
            <div className="proyecto-publico-section-head">
              <p className="proyecto-publico-eyebrow">Modelos</p>
              <h2>Prototipos disponibles</h2>
            </div>
            <div className="proyecto-modelos-grid">
              {modelos.map((modelo) => (
                <article key={modelo.id} className="proyecto-modelo-card">
                  <div className={`proyecto-modelo-media ${modelo.imagenPrincipalUrl ? '' : 'is-placeholder'}`}>
                      {modelo.imagenPrincipalUrl ? (
                        <button
                          type="button"
                          className="proyecto-modelo-image-button"
                          onClick={() => setModeloImagenModal({
                          src: resolveApiAssetUrl(modelo.imagenPrincipalUrl),
                          title: modelo.nombre,
                        })}
                      >
                        <img src={resolveApiAssetUrl(modelo.imagenPrincipalUrl)} alt={modelo.nombre} />
                      </button>
                    ) : <span>Sin imagen del modelo</span>}
                  </div>
                  <div className="proyecto-modelo-info">
                    <div className="proyecto-modelo-header">
                      <h3>{modelo.nombre}</h3>
                      <strong>Desde {modelo.precioDesdeTexto}</strong>
                    </div>
                    <p>{modelo.descripcion || 'Modelo disponible dentro del proyecto.'}</p>
                    <div className="proyecto-modelo-prices">
                      <span>{modelo.precioContadoTexto ? 'Precio de contado' : 'Precio desde'}</span>
                      {modelo.tieneMasDeUnPrecioActivo ? <small>Otros esquemas de financiamiento disponibles</small> : null}
                    </div>
                    {modelo.preciosActivos?.length ? (
                      <div className="proyecto-modelo-price-options">
                        <strong>Opciones de compra</strong>
                        {modelo.preciosActivos.map((precio) => (
                          <span key={precio.id || precio.tipoPrecioCodigo || precio.tipoPrecioNombre}>
                            {precio.tipoPrecioNombre}: {precio.precioTexto}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <dl className="proyecto-modelo-features">
                      <div><dt>Recámaras</dt><dd>{modelo.recamaras}</dd></div>
                      <div><dt>Baños</dt><dd>{modelo.banos}{modelo.mediosBanos ? ` + ${modelo.mediosBanos}/2` : ''}</dd></div>
                      <div><dt>Estac.</dt><dd>{modelo.estacionamientos}</dd></div>
                      <div><dt>Niveles</dt><dd>{modelo.niveles}</dd></div>
                      <div><dt>Terreno</dt><dd>{formatArea(modelo.superficieTerrenoM2)}</dd></div>
                      <div><dt>Construcción</dt><dd>{formatArea(modelo.superficieConstruccionM2)}</dd></div>
                    </dl>
                    <div className="proyecto-modelo-actions">
                      {modelo.imagenPrincipalUrl ? (
                        <button
                          type="button"
                          onClick={() => {
                            setModeloImagenModal({
                              src: resolveApiAssetUrl(modelo.imagenPrincipalUrl),
                              title: modelo.nombre,
                            });
                          }}
                        >
                          Ver imagen
                        </button>
                      ) : null}
                      {modelo.tour360Url ? (
                        <a
                          href={resolveApiAssetUrl(modelo.tour360Url)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => {
                            trackProyectoConversion(EVENTOS_CONVERSION.TOUR360_OPEN, {
                              tourId: modelo?.tour360Id || modelo?.tour360Url || null,
                              modeloId: modelo?.id || null,
                            });
                            trackEvent('click_tour_360', {
                              source: 'proyecto_inmobiliario_modelo',
                              project_slug: slug,
                              project_name: proyecto.nombre || '',
                              model_name: modelo.nombre || '',
                            });
                            trackMetaCustomEvent('ClickTour360', {
                              content_name: proyecto.nombre || '',
                              content_category: 'Proyecto inmobiliario',
                              content_type: 'proyecto_inmobiliario',
                              desarrollo: proyecto.nombre || '',
                              modelo: modelo.nombre || '',
                            });
                          }}
                        >
                          Ver tour 360
                        </a>
                      ) : null}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="proyecto-publico-section" ref={unidadesRef}>
          <div className="proyecto-publico-section-head">
            <p className="proyecto-publico-eyebrow">Disponibilidad</p>
            <h2>Unidades disponibles</h2>
            {plano?.svgUrl ? (
              <span>También puedes consultar disponibilidad directamente en el plano interactivo.</span>
            ) : null}
          </div>
          {unidades.length ? (
            <>
              <form className="proyecto-publico-unidades-filtros" onSubmit={(event) => event.preventDefault()}>
                <label>
                  <span>Buscar unidad</span>
                  <input name="texto" value={filtrosUnidades.texto} onChange={actualizarFiltroUnidades} placeholder="Codigo, manzana, lote, torre" />
                </label>
                <label>
                  <span>Estatus</span>
                  <select name="estatus" value={filtrosUnidades.estatus} onChange={actualizarFiltroUnidades}>
                    <option value="">Todos</option>
                    {ESTATUS_UNIDAD.map((estatus) => <option key={estatus} value={estatus}>{estatus}</option>)}
                  </select>
                </label>
                <label>
                  <span>Tipo</span>
                  <select name="tipoUnidad" value={filtrosUnidades.tipoUnidad} onChange={actualizarFiltroUnidades}>
                    <option value="">Todos</option>
                    {TIPOS_UNIDAD.map((tipo) => <option key={tipo} value={tipo}>{tipo}</option>)}
                  </select>
                </label>
                {modelosConUnidades.length ? (
                  <label>
                    <span>Modelo</span>
                    <select name="modeloId" value={filtrosUnidades.modeloId} onChange={actualizarFiltroUnidades}>
                      <option value="">Todos</option>
                      {modelosConUnidades.map((modelo) => <option key={modelo.id} value={modelo.id}>{modelo.nombre}</option>)}
                    </select>
                  </label>
                ) : null}
                <button type="button" onClick={limpiarFiltrosUnidades}>Limpiar filtros</button>
              </form>

              <p className="proyecto-publico-unidades-counter">
                Mostrando {Math.min(unidadesMostradas.length, unidadesFiltradasOrdenadas.length)} de {unidadesFiltradasOrdenadas.length} unidades
              </p>

              {unidadesMostradas.length ? (
                <div className="proyecto-publico-unidades-wrap">
                  <table className="proyecto-publico-unidades">
                    <thead>
                      <tr>
                        <th>Codigo</th>
                        <th>Tipo</th>
                        <th>Modelo</th>
                        <th>Manzana</th>
                        <th>Lote</th>
                        <th>Torre</th>
                        <th>Nivel</th>
                        <th>Terreno</th>
                        <th>Construcción</th>
                        <th>Precio</th>
                        <th>Estatus</th>
                        <th>Accion</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unidadesMostradas.map((unidad) => (
                        <tr key={unidad.id} className={String(unidadSeleccionada?.id) === String(unidad.id) ? 'is-selected' : ''}>
                          <td><strong>{unidad.codigo}</strong></td>
                          <td>{unidad.tipoUnidad}</td>
                          <td>{unidad.modeloNombre}</td>
                          <td>{unidad.manzana || '-'}</td>
                          <td>{unidad.lote || '-'}</td>
                          <td>{unidad.torre || '-'}</td>
                          <td>{unidad.nivel || '-'}</td>
                          <td>{formatArea(unidad.superficieTerrenoM2)}</td>
                          <td>{formatArea(unidad.superficieConstruccionM2)}</td>
                          <td>{unidad.precioDesdeTexto || unidad.precioTotalTexto}</td>
                          <td><span className={`proyecto-publico-status ${getStatusClass(unidad.estatus)}`}>{unidad.estatus}</span></td>
                          <td><button type="button" onClick={() => seleccionarUnidadYContactar(unidad)}>Me interesa</button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="proyecto-publico-muted">No encontramos unidades con esos filtros.</p>
              )}

              <div className="proyecto-publico-unidades-more">
                {unidadesVisibles < unidadesFiltradasOrdenadas.length ? (
                  <button type="button" onClick={() => setUnidadesVisibles((actual) => actual + UNIDADES_PAGE_SIZE)}>Ver mas unidades</button>
                ) : null}
                {unidadesVisibles > UNIDADES_PAGE_SIZE ? (
                  <button type="button" onClick={() => setUnidadesVisibles(UNIDADES_PAGE_SIZE)}>Mostrar menos</button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="proyecto-publico-muted">Unidades próximamente disponibles.</p>
          )}
        </section>

        {plano?.svgUrl ? (
          <section className="proyecto-publico-section" ref={planoRef}>
            <div className="proyecto-publico-section-head">
              <p className="proyecto-publico-eyebrow">Plano interactivo</p>
              <h2>Explora disponibilidad por unidad</h2>
            </div>
            <ProyectoPlanoInteractivo
              svgUrl={plano.svgUrl}
              unidades={unidades}
              selectedUnidadId={unidadSeleccionada?.id || unidadSeleccionada?.unidadId}
              onUnidadSelect={seleccionarUnidadEnMapa}
            />
            {unidadSeleccionada ? (
              <aside className="proyecto-publico-selected-unit">
                <div>
                  <span>Unidad seleccionada</span>
                  <strong>{unidadSeleccionada.codigo}</strong>
                  <p>{unidadSeleccionada.tipoUnidad} {unidadSeleccionada.manzana ? `Manzana ${unidadSeleccionada.manzana}` : ''} {unidadSeleccionada.lote ? `Lote ${unidadSeleccionada.lote}` : ''}</p>
                </div>
                <button
                  type="button"
                          onClick={() => {
                            trackProyectoConversion(EVENTOS_CONVERSION.ME_INTERESA_CLICK, {
                              boton: 'me_interesa_plano_unidad',
                              unidadId: unidadSeleccionada?.id || unidadSeleccionada?.unidadId || null,
                              modeloId: unidadSeleccionada?.modeloId || null,
                            });
                            trackEvent('click_me_interesa', {
                              source: 'proyecto_inmobiliario_plano_unidad',
                              project_slug: slug,
                              project_name: proyecto.nombre || '',
                              unit_code: unidadSeleccionada?.codigo || '',
                            });
                            trackMetaEvent('Lead', {
                              content_name: proyecto.nombre || '',
                              content_category: 'Proyecto inmobiliario',
                              content_type: 'proyecto_inmobiliario',
                              desarrollo: proyecto.nombre || '',
                              unidad: unidadSeleccionada?.codigo || '',
                            });
                            scrollTo(contactoRef);
                          }}
                        >
                  Me interesa esta unidad
                </button>
              </aside>
            ) : null}
          </section>
        ) : null}

        <section className="proyecto-publico-contact" ref={contactoRef}>
          <div>
            <p className="proyecto-publico-eyebrow">Contacto</p>
            <h2>Solicita información</h2>
            <p>Comparte tus datos y un asesor se pondrá en contacto contigo.</p>
            {unidadSeleccionada ? (
              <span className="proyecto-publico-selected-pill">Unidad seleccionada: {unidadSeleccionada.codigo}</span>
            ) : null}
          </div>
          <form onSubmit={enviarProspecto} noValidate>
            <label>
              <span>Nombre</span>
              <input name="nombre" value={form.nombre} onChange={actualizarCampo} required disabled={enviando} />
            </label>
            <label>
              <span>Teléfono</span>
              <input name="telefono" type="tel" value={form.telefono} onChange={actualizarCampo} required disabled={enviando} />
            </label>
            <label>
              <span>Correo</span>
              <input name="correo" type="email" value={form.correo} onChange={actualizarCampo} disabled={enviando} />
            </label>
            <label className="is-full">
              <span>Mensaje</span>
              <textarea name="mensaje" value={form.mensaje} onChange={actualizarCampo} rows="4" disabled={enviando} />
            </label>
            {formError ? <p className="proyecto-publico-form-error">{formError}</p> : null}
            {mensaje ? <p className="proyecto-publico-form-ok">{mensaje}</p> : null}
            <button type="submit" disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar Solicitud'}</button>
          </form>
        </section>
      </section>

      {imagenSeleccionada ? (
        <div className="proyecto-publico-lightbox" role="presentation" onMouseDown={() => setImagenSeleccionada(null)}>
          <section
            className="proyecto-publico-lightbox-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={imagenSeleccionada.alt || proyecto.nombre}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button type="button" onClick={() => setImagenSeleccionada(null)} aria-label="Cerrar imagen">
              <FaTimes aria-hidden="true" />
            </button>
            <img src={imagenSeleccionada.urlResolved} alt={imagenSeleccionada.alt || proyecto.nombre} />
            {imagenSeleccionada.descripcionModal ? (
              <p className="proyecto-publico-lightbox-description">{imagenSeleccionada.descripcionModal}</p>
            ) : null}
          </section>
        </div>
      ) : null}

      {modeloImagenModal ? (
        <div className="proyecto-publico-lightbox" role="presentation" onMouseDown={() => setModeloImagenModal(null)}>
          <section className="proyecto-publico-lightbox-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setModeloImagenModal(null)} aria-label="Cerrar imagen">
              <FaTimes aria-hidden="true" />
            </button>
            <img src={modeloImagenModal.src} alt={modeloImagenModal.title} />
            <strong>{modeloImagenModal.title}</strong>
          </section>
        </div>
      ) : null}
    </main>
  );
}
