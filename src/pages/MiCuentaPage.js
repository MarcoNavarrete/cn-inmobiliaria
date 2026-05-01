import React from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { cerrarSesion, getCurrentUser, obtenerToken } from '../services/authService';
import './MiCuentaPage.css';

const ROLES_PANEL = ['ASESOR', 'SUPERVISOR', 'ADMIN', 'SUPERADMIN'];

export default function MiCuentaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const usuario = getCurrentUser();
  const token = obtenerToken();
  const puedeVerPanel = ROLES_PANEL.includes(String(usuario?.rol || '').toUpperCase());

  if (!token || !usuario) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const salir = () => {
    cerrarSesion();
    navigate('/', { replace: true });
  };

  return (
    <main className="mi-cuenta-page">
      <section className="mi-cuenta-hero">
        <p>Cuenta</p>
        <h1>Mi cuenta</h1>
      </section>

      <section className="mi-cuenta-card">
        <div className="mi-cuenta-avatar" aria-hidden="true">
          {(usuario.nombre || usuario.email || 'U').slice(0, 1).toUpperCase()}
        </div>
        <div className="mi-cuenta-info">
          <h2>{usuario.nombre || 'Usuario'}</h2>
          {usuario.email ? <p>{usuario.email}</p> : null}
          {usuario.rol ? <span>{usuario.rol}</span> : null}
        </div>
      </section>

      <section className="mi-cuenta-grid" aria-label="Accesos rapidos">
        <Link to="/favoritos">
          <strong>Mis favoritos</strong>
          <span>Revisa las propiedades que guardaste.</span>
        </Link>
        <Link to="/propiedades">
          <strong>Ver propiedades</strong>
          <span>Explora inmuebles publicados.</span>
        </Link>
        {puedeVerPanel ? (
          <Link to="/admin">
            <strong>Panel administrativo</strong>
            <span>Gestiona tus herramientas internas.</span>
          </Link>
        ) : null}
        <button type="button" onClick={salir}>
          <strong>Cerrar sesion</strong>
          <span>Salir de tu cuenta en este dispositivo.</span>
        </button>
      </section>
    </main>
  );
}
