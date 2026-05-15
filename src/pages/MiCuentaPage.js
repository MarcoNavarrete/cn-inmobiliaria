import React, { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { cambiarPassword, cerrarSesion, obtenerToken } from '../services/authService';
import useAuthSession from '../hooks/useAuthSession';
import './MiCuentaPage.css';

export default function MiCuentaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = obtenerToken();
  const { usuario, esAdminCn, tieneAccesoEmpresarial, rolGlobal, cargando } = useAuthSession();
  const puedeVerPanel = esAdminCn || tieneAccesoEmpresarial;
  const esPanelEmpresa = String(rolGlobal || '').toUpperCase() === 'USUARIO' && tieneAccesoEmpresarial;
  const [formPassword, setFormPassword] = useState({
    passwordActual: '',
    passwordNueva: '',
    confirmarPasswordNueva: '',
  });
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMensaje, setPasswordMensaje] = useState('');

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (cargando && !usuario) {
    return (
      <main className="mi-cuenta-page">
        <section className="mi-cuenta-card">
          <p>Cargando cuenta...</p>
        </section>
      </main>
    );
  }

  const salir = () => {
    cerrarSesion();
    navigate('/', { replace: true });
  };

  const actualizarCampoPassword = (event) => {
    const { name, value } = event.target;
    setFormPassword((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const validarPassword = () => {
    if (!formPassword.passwordActual.trim()) return 'La contraseña actual es requerida.';
    if (!formPassword.passwordNueva.trim()) return 'La nueva contraseña es requerida.';
    if (!formPassword.confirmarPasswordNueva.trim()) return 'Confirma la nueva contraseña.';
    if (formPassword.passwordNueva.length < 8) return 'La nueva contraseña debe tener al menos 8 caracteres.';
    if (formPassword.passwordNueva !== formPassword.confirmarPasswordNueva) return 'La nueva contraseña y la confirmacion no coinciden.';
    if (formPassword.passwordNueva === formPassword.passwordActual) return 'La nueva contraseña debe ser diferente a la actual.';
    return '';
  };

  const limpiarFormularioPassword = () => {
    setFormPassword({
      passwordActual: '',
      passwordNueva: '',
      confirmarPasswordNueva: '',
    });
  };

  const guardarPassword = async (event) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordMensaje('');

    const validacion = validarPassword();
    if (validacion) {
      setPasswordError(validacion);
      return;
    }

    setCambiandoPassword(true);

    try {
      await cambiarPassword(formPassword);
      limpiarFormularioPassword();
      setPasswordMensaje('Contraseña actualizada correctamente.');
    } catch (err) {
      const mensaje = err.data?.mensaje || err.data?.message || err.message || 'No fue posible actualizar la contraseña.';
      setPasswordError(mensaje);
    } finally {
      setCambiandoPassword(false);
    }
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
        <Link to="/mis-solicitudes">
          <strong>Mis solicitudes</strong>
          <span>Consulta el seguimiento de tus solicitudes.</span>
        </Link>
        <Link to="/cliente/mis-busquedas">
          <strong>Mis busquedas</strong>
          <span>Administra los filtros que guardaste.</span>
        </Link>
        <Link to="/cliente/mis-alertas">
          <strong>Mis alertas</strong>
          <span>Revisa coincidencias nuevas de tus busquedas.</span>
        </Link>
        <Link to="/propiedades">
          <strong>Ver propiedades</strong>
          <span>Explora inmuebles publicados.</span>
        </Link>
        {puedeVerPanel ? (
          <Link to={esPanelEmpresa ? '/admin/proyectos-inmobiliarios' : '/admin'}>
            <strong>{esPanelEmpresa ? 'Panel de empresa' : 'Panel administrativo'}</strong>
            <span>{esPanelEmpresa ? 'Acceso a los proyectos de tu empresa.' : 'Gestiona tus herramientas internas.'}</span>
          </Link>
        ) : null}
        <button type="button" onClick={salir}>
          <strong>Cerrar sesion</strong>
          <span>Salir de tu cuenta en este dispositivo.</span>
        </button>
      </section>

      <section className="mi-cuenta-password-card" id="cambiar-password">
        <div className="mi-cuenta-password-head">
          <div>
            <p>Cambiar contraseña</p>
            <h2>Actualiza tu acceso</h2>
          </div>
        </div>

        {passwordMensaje ? <p className="mi-cuenta-feedback is-ok">{passwordMensaje}</p> : null}
        {passwordError ? <p className="mi-cuenta-feedback is-error">{passwordError}</p> : null}

        <form className="mi-cuenta-password-form" onSubmit={guardarPassword}>
          <label>
            <span>Contraseña actual</span>
            <input
              type="password"
              name="passwordActual"
              value={formPassword.passwordActual}
              onChange={actualizarCampoPassword}
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            <span>Nueva contraseña</span>
            <input
              type="password"
              name="passwordNueva"
              value={formPassword.passwordNueva}
              onChange={actualizarCampoPassword}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            <span>Confirmar nueva contraseña</span>
            <input
              type="password"
              name="confirmarPasswordNueva"
              value={formPassword.confirmarPasswordNueva}
              onChange={actualizarCampoPassword}
              autoComplete="new-password"
              required
            />
          </label>
          <div className="mi-cuenta-password-actions">
            <button type="submit" disabled={cambiandoPassword}>
              {cambiandoPassword ? 'Actualizando...' : 'Cambiar contraseña'}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
