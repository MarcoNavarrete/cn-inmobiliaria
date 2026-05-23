import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import RichTextContent from '../components/common/RichTextContent';
import ProyectoPlanoInteractivo from '../components/proyectos/ProyectoPlanoInteractivo';
import { trackEvent } from '../lib/analytics';
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
const DEFAULT_WHATSAPP_NUMBER = '+5215540859798';
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

const normalizePhone = (value) => String(value || '').replace(/\D/g, '');

const formatArea = (value) => {
  if (!value || Number.isNaN(Number(value))) return '-';
  return `${Number(value).toLocaleString('es-MX')} m2`;
};

const getStatusClass = (status) =>
  `is-${String(status || '').trim().toLowerCase().replace(/\s+/g, '_')}`;

const buildUnidadMessage = (unidad, proyecto) =>
  `Me interesa la unidad ${unidad?.codigo || 'seleccionada'} del proyecto ${proyecto?.nombre || ''}. Quiero recibir mas informacion.`
    .replace(/\s+/g, ' ')
    .trim();

const FORM_INICIAL = {
  nombre: '',
  telefono: '',
  correo: '',
  mensaje: '',
};

export default function ProyectoInmobiliarioDetallePage() {
  const { slug } = useParams();
  const contactoRef = useRef(null);
  const unidadesRef = useRef(null);
  const planoRef = useRef(null);
  const [proyecto, setProyecto] = useState(null);
  const [modelos, setModelos] = useState([]);
  const [unidades, setUnidades] = useState([]);
  const [plano, setPlano] = useState(null);
  const [imagenes, setImagenes] = useState([]);
  const [unidadSeleccionada, setUnidadSeleccionada] = useState(null);
  const [filtrosUnidades, setFiltrosUnidades] = useState(FILTROS_UNIDADES_INICIALES);
  const [unidadesVisibles, setUnidadesVisibles] = useState(UNIDADES_PAGE_SIZE);
  const [modeloImagenModal, setModeloImagenModal] = useState(null);
  const [form, setForm] = useState(FORM_INICIAL);
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [formError, setFormError] = useState('');

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
    setUnidadesVisibles(UNIDADES_PAGE_SIZE);
  }, [filtrosUnidades]);

  useEffect(() => {
    if (!modeloImagenModal) return undefined;

    const cerrarConEscape = (event) => {
      if (event.key === 'Escape') {
        setModeloImagenModal(null);
      }
    };

    window.addEventListener('keydown', cerrarConEscape);

    return () => window.removeEventListener('keydown', cerrarConEscape);
  }, [modeloImagenModal]);

  const imagenPrincipal = useMemo(() => {
    const principal = imagenes.find((imagen) => imagen.tipoImagen === 'PRINCIPAL')?.url || proyecto?.imagenPrincipalUrl;
    return resolveApiAssetUrl(principal);
  }, [imagenes, proyecto?.imagenPrincipalUrl]);

  const logoUrl = useMemo(() => resolveApiAssetUrl(proyecto?.logoUrl) || CN_LOGO, [proyecto?.logoUrl]);

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
    const telefono = normalizePhone(proyecto.whatsappContacto || proyecto.telefonoContacto) || normalizePhone(DEFAULT_WHATSAPP_NUMBER);
    const text = `Hola, me interesa el proyecto ${proyecto.nombre}. Me gustaria recibir mas informacion.`;
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

  const enviarProspecto = async (event) => {
    event.preventDefault();
    setFormError('');
    setMensaje('');

    if (!form.nombre.trim()) {
      setFormError('Captura tu nombre.');
      return;
    }

    if (!form.telefono.trim() && !form.correo.trim()) {
      setFormError('Captura telefono o correo para poder contactarte.');
      return;
    }

    setEnviando(true);

    try {
      await crearProspectoPublico(slug, {
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        correo: form.correo.trim() || null,
        mensaje: form.mensaje.trim() || `Me interesa recibir informacion del proyecto ${proyecto.nombre}.`,
        unidadId: unidadSeleccionada?.id || unidadSeleccionada?.unidadId || null,
        origen: 'WEB',
      });
      setMensaje('Gracias, recibimos tus datos. Un asesor se pondra en contacto contigo.');
      setForm(FORM_INICIAL);
      setUnidadSeleccionada(null);
    } catch (err) {
      setFormError(getApiErrorMessage(err));
    } finally {
      setEnviando(false);
    }
  };

  const seleccionarUnidadEnMapa = useCallback((unidad) => {
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
  }, [proyecto?.nombre, seleccionarUnidad, slug]);

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
          <img src={logoUrl} alt={proyecto.nombre} />
          <p>Proyecto inmobiliario</p>
          <h1>{proyecto.nombre}</h1>
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
          <small>Publicado en CN Inmobiliaria</small>
        </div>
      </section>

      <section className="proyecto-publico-shell">
        <section className="proyecto-publico-intro">
          <div>
            <p className="proyecto-publico-eyebrow">Descripcion</p>
            <h2>Conoce el proyecto</h2>
            <RichTextContent
              className="proyecto-publico-descripcion"
              content={proyecto.descripcion || proyecto.resumen || 'Informacion del proyecto proximamente disponible.'}
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
              Solicitar informacion
            </button>
          </aside>
        </section>

        {galeria.length ? (
          <section className="proyecto-publico-section">
            <div className="proyecto-publico-section-head">
              <p className="proyecto-publico-eyebrow">Galeria</p>
              <h2>Imagenes del proyecto</h2>
            </div>
            <div className="proyecto-publico-gallery">
              {galeria.map((imagen, index) => (
                <figure key={`${imagen.id || imagen.urlResolved}-${index}`}>
                  <img src={imagen.urlResolved} alt={imagen.titulo || proyecto.nombre} />
                  <figcaption>{imagen.titulo || imagen.tipoImagen}</figcaption>
                </figure>
              ))}
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
                      <strong>{modelo.precioDesdeTexto}</strong>
                    </div>
                    <p>{modelo.descripcion || 'Modelo disponible dentro del proyecto.'}</p>
                    <dl className="proyecto-modelo-features">
                      <div><dt>Recamaras</dt><dd>{modelo.recamaras}</dd></div>
                      <div><dt>Banos</dt><dd>{modelo.banos}{modelo.mediosBanos ? ` + ${modelo.mediosBanos}/2` : ''}</dd></div>
                      <div><dt>Estac.</dt><dd>{modelo.estacionamientos}</dd></div>
                      <div><dt>Niveles</dt><dd>{modelo.niveles}</dd></div>
                      <div><dt>Terreno</dt><dd>{formatArea(modelo.superficieTerrenoM2)}</dd></div>
                      <div><dt>Construccion</dt><dd>{formatArea(modelo.superficieConstruccionM2)}</dd></div>
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
              <span>Tambien puedes consultar disponibilidad directamente en el plano interactivo.</span>
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
                        <th>Construccion</th>
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
                          <td>{unidad.precioTotalTexto}</td>
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
            <p className="proyecto-publico-muted">Unidades proximamente disponibles.</p>
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
            <h2>Solicita informacion</h2>
            <p>Comparte tus datos y un asesor se pondra en contacto contigo.</p>
            {unidadSeleccionada ? (
              <span className="proyecto-publico-selected-pill">Unidad seleccionada: {unidadSeleccionada.codigo}</span>
            ) : null}
          </div>
          <form onSubmit={enviarProspecto}>
            <label>
              <span>Nombre</span>
              <input name="nombre" value={form.nombre} onChange={actualizarCampo} required />
            </label>
            <label>
              <span>Telefono</span>
              <input name="telefono" value={form.telefono} onChange={actualizarCampo} />
            </label>
            <label>
              <span>Correo</span>
              <input name="correo" type="email" value={form.correo} onChange={actualizarCampo} />
            </label>
            <label className="is-full">
              <span>Mensaje</span>
              <textarea name="mensaje" value={form.mensaje} onChange={actualizarCampo} rows="4" />
            </label>
            {formError ? <p className="proyecto-publico-form-error">{formError}</p> : null}
            {mensaje ? <p className="proyecto-publico-form-ok">{mensaje}</p> : null}
            <button type="submit" disabled={enviando}>{enviando ? 'Enviando...' : 'Enviar solicitud'}</button>
          </form>
        </section>
      </section>

      {modeloImagenModal ? (
        <div className="proyecto-publico-lightbox" role="presentation" onMouseDown={() => setModeloImagenModal(null)}>
          <section className="proyecto-publico-lightbox-dialog" role="dialog" aria-modal="true" onMouseDown={(event) => event.stopPropagation()}>
            <button type="button" onClick={() => setModeloImagenModal(null)} aria-label="Cerrar imagen">x</button>
            <img src={modeloImagenModal.src} alt={modeloImagenModal.title} />
            <strong>{modeloImagenModal.title}</strong>
          </section>
        </div>
      ) : null}
    </main>
  );
}
