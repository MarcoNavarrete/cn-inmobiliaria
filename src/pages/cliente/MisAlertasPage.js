import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { obtenerToken } from '../../services/authService';
import { listarMisAlertas, marcarAlertaLeida } from '../../services/misAlertasService';
import './MisAlertasPage.css';

const TIPO_LABELS = {
  INMUEBLE: 'Propiedad',
  DESARROLLO: 'Desarrollo',
  MODELO_DESARROLLO: 'Modelo',
};

const getTipoLabel = (tipo) => TIPO_LABELS[tipo] || tipo || 'Alerta';

const getUrlAlerta = (alerta) => {
  if (alerta.url) return alerta.url;
  if (alerta.tipoEntidad === 'INMUEBLE' && alerta.entidadId) return `/propiedad/${alerta.entidadId}`;
  if ((alerta.tipoEntidad === 'DESARROLLO' || alerta.tipoEntidad === 'MODELO_DESARROLLO') && alerta.slug) {
    return `/desarrollos/${alerta.slug}`;
  }
  return '';
};

export default function MisAlertasPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = obtenerToken();
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accionandoId, setAccionandoId] = useState('');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    if (!token) return undefined;

    const controller = new AbortController();

    const cargar = async () => {
      setLoading(true);
      setError('');

      try {
        setAlertas(await listarMisAlertas({ signal: controller.signal }));
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err.data?.mensaje || err.data?.message || 'No fue posible cargar tus alertas.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    cargar();

    return () => controller.abort();
  }, [token]);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const verAlerta = (alerta) => {
    const url = getUrlAlerta(alerta);
    if (url) navigate(url);
  };

  const marcarLeida = async (alerta) => {
    setAccionandoId(alerta.id);
    setError('');
    setMensaje('');

    try {
      await marcarAlertaLeida(alerta.id);
      setAlertas((actuales) =>
        actuales.map((item) => (item.id === alerta.id ? { ...item, leido: true } : item))
      );
      setMensaje('Alerta marcada como leida.');
    } catch (err) {
      setError(err.data?.mensaje || err.data?.message || 'No fue posible marcar la alerta como leida.');
    } finally {
      setAccionandoId('');
    }
  };

  return (
    <main className="mis-alertas-page">
      <section className="mis-alertas-hero">
        <div>
          <p>Cuenta</p>
          <h1>Mis alertas</h1>
        </div>
        <Link to="/cliente/mis-busquedas">Mis busquedas</Link>
      </section>

      {mensaje ? <p className="mis-alertas-feedback is-ok">{mensaje}</p> : null}
      {error ? <p className="mis-alertas-feedback is-error">{error}</p> : null}
      {loading ? <p className="mis-alertas-feedback">Cargando alertas...</p> : null}

      {!loading && !error && alertas.length === 0 ? (
        <section className="mis-alertas-empty">
          <h2>No tienes alertas</h2>
          <p>Cuando una busqueda guardada coincida con una publicacion, aparecera aqui.</p>
          <Link to="/propiedades">Buscar propiedades</Link>
        </section>
      ) : null}

      {!loading && alertas.length > 0 ? (
        <section className="mis-alertas-list">
          {alertas.map((alerta) => {
            const url = getUrlAlerta(alerta);

            return (
              <article key={alerta.id} className={`mis-alertas-card ${alerta.leido ? '' : 'is-new'}`}>
                <div className="mis-alertas-card-head">
                  <div>
                    <h2>{alerta.titulo}</h2>
                    <span>{alerta.fechaCreacion}</span>
                  </div>
                  <div className="mis-alertas-badges">
                    <strong>{getTipoLabel(alerta.tipoEntidad)}</strong>
                    {!alerta.leido ? <span>Nueva</span> : <em>Leida</em>}
                  </div>
                </div>

                <p>{alerta.mensaje || 'Tienes una coincidencia nueva en tus busquedas guardadas.'}</p>

                <div className="mis-alertas-actions">
                  <button type="button" onClick={() => verAlerta(alerta)} disabled={!url}>
                    Ver
                  </button>
                  {!alerta.leido ? (
                    <button
                      type="button"
                      className="is-secondary"
                      onClick={() => marcarLeida(alerta)}
                      disabled={accionandoId === alerta.id}
                    >
                      {accionandoId === alerta.id ? 'Marcando...' : 'Marcar como leida'}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </main>
  );
}
