import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { obtenerToken } from '../services/authService';
import { obtenerMisSolicitudes } from '../services/misSolicitudesService';
import './MisSolicitudesPage.css';

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible cargar tus solicitudes.';

export default function MisSolicitudesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [solicitudes, setSolicitudes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!obtenerToken()) {
      navigate('/login', { replace: true, state: { from: location } });
      return undefined;
    }

    const controller = new AbortController();

    const cargarSolicitudes = async () => {
      setLoading(true);
      setError('');

      try {
        const data = await obtenerMisSolicitudes({ signal: controller.signal });
        setSolicitudes(data);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargarSolicitudes();

    return () => controller.abort();
  }, [location, navigate]);

  return (
    <main className="mis-solicitudes-page">
      <section className="mis-solicitudes-hero">
        <div>
          <p>Cuenta</p>
          <h1>Mis solicitudes</h1>
        </div>
        <Link to="/propiedades">Ver propiedades</Link>
      </section>

      {error ? <p className="mis-solicitudes-feedback is-error">{error}</p> : null}
      {loading ? <p className="mis-solicitudes-feedback">Cargando solicitudes...</p> : null}

      {!loading && !error && solicitudes.length === 0 ? (
        <section className="mis-solicitudes-empty">
          <h2>Aun no has enviado solicitudes</h2>
          <p>Cuando contactes por una propiedad, podras consultar aqui el seguimiento.</p>
          <Link to="/propiedades">Explorar propiedades</Link>
        </section>
      ) : null}

      {!loading && !error && solicitudes.length > 0 ? (
        <section className="mis-solicitudes-list" aria-label="Listado de solicitudes">
          {solicitudes.map((solicitud, index) => (
            <article
              key={solicitud.id || `${solicitud.inmuebleId}-${index}`}
              className="mis-solicitudes-card"
            >
              <div className="mis-solicitudes-main">
                <div>
                  <span className="mis-solicitudes-label">Inmueble</span>
                  <h2>{solicitud.inmueble}</h2>
                </div>
                <span className={`mis-solicitudes-status is-${solicitud.estatus.toLowerCase()}`}>
                  {solicitud.estatus}
                </span>
              </div>

              <dl className="mis-solicitudes-meta">
                <div>
                  <dt>Fecha</dt>
                  <dd>{solicitud.fecha}</dd>
                </div>
                <div>
                  <dt>Ultimo contacto</dt>
                  <dd>{solicitud.fechaUltimoContacto || 'Sin contacto registrado'}</dd>
                </div>
                <div className="is-wide">
                  <dt>Notas</dt>
                  <dd>{solicitud.notas}</dd>
                </div>
              </dl>

              <div className="mis-solicitudes-actions">
                {solicitud.inmuebleId ? (
                  <Link to={`/propiedad/${solicitud.inmuebleId}`}>Ver propiedad</Link>
                ) : (
                  <span>Propiedad no disponible</span>
                )}
              </div>
            </article>
          ))}
        </section>
      ) : null}
    </main>
  );
}
