import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { guardarToken, register } from '../services/authService';
import './LoginPage.css';

const FORM_INICIAL = {
  nombre: '',
  email: '',
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
  const [error, setError] = useState('');
  const [exito, setExito] = useState('');

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

    setCargando(true);

    try {
      const data = await register(form.nombre.trim(), form.email.trim(), form.password);
      const token = extractToken(data);

      if (token) {
        guardarToken(token);
        navigate(destino, { replace: true });
        return;
      }

      setExito('Cuenta registrada correctamente. Ahora puedes iniciar sesion.');
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
            <span>Password</span>
            <input
              type="password"
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
            <input
              type="password"
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
          ¿Ya tienes cuenta? <Link to="/login" state={{ from }}>Inicia sesion</Link>
        </p>
      </section>
    </main>
  );
}
