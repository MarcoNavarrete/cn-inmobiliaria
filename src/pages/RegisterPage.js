import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import TelefonoConPaisInput, {
  getPaisTelefonoDefaultId,
  ordenarPaisesTelefono,
} from '../components/common/TelefonoConPaisInput';
import PasswordInput from '../components/common/PasswordInput';
import { guardarToken, register } from '../services/authService';
import { getCodigosNumeroPaises } from '../services/catalogosService';
import './LoginPage.css';

const FORM_INICIAL = {
  nombre: '',
  email: '',
  telefono: '',
  codigoNumeroPaisId: '',
  password: '',
  confirmarPassword: '',
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible registrar la cuenta.';

const extractToken = (payload) => {
  if (typeof payload === 'string') {
    return payload;
  }

  return payload?.token || payload?.jwt || payload?.accessToken || '';
};

export default function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from;
  const destino = from ? `${from.pathname || '/'}${from.search || ''}` : '/';
  const [form, setForm] = useState(FORM_INICIAL);
  const [cargando, setCargando] = useState(false);
  const [paisesTelefono, setPaisesTelefono] = useState([]);
  const [cargandoPaises, setCargandoPaises] = useState(false);
  const [catalogoError, setCatalogoError] = useState('');
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setCargandoPaises(true);

    getCodigosNumeroPaises({ signal: controller.signal })
      .then((paises) => {
        const ordenados = ordenarPaisesTelefono(paises);
        setPaisesTelefono(ordenados);
        setForm((actual) => ({
          ...actual,
          codigoNumeroPaisId: actual.codigoNumeroPaisId || getPaisTelefonoDefaultId(ordenados),
        }));
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setCatalogoError('No se pudo cargar el catalogo de paises. Puedes registrar la cuenta sin lada por ahora.');
        }
      })
      .finally(() => setCargandoPaises(false));

    return () => controller.abort();
  }, []);

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const enviar = async (event) => {
    event.preventDefault();
    setError('');
    setExito('');

    if (form.password !== form.confirmarPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    if (form.telefono.trim().length > 20) {
      setError('El telefono no debe exceder 20 caracteres.');
      return;
    }

    if (form.telefono.trim() && paisesTelefono.length > 0 && !form.codigoNumeroPaisId) {
      setError('Selecciona el pais/lada del telefono.');
      return;
    }

    setCargando(true);

    try {
      const data = await register({
        nombre: form.nombre.trim(),
        email: form.email.trim(),
        password: form.password,
        telefono: form.telefono.trim(),
        codigoNumeroPaisId: form.codigoNumeroPaisId || null,
      });
      const token = extractToken(data);

      if (token) {
        guardarToken(token);
        navigate(destino, { replace: true });
        return;
      }

      setExito('Cuenta registrada correctamente. Ahora puedes iniciar sesión.');
      setTimeout(() => navigate('/login', { replace: true, state: { from } }), 900);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="login-eyebrow">Cuenta</p>
        <h1>Registrarse</h1>
        <form className="login-form" onSubmit={enviar}>
          <label>
            <span>Nombre</span>
            <input
              type="text"
              name="nombre"
              value={form.nombre}
              onChange={actualizarCampo}
              autoComplete="name"
              required
              disabled={cargando}
            />
          </label>
          <label>
            <span>Email</span>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={actualizarCampo}
              autoComplete="email"
              required
              disabled={cargando}
            />
          </label>
          <label>
            <span>Telefono</span>
            <TelefonoConPaisInput
              paises={paisesTelefono}
              codigoNumeroPaisId={form.codigoNumeroPaisId}
              telefono={form.telefono}
              onChangePais={actualizarCampo}
              onChangeTelefono={actualizarCampo}
              disabled={cargando || cargandoPaises}
            />
          </label>
          {catalogoError ? <p className="login-help">{catalogoError}</p> : null}
          <label>
            <span>Password</span>
            <PasswordInput
              name="password"
              value={form.password}
              onChange={actualizarCampo}
              autoComplete="new-password"
              required
              disabled={cargando}
            />
          </label>
          <label>
            <span>Confirmar password</span>
            <PasswordInput
              name="confirmarPassword"
              value={form.confirmarPassword}
              onChange={actualizarCampo}
              autoComplete="new-password"
              required
              disabled={cargando}
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          {exito ? <p className="login-success">{exito}</p> : null}
          <button type="submit" disabled={cargando}>
            {cargando ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>
        <p className="login-alt">
          ¿Ya tienes cuenta? <Link to="/login" state={{ from }}>Inicia sesión</Link>
        </p>
      </section>
    </main>
  );
}
