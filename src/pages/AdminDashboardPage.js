import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { obtenerDashboardResumen, obtenerTopInmuebles } from '../services/dashboardService';
import './AdminDashboardPage.css';

const RESUMEN_INICIAL = {
  totalInmuebles: 0,
  pendientesRevision: 0,
  disponibles: 0,
  apartados: 0,
  vendidos: 0,
  inactivos: 0,
  totalProspectos: 0,
  prospectosUltimos7Dias: 0,
  prospectosUltimos30Dias: 0,
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible cargar el dashboard.';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [inmuebleId, setInmuebleId] = useState('');
  const [resumen, setResumen] = useState(RESUMEN_INICIAL);
  const [topInmuebles, setTopInmuebles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const cargarDashboard = async () => {
      setCargando(true);
      setError('');

      try {
        const [resumenData, topData] = await Promise.all([
          obtenerDashboardResumen({ signal: controller.signal }),
          obtenerTopInmuebles({ signal: controller.signal }),
        ]);

        setResumen(resumenData);
        setTopInmuebles(topData.slice(0, 5));
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!controller.signal.aborted) {
          setCargando(false);
        }
      }
    };

    cargarDashboard();

    return () => controller.abort();
  }, []);

  const metricas = useMemo(
    () => [
      { label: 'Total inmuebles', value: resumen.totalInmuebles },
      { label: 'Pendientes de revision', value: resumen.pendientesRevision, to: '/admin/propiedades?vista=PENDIENTES' },
      { label: 'Disponibles', value: resumen.disponibles },
      { label: 'Apartados', value: resumen.apartados },
      { label: 'Vendidos', value: resumen.vendidos },
      { label: 'Inactivos', value: resumen.inactivos },
      { label: 'Total prospectos', value: resumen.totalProspectos },
      { label: 'Prospectos 7 dias', value: resumen.prospectosUltimos7Dias },
      { label: 'Prospectos 30 dias', value: resumen.prospectosUltimos30Dias },
    ],
    [resumen]
  );

  const abrirTour = (event) => {
    event.preventDefault();
    const id = inmuebleId.trim();

    if (id) {
      navigate(`/admin/tours360/${id}`);
    }
  };

  return (
    <main className="admin-dashboard">
      <section className="admin-dashboard-hero">
        <p className="admin-dashboard-eyebrow">Panel</p>
        <h1>Dashboard administrativo</h1>
      </section>

      {cargando ? <p className="admin-dashboard-feedback">Cargando metricas...</p> : null}
      {error ? <p className="admin-dashboard-feedback is-error">{error}</p> : null}

      {!cargando && !error ? (
        <>
          <section className="admin-dashboard-metricas">
            {metricas.map((metrica) => (
              <article key={metrica.label} className="admin-dashboard-metrica">
                <span>{metrica.label}</span>
                <strong>{metrica.value}</strong>
                {metrica.to ? <Link to={metrica.to}>Ver propiedades</Link> : null}
              </article>
            ))}
          </section>

          <section className="admin-dashboard-panel">
            <div className="admin-dashboard-panel-head">
              <h2>Top inmuebles por prospectos</h2>
              <Link to="/admin/prospectos">Ver prospectos</Link>
            </div>
            {topInmuebles.length === 0 ? (
              <p className="admin-dashboard-empty">Aun no hay prospectos asociados a inmuebles.</p>
            ) : (
              <ol className="admin-dashboard-top-list">
                {topInmuebles.map((inmueble) => (
                  <li key={inmueble.inmuebleId || inmueble.titulo}>
                    <div>
                      <strong>{inmueble.titulo}</strong>
                      {inmueble.inmuebleId ? (
                        <Link to={`/admin/inmuebles/editar/${inmueble.inmuebleId}`}>Editar inmueble</Link>
                      ) : null}
                    </div>
                    <span>{inmueble.totalProspectos}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </>
      ) : null}

      <section className="admin-dashboard-grid">
        <Link className="admin-dashboard-card" to="/admin/inmuebles/nuevo">
          <span>Crear inmueble</span>
          <p>Alta de una nueva propiedad para el sitio.</p>
        </Link>
        <Link className="admin-dashboard-card" to="/admin/propiedades">
          <span>Administrar propiedades</span>
          <p>Revisar, editar y abrir tours de inmuebles.</p>
        </Link>
        <form className="admin-dashboard-card admin-dashboard-form" onSubmit={abrirTour}>
          <span>Administrar Tour 360</span>
          <p>Acceso temporal por ID de inmueble.</p>
          <div>
            <input
              type="text"
              value={inmuebleId}
              onChange={(event) => setInmuebleId(event.target.value)}
              placeholder="ID de inmueble"
            />
            <button type="submit">Abrir</button>
          </div>
        </form>
      </section>
    </main>
  );
}
