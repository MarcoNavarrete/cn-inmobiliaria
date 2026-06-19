import React, { useEffect, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import TelefonoConPaisInput, {
  getPaisTelefonoDefaultId,
  ordenarPaisesTelefono,
} from '../components/common/TelefonoConPaisInput';
import PasswordInput from '../components/common/PasswordInput';
import { actualizarPerfil, cambiarPassword, cerrarSesion, obtenerToken } from '../services/authService';
import { getCodigosNumeroPaises } from '../services/catalogosService';
import useAuthSession from '../hooks/useAuthSession';
import './MiCuentaPage.css';

const PERFIL_INICIAL = {
  nombre: '',
  apellidos: '',
  telefono: '',
  codigoNumeroPaisId: '',
  direccion: '',
};

const getTelefonoLocalFallback = (usuario) => {
  const telefonoLocal = String(usuario?.telefonoLocal || '').trim();
  if (telefonoLocal) return telefonoLocal;

  const telefono = String(usuario?.telefono || '').trim();
  const marcacion = String(usuario?.codigoMarcacion || '').replace(/\D/g, '');
  const digits = telefono.replace(/\D/g, '');

  if (digits && marcacion && digits.startsWith(marcacion) && digits.length > marcacion.length) {
    return digits.slice(marcacion.length);
  }

  if (digits.length === 12 && digits.startsWith('52')) {
    return digits.slice(2);
  }

  return telefono;
};

export default function MiCuentaPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = obtenerToken();
  const { usuario, esAdminCn, tieneAccesoEmpresarial, rolGlobal, cargando, recargarSesion } = useAuthSession();
  const puedeVerPanel = esAdminCn || tieneAccesoEmpresarial;
  const esPanelEmpresa = String(rolGlobal || '').toUpperCase() === 'USUARIO' && tieneAccesoEmpresarial;
  const [formPerfil, setFormPerfil] = useState(PERFIL_INICIAL);
  const [paisesTelefono, setPaisesTelefono] = useState([]);
  const [cargandoPaises, setCargandoPaises] = useState(false);
  const [guardandoPerfil, setGuardandoPerfil] = useState(false);
  const [perfilError, setPerfilError] = useState('');
  const [perfilMensaje, setPerfilMensaje] = useState('');
  const [formPassword, setFormPassword] = useState({
    passwordActual: '',
    passwordNueva: '',
    confirmarPasswordNueva: '',
  });
  const [cambiandoPassword, setCambiandoPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordMensaje, setPasswordMensaje] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setCargandoPaises(true);

    getCodigosNumeroPaises({ signal: controller.signal })
      .then((paises) => {
        const ordenados = ordenarPaisesTelefono(paises);
        setPaisesTelefono(ordenados);
        setFormPerfil((actual) => ({
          ...actual,
          codigoNumeroPaisId: actual.codigoNumeroPaisId || getPaisTelefonoDefaultId(ordenados),
        }));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setPerfilError('No se pudo cargar el catalogo de paises. Puedes seguir editando el resto de tus datos.');
        }
      })
      .finally(() => setCargandoPaises(false));

    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!usuario) return;

    setFormPerfil({
      nombre: usuario.nombre || '',
      apellidos: usuario.apellidos || '',
      telefono: getTelefonoLocalFallback(usuario),
      codigoNumeroPaisId: String(usuario.codigoNumeroPaisId || '') || getPaisTelefonoDefaultId(paisesTelefono),
      direccion: usuario.direccion || '',
    });
  }, [paisesTelefono, usuario]);

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

  const actualizarCampoPerfil = (event) => {
    const { name, value } = event.target;
    setFormPerfil((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const validarPerfil = () => {
    if (!formPerfil.nombre.trim()) return 'El nombre es requerido.';
    if (formPerfil.nombre.trim().length > 100) return 'El nombre no debe exceder 100 caracteres.';
    if (formPerfil.apellidos.trim().length > 150) return 'Los apellidos no deben exceder 150 caracteres.';
    if (formPerfil.telefono.trim().length > 20) return 'El telefono no debe exceder 20 caracteres.';
    if (formPerfil.telefono.trim() && paisesTelefono.length > 0 && !formPerfil.codigoNumeroPaisId) return 'Selecciona el pais/lada del telefono.';
    if (formPerfil.direccion.trim().length > 300) return 'La direccion no debe exceder 300 caracteres.';
    return '';
  };

  const guardarPerfil = async (event) => {
    event.preventDefault();
    setPerfilError('');
    setPerfilMensaje('');

    const validacion = validarPerfil();
    if (validacion) {
      setPerfilError(validacion);
      return;
    }

    setGuardandoPerfil(true);

    try {
      await actualizarPerfil({
        nombre: formPerfil.nombre.trim(),
        apellidos: formPerfil.apellidos.trim(),
        telefono: formPerfil.telefono.trim(),
        codigoNumeroPaisId: formPerfil.codigoNumeroPaisId || null,
        direccion: formPerfil.direccion.trim(),
      });
      await recargarSesion({ forceRefresh: true });
      setPerfilMensaje('Perfil actualizado correctamente.');
    } catch (err) {
      const mensaje = err.data?.mensaje || err.data?.message || err.message || 'No fue posible actualizar el perfil.';
      setPerfilError(mensaje);
    } finally {
      setGuardandoPerfil(false);
    }
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

      <section className="mi-cuenta-password-card" id="datos-personales">
        <div className="mi-cuenta-password-head">
          <div>
            <p>Datos personales</p>
            <h2>Actualiza tu informacion</h2>
          </div>
        </div>

        {perfilMensaje ? <p className="mi-cuenta-feedback is-ok">{perfilMensaje}</p> : null}
        {perfilError ? <p className="mi-cuenta-feedback is-error">{perfilError}</p> : null}

        <form className="mi-cuenta-password-form mi-cuenta-profile-form" onSubmit={guardarPerfil}>
          <label>
            <span>Nombre</span>
            <input
              type="text"
              name="nombre"
              value={formPerfil.nombre}
              onChange={actualizarCampoPerfil}
              maxLength={100}
              required
              disabled={guardandoPerfil}
            />
          </label>
          <label>
            <span>Apellidos</span>
            <input
              type="text"
              name="apellidos"
              value={formPerfil.apellidos}
              onChange={actualizarCampoPerfil}
              maxLength={150}
              disabled={guardandoPerfil}
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              value={usuario.email || ''}
              readOnly
              disabled
            />
          </label>
          <label>
            <span>Telefono</span>
            <TelefonoConPaisInput
              paises={paisesTelefono}
              codigoNumeroPaisId={formPerfil.codigoNumeroPaisId}
              telefono={formPerfil.telefono}
              onChangePais={actualizarCampoPerfil}
              onChangeTelefono={actualizarCampoPerfil}
              disabled={guardandoPerfil || cargandoPaises}
            />
          </label>
          <label className="is-full">
            <span>Direccion</span>
            <textarea
              name="direccion"
              value={formPerfil.direccion}
              onChange={actualizarCampoPerfil}
              maxLength={300}
              rows="3"
              disabled={guardandoPerfil}
            />
          </label>
          <div className="mi-cuenta-password-actions is-full">
            <button type="submit" disabled={guardandoPerfil}>
              {guardandoPerfil ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
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
            <PasswordInput
              name="passwordActual"
              value={formPassword.passwordActual}
              onChange={actualizarCampoPassword}
              autoComplete="current-password"
              required
            />
          </label>
          <label>
            <span>Nueva contraseña</span>
            <PasswordInput
              name="passwordNueva"
              value={formPassword.passwordNueva}
              onChange={actualizarCampoPassword}
              autoComplete="new-password"
              required
            />
          </label>
          <label>
            <span>Confirmar nueva contraseña</span>
            <PasswordInput
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
