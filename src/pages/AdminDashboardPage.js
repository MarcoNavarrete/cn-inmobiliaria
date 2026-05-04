import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { obtenerDashboardAdmin } from '../services/adminDashboardService';
import './AdminDashboardPage.css';

const DASHBOARD_INICIAL = {
  prospectos: {
    nuevosHoy: 0,
    sinAtender: 0,
    contactados: 0,
    interesados: 0,
    visitaAgendada: 0,
    cerrados: 0,
  },
  inventario: {
    inmueblesActivos: 0,
    desarrollosActivos: 0,
    modelosActivos: 0,
  },
  contenidoPendiente: {
    inmueblesSinImagenes: 0,
    inmueblesSinTour360: 0,
    desarrollosSinImagenes: 0,
    modelosSinImagenes: 0,
    modelosSinTour360: 0,
  },
  actividad: {
    publicacionesUltimos7Dias: 0,
    prospectosUltimos7Dias: 0,
    usuariosConBusquedasGuardadas: 0,
    alertasNoLeidas: 0,
  },
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible cargar el dashboard.';

function MetricCard({ critical = false, label, to, value }) {
  const content = (
    <article className={`admin-dashboard-metrica ${critical && value > 0 ? 'is-critical' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );

  return to ? <Link className="admin-dashboard-metrica-link" to={to}>{content}</Link> : content;
}

function MetricSection({ children, title }) {
  return (
    <section className="admin-dashboard-section">
      <div className="admin-dashboard-section-head">
        <h2>{title}</h2>
      </div>
      <div className="admin-dashboard-metricas">
        {children}
      </div>
    </section>
  );
}

export default function AdminDashboardPage() {
  const [dashboard, setDashboard] = useState(DASHBOARD_INICIAL);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const cargarDashboard = async () => {
      setCargando(true);
      setError('');

      try {
        setDashboard(await obtenerDashboardAdmin({ signal: controller.signal }));
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

  const totalContenidoPendiente = useMemo(
    () =>
      Object.values(dashboard.contenidoPendiente).reduce((total, value) => total + Number(value || 0), 0),
    [dashboard.contenidoPendiente]
  );

  return (
    <main className="admin-dashboard">
      <section className="admin-dashboard-hero">
        <div>
          <p className="admin-dashboard-eyebrow">Panel</p>
          <h1>Dashboard comercial</h1>
        </div>
        <Link to="/admin/prospectos">Ver prospectos</Link>
      </section>

      {cargando ? <p className="admin-dashboard-feedback">Cargando metricas...</p> : null}
      {error ? <p className="admin-dashboard-feedback is-error">{error}</p> : null}

      {!cargando && !error ? (
        <>
          <MetricSection title="Prospectos">
            <MetricCard label="Nuevos hoy" value={dashboard.prospectos.nuevosHoy} to="/admin/prospectos" />
            <MetricCard critical label="Sin atender" value={dashboard.prospectos.sinAtender} to="/admin/prospectos" />
            <MetricCard label="Contactados" value={dashboard.prospectos.contactados} to="/admin/prospectos" />
            <MetricCard label="Interesados" value={dashboard.prospectos.interesados} to="/admin/prospectos" />
            <MetricCard label="Visita agendada" value={dashboard.prospectos.visitaAgendada} to="/admin/prospectos" />
            <MetricCard label="Cerrados" value={dashboard.prospectos.cerrados} to="/admin/prospectos" />
          </MetricSection>

          <MetricSection title="Inventario">
            <MetricCard label="Inmuebles activos" value={dashboard.inventario.inmueblesActivos} to="/admin/propiedades" />
            <MetricCard label="Desarrollos activos" value={dashboard.inventario.desarrollosActivos} to="/admin/desarrollos" />
            <MetricCard label="Modelos activos" value={dashboard.inventario.modelosActivos} to="/admin/desarrollos" />
          </MetricSection>

          <MetricSection title={`Contenido pendiente (${totalContenidoPendiente})`}>
            <MetricCard critical label="Inmuebles sin imagenes" value={dashboard.contenidoPendiente.inmueblesSinImagenes} to="/admin/propiedades" />
            <MetricCard critical label="Inmuebles sin tour 360" value={dashboard.contenidoPendiente.inmueblesSinTour360} to="/admin/propiedades" />
            <MetricCard critical label="Desarrollos sin imagenes" value={dashboard.contenidoPendiente.desarrollosSinImagenes} to="/admin/desarrollos" />
            <MetricCard critical label="Modelos sin imagenes" value={dashboard.contenidoPendiente.modelosSinImagenes} to="/admin/desarrollos" />
            <MetricCard critical label="Modelos sin tour 360" value={dashboard.contenidoPendiente.modelosSinTour360} to="/admin/desarrollos" />
          </MetricSection>

          <MetricSection title="Actividad">
            <MetricCard label="Publicaciones ultimos 7 dias" value={dashboard.actividad.publicacionesUltimos7Dias} />
            <MetricCard label="Prospectos ultimos 7 dias" value={dashboard.actividad.prospectosUltimos7Dias} to="/admin/prospectos" />
            <MetricCard label="Usuarios con busquedas guardadas" value={dashboard.actividad.usuariosConBusquedasGuardadas} />
            <MetricCard critical label="Alertas no leidas" value={dashboard.actividad.alertasNoLeidas} />
          </MetricSection>
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
        <Link className="admin-dashboard-card" to="/admin/desarrollos">
          <span>Desarrollos inmobiliarios</span>
          <p>Gestiona desarrollos, modelos, imagenes y tours 360.</p>
        </Link>
      </section>
    </main>
  );
}
