// src/pages/DetallePropiedad.js
import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import ImageGallery from 'react-image-gallery';
import 'react-image-gallery/styles/css/image-gallery.css';
import './DetallePropiedad.css';
import { obtenerDetalleInmueble } from '../services/inmueblesService';
import { crearProspecto } from '../services/prospectosService';
import { obtenerTour360PorInmueble } from '../services/tours360Service';
import { obtenerToken } from '../services/authService';
import { agregarFavorito, eliminarFavorito, existeFavorito } from '../services/favoritosService';
import Tour360Viewer from '../components/Tour360Viewer';

const FORMULARIO_INICIAL = {
  nombre: '',
  telefono: '',
  email: '',
  mensaje: '',
};

export default function DetallePropiedad() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [propiedad, setPropiedad] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tour360, setTour360] = useState(null);
  const [formulario, setFormulario] = useState(FORMULARIO_INICIAL);
  const [esFavorito, setEsFavorito] = useState(false);
  const [cargandoFavorito, setCargandoFavorito] = useState(false);
  const [mensajeFavorito, setMensajeFavorito] = useState('');
  const [enviandoProspecto, setEnviandoProspecto] = useState(false);
  const [errorProspecto, setErrorProspecto] = useState('');
  const [exitoProspecto, setExitoProspecto] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const cargarDetalle = async () => {
      try {
        setLoading(true);
        setError('');
        const data = await obtenerDetalleInmueble(id, { signal: controller.signal });
        setPropiedad(data);
      } catch (err) {
        if (err.name === 'AbortError') {
          return;
        }

        if (err.status === 404) {
          setError('Propiedad no encontrada.');
        } else {
          setError('No fue posible cargar el detalle de la propiedad.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargarDetalle();

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    if (!obtenerToken()) {
      setEsFavorito(false);
      return undefined;
    }

    const controller = new AbortController();

    const cargarFavorito = async () => {
      try {
        const existe = await existeFavorito(id, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setEsFavorito(existe);
        }
      } catch (_) {
        if (!controller.signal.aborted) {
          setEsFavorito(false);
        }
      }
    };

    cargarFavorito();

    return () => controller.abort();
  }, [id]);

  useEffect(() => {
    const controller = new AbortController();

    const cargarTour360 = async () => {
      try {
        const data = await obtenerTour360PorInmueble(id, { signal: controller.signal });
        if (!controller.signal.aborted) {
          setTour360(data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setTour360(null);
        }
      }
    };

    setTour360(null);
    cargarTour360();

    return () => controller.abort();
  }, [id]);

  const obtenerIcono = (texto) => {
    const lower = texto
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');

    if (lower.includes('terreno')) return '\u{1F4D0}';
    if (lower.includes('construccion')) return '\u{1F3D7}';
    if (lower.includes('recamara')) return '\u{1F6CF}';
    if (lower.includes('recamaras')) return '\u{1F6CF}';
    if (lower.includes('bano')) return '\u{1F6C1}';
    if (lower.includes('estudio')) return '\u{1F9E0}';
    if (lower.includes('sala') || lower.includes('comedor')) return '\u{1F6CB}';
    if (lower.includes('cocina')) return '\u{1F37D}';
    if (lower.includes('terraza')) return '\u{1F305}';
    if (lower.includes('oficina')) return '\u{1F4BC}';
    if (lower.includes('vestidor')) return '\u{1F457}';
    if (lower.includes('cisterna')) return '\u{1F6B0}';
    if (lower.includes('roofgarden')) return '\u{1F33F}';
    if (lower.includes('credito')) return '\u{1F4B3}';
    if (lower.includes('min de')) return '\u{1F697}';
    if (lower.includes('lavado')) return '\u{1F9FA}';
    if (lower.includes('pasillo')) return '\u{1F6AA}';
    if (lower.includes('patio')) return '\u{1F33F}';
    if (lower.includes('amenidades')) return '\u{1F3CA}';
    return '\u{1F539}';
  };

  const obtenerTipoRecorrido = (visitaVirtual) =>
    (visitaVirtual?.tipo || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const puedeEmbeberse = (url) => {
    if (!url) {
      return false;
    }

    return (
      /youtube\.com\/embed|youtube\.com\/watch|youtu\.be\/|vimeo\.com|matterport\.com|kuula\.co|roundme\.com/i.test(url)
    );
  };

  const esVisitaLegacyLocal = (url) => /(^|\/)visita\.html?$/i.test(url) || /(^|\/)visita\.hmtl$/i.test(url);

  const construirUrlEmbebida = (url) => {
    if (!url) {
      return '';
    }

    if (/youtube\.com\/watch\?v=([^&]+)/i.test(url)) {
      return url.replace(/watch\?v=/i, 'embed/');
    }

    if (/youtu\.be\/([^?]+)/i.test(url)) {
      const match = url.match(/youtu\.be\/([^?]+)/i);
      return match ? `https://www.youtube.com/embed/${match[1]}` : url;
    }

    if (/vimeo\.com\/(\d+)/i.test(url) && !/player\.vimeo\.com/i.test(url)) {
      const match = url.match(/vimeo\.com\/(\d+)/i);
      return match ? `https://player.vimeo.com/video/${match[1]}` : url;
    }

    return url;
  };

  const actualizarFormulario = (event) => {
    const { name, value } = event.target;

    setFormulario((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const enviarProspecto = async (event) => {
    event.preventDefault();

    if (!propiedad) {
      return;
    }

    try {
      setEnviandoProspecto(true);
      setErrorProspecto('');
      setExitoProspecto('');

      const notas = [
        `Interesado en inmueble ${propiedad.id}: ${propiedad.titulo}.`,
        `Ubicacion: ${propiedad.ubicacion}.`,
        formulario.mensaje ? `Mensaje: ${formulario.mensaje}` : '',
      ]
        .filter(Boolean)
        .join(' ');

      await crearProspecto({
        inmuebleId: Number(propiedad.id),
        nombre: formulario.nombre.trim(),
        telefono: formulario.telefono.trim(),
        email: formulario.email.trim(),
        origen: 'detalle_propiedad_web',
        notas,
      });

      setExitoProspecto('Tu solicitud fue enviada correctamente. Te contactaremos pronto.');
      setFormulario(FORMULARIO_INICIAL);
    } catch (err) {
      setErrorProspecto(
        err.data?.mensaje ||
        err.data?.message ||
        'No fue posible enviar tu solicitud en este momento.'
      );
    } finally {
      setEnviandoProspecto(false);
    }
  };

  const alternarFavorito = async () => {
    if (!obtenerToken()) {
      navigate('/login', { state: { from: location } });
      return;
    }

    setCargandoFavorito(true);
    setMensajeFavorito('');

    try {
      if (esFavorito) {
        await eliminarFavorito(id);
      } else {
        await agregarFavorito(id);
      }

      setEsFavorito((actual) => !actual);
      setMensajeFavorito(esFavorito ? 'Propiedad quitada de favoritos.' : 'Propiedad guardada en favoritos.');
    } catch (err) {
      setMensajeFavorito(err.data?.mensaje || err.data?.message || 'No fue posible actualizar favoritos.');
    } finally {
      setCargandoFavorito(false);
    }
  };

  if (loading) {
    return (
      <section className="detalle">
        <p className="estado-feedback">Cargando detalle de la propiedad...</p>
      </section>
    );
  }

  if (error || !propiedad) {
    return (
      <section className="detalle">
        <div className="estado-feedback estado-error">
          <p>{error || 'Propiedad no encontrada.'}</p>
          <Link to="/propiedades" className="btn-ver">Ver mas propiedades</Link>
        </div>
      </section>
    );
  }

  const galeriaFormateada = propiedad.imagenes.map((img) => ({
    original: img,
    thumbnail: img,
  }));
  const tipoRecorrido = obtenerTipoRecorrido(propiedad.visitaVirtual);
  const urlRecorrido = propiedad.visitaVirtual?.urlVisita || '';
  const tieneTour360 = Boolean(tour360?.escenas?.length);
  const visitaVirtualValida = propiedad.visitaVirtual && !esVisitaLegacyLocal(urlRecorrido);
  const recorridoEsVideo =
    tipoRecorrido === 'video' ||
    /\.(mp4|webm|ogg)$/i.test(urlRecorrido);
  const recorridoEmbebible =
    !recorridoEsVideo && puedeEmbeberse(urlRecorrido);
  const urlEmbebida = recorridoEmbebible ? construirUrlEmbebida(urlRecorrido) : '';

  return (
    <section className="detalle">
      {propiedad.video && (
        <div className="video">
          <video controls width="100%">
            <source src={propiedad.video} type="video/mp4" />
            Tu navegador no soporta el video.
          </video>
        </div>
      )}

      {galeriaFormateada.length > 0 ? (
        <div className="carrusel">
          <ImageGallery
            items={galeriaFormateada}
            showFullscreenButton={true}
            showPlayButton={false}
            thumbnailPosition="bottom"
          />
        </div>
      ) : (
        <div className="carrusel carrusel-vacio">
          <p className="estado-feedback">No hay imagenes disponibles para esta propiedad.</p>
        </div>
      )}

      <div className="contenido">
        <div className="detalle-titulo-row">
          <h1>{propiedad.titulo}</h1>
          <button
            type="button"
            className={`detalle-favorito-btn ${esFavorito ? 'is-active' : ''}`}
            onClick={alternarFavorito}
            disabled={cargandoFavorito}
          >
            <span>{esFavorito ? '♥' : '♡'}</span>
            {esFavorito ? 'Guardado' : 'Guardar'}
          </button>
        </div>
        {mensajeFavorito ? <p className="mensaje-favorito">{mensajeFavorito}</p> : null}
        <p className="precio">{propiedad.precio}</p>
        <p className="ubicacion">{'\u{1F4CD}'} {propiedad.ubicacion}</p>
        <p className="descripcion">{propiedad.descripcion}</p>

        {tieneTour360 ? <Tour360Viewer tour={tour360} /> : null}

        {!tieneTour360 && visitaVirtualValida ? (
          <div className="recorrido-virtual">
            <div className="recorrido-encabezado">
              <h2>Recorrido virtual</h2>
              {propiedad.visitaVirtual.proveedor ? (
                <p>{`Proveedor: ${propiedad.visitaVirtual.proveedor}`}</p>
              ) : null}
            </div>

            {recorridoEsVideo ? (
              <div className="recorrido-media">
                <video controls width="100%">
                  <source src={urlRecorrido} type="video/mp4" />
                  Tu navegador no soporta el video.
                </video>
              </div>
            ) : recorridoEmbebible ? (
              <div className="recorrido-media">
                <iframe
                  title="Recorrido virtual"
                  src={urlEmbebida}
                  width="100%"
                  height="420"
                  style={{ border: 0 }}
                  allowFullScreen=""
                  loading="lazy"
                ></iframe>
              </div>
            ) : (
              <div className="recorrido-accion">
                <p>El recorrido virtual esta disponible en un enlace externo.</p>
                <a
                  href={urlRecorrido}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-recorrido"
                >
                  Abrir recorrido
                </a>
              </div>
            )}
          </div>
        ) : null}

        <ul className="caracteristicas">
          {propiedad.caracteristicas.map((carac, index) => {
            if (carac.tipo === 'simple') {
              return <li key={index}>{obtenerIcono(carac.texto)} {carac.texto}</li>;
            }

            if (carac.tipo === 'grupo') {
              return (
                <li key={index}>
                  {'\u2705'} <strong>{carac.titulo}:</strong>
                  <ul className="subcaracteristicas">
                    {carac.opciones.map((opcion, subIndex) => (
                      <li key={subIndex}>{obtenerIcono(opcion)} {opcion}</li>
                    ))}
                  </ul>
                </li>
              );
            }

            return null;
          })}
        </ul>

        {propiedad.latitud && propiedad.longitud ? (
          <div className="mapa">
            <iframe
              title="Ubicacion"
              src={`https://www.google.com/maps?q=${propiedad.latitud},${propiedad.longitud}&output=embed`}
              width="100%"
              height="300"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
            ></iframe>
          </div>
        ) : (
          <p>Ubicacion no disponible</p>
        )}

        <div className="prospecto-formulario">
          <h2>Solicita mas informacion</h2>
          <form onSubmit={enviarProspecto} className="formulario-contacto">
            <label className="campo-contacto">
              <span>Nombre</span>
              <input
                type="text"
                name="nombre"
                value={formulario.nombre}
                onChange={actualizarFormulario}
                required
                disabled={enviandoProspecto}
              />
            </label>

            <label className="campo-contacto">
              <span>Telefono</span>
              <input
                type="tel"
                name="telefono"
                value={formulario.telefono}
                onChange={actualizarFormulario}
                required
                disabled={enviandoProspecto}
              />
            </label>

            <label className="campo-contacto">
              <span>Email</span>
              <input
                type="email"
                name="email"
                value={formulario.email}
                onChange={actualizarFormulario}
                required
                disabled={enviandoProspecto}
              />
            </label>

            <label className="campo-contacto campo-contacto-full">
              <span>Mensaje</span>
              <textarea
                name="mensaje"
                rows="4"
                value={formulario.mensaje}
                onChange={actualizarFormulario}
                disabled={enviandoProspecto}
                placeholder="Cuentanos que te interesa de esta propiedad"
              ></textarea>
            </label>

            <div className="acciones-contacto">
              <button
                type="submit"
                className="btn-contacto"
                disabled={enviandoProspecto}
              >
                {enviandoProspecto ? 'Enviando...' : 'Quiero mas informacion'}
              </button>
              <Link to="/contacto" className="btn-contacto btn-contacto-secundario">
                Ir a contacto
              </Link>
            </div>
          </form>

          {errorProspecto ? (
            <p className="mensaje-formulario mensaje-formulario-error">{errorProspecto}</p>
          ) : null}

          {exitoProspecto ? (
            <p className="mensaje-formulario mensaje-formulario-exito">{exitoProspecto}</p>
          ) : null}
        </div>

        <div className="boton-ver">
          <Link to="/propiedades" className="btn-ver">Ver mas propiedades</Link>
        </div>
      </div>
    </section>
  );
}
