import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import useAuthSession from '../../hooks/useAuthSession';
import { obtenerDashboardAdmin } from '../../services/adminDashboardService';
import { obtenerResumenEventosConversion } from '../../services/eventosConversionService';
import './AdminEstadisticasPage.css';

const DASHBOARD_INICIAL = {
  resumen: {
    totalInmuebles: 0,
    inmueblesActivos: 0,
    inmueblesPendientes: 0,
    totalDesarrollos: 0,
    totalProspectos: 0,
    prospectosNuevos: 0,
    unidadesDisponibles: 0,
    unidadesApartadas: 0,
  },
  analitica: {
    vistasLanding: 0,
    clicsWhatsapp: 0,
    clicsTour360: 0,
    clicsMapaInteractivo: 0,
    clicsMeInteresa: 0,
    clicsApartar: 0,
  },
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible cargar las estadísticas.';

function Card({ label, value, hint, tone = 'default' }) {
  return (
    <article className={`admin-estadisticas-card is-${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {hint ? <small>{hint}</small> : null}
    </article>
  );
}

function Section({ title, children, note }) {
  return (
    <section className="admin-estadisticas-section">
      <div className="admin-estadisticas-section-head">
        <div>
          <h2>{title}</h2>
          {note ? <p>{note}</p> : null}
        </div>
      </div>
      <div className="admin-estadisticas-grid">
        {children}
      </div>
    </section>
  );
}

export default function AdminEstadisticasPage() {
  const { cargando, esAdminCn } = useAuthSession();
  const [dashboard, setDashboard] = useState(DASHBOARD_INICIAL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorConversion, setErrorConversion] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    const cargar = async () => {
      setLoading(true);
      setError('');
      setErrorConversion('');

      try {
        const [data, eventosResumen] = await Promise.all([
          obtenerDashboardAdmin({ signal: controller.signal }),
          obtenerResumenEventosConversion({}, { signal: controller.signal }).catch((err) => {
            if (err.name !== 'AbortError') {
              setErrorConversion('No se pudieron cargar las métricas de interacción.');
            }
            return null;
          }),
        ]);
        setDashboard({
          ...DASHBOARD_INICIAL,
          ...data,
          resumen: { ...DASHBOARD_INICIAL.resumen, ...(data?.resumen || {}) },
          analitica: {
            ...DASHBOARD_INICIAL.analitica,
            ...(data?.analitica || {}),
            ...(eventosResumen ? {
              vistasLanding: eventosResumen.vistasLanding,
              clicsWhatsapp: eventosResumen.whatsapp,
              clicsTour360: eventosResumen.tour360,
              clicsMapaInteractivo: eventosResumen.mapaInteractivo,
              clicsMeInteresa: eventosResumen.meInteresa,
              clicsApartar: eventosResumen.apartar,
            } : {}),
          },
        });
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

    cargar();
    return () => controller.abort();
  }, []);

  const preparadoParaTracking = useMemo(() => [
    { label: 'Vistas landing', value: dashboard.analitica.vistasLanding, hint: 'Eventos registrados en CN' },
    { label: 'WhatsApp', value: dashboard.analitica.clicsWhatsapp, hint: 'Eventos registrados en CN' },
    { label: 'Tour 360', value: dashboard.analitica.clicsTour360, hint: 'Eventos registrados en CN' },
    { label: 'Mapa interactivo', value: dashboard.analitica.clicsMapaInteractivo, hint: 'Eventos registrados en CN' },
    { label: 'Me interesa', value: dashboard.analitica.clicsMeInteresa, hint: 'Eventos registrados en CN' },
    { label: 'Apartar', value: dashboard.analitica.clicsApartar, hint: 'Eventos registrados en CN' },
  ], [dashboard.analitica]);

  if (!cargando && !esAdminCn) {
    return (
      <main className="admin-estadisticas">
        <section className="admin-estadisticas-empty">
          <h1>No tienes permiso para acceder a esta sección.</h1>
          <Link to="/admin/proyectos-inmobiliarios">Ir a proyectos inmobiliarios</Link>
        </section>
      </main>
    );
  }

  if (cargando) {
    return (
      <main className="admin-estadisticas">
        <p className="admin-estadisticas-feedback">Cargando acceso al panel...</p>
      </main>
    );
  }

  return (
    <main className="admin-estadisticas">
      <section className="admin-estadisticas-hero">
        <div>
          <p className="admin-estadisticas-eyebrow">Analítica</p>
          <h1>Estadísticas</h1>
          <p>Resumen comercial y espacio preparado para la medición de interacciones.</p>
        </div>
        <div className="admin-estadisticas-actions">
          <Link to="/admin/dashboard">Volver al dashboard</Link>
          <Link to="/admin/prospectos">Ver prospectos</Link>
        </div>
      </section>

      {loading ? <p className="admin-estadisticas-feedback">Cargando estadísticas...</p> : null}
      {error ? <p className="admin-estadisticas-feedback is-error">{error}</p> : null}
      {errorConversion ? <p className="admin-estadisticas-feedback is-error">{errorConversion}</p> : null}

      {!loading && !error ? (
        <>
          <Section title="Resumen comercial" note="Si el API aun no devuelve algun dato, se muestra 0.">
            <Card label="Total de inmuebles" value={dashboard.resumen.totalInmuebles} />
            <Card label="Inmuebles activos" value={dashboard.resumen.inmueblesActivos} />
            <Card label="Inmuebles pendientes" value={dashboard.resumen.inmueblesPendientes} />
            <Card label="Total de desarrollos" value={dashboard.resumen.totalDesarrollos} />
            <Card label="Total de prospectos" value={dashboard.resumen.totalProspectos} />
            <Card label="Prospectos nuevos" value={dashboard.resumen.prospectosNuevos} />
            <Card label="Unidades disponibles" value={dashboard.resumen.unidadesDisponibles} />
            <Card label="Unidades apartadas" value={dashboard.resumen.unidadesApartadas} />
          </Section>

          <Section
            title="Interacción y conversión"
            note="Eventos registrados en CN desde el sitio público."
          >
            {preparadoParaTracking.map((item) => (
              <Card key={item.label} label={item.label} value={item.value ?? 0} hint={item.hint} tone="accent" />
            ))}
          </Section>
        </>
      ) : null}
    </main>
  );
}
