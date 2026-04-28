import React, { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { login, obtenerToken } from '../services/authService';
import './LoginPage.css';

const FORM_INICIAL = {
  email: '',
  password: '',
};

const getApiErrorMessage = (err) =>
  err.data?.mensaje || err.data?.message || err.message || 'No fue posible iniciar sesion.';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState(FORM_INICIAL);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');

  const destino = location.state?.from?.pathname || '/admin';

  if (obtenerToken()) {
    return <Navigate to={destino} replace />;
  }

  const actualizarCampo = (event) => {
    const { name, value } = event.target;
    setForm((actual) => ({
      ...actual,
      [name]: value,
    }));
  };

  const enviar = async (event) => {
    event.preventDefault();
    setCargando(true);
    setError('');

    try {
      await login({
        email: form.email.trim(),
        password: form.password,
      });
      navigate(destino, { replace: true });
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCargando(false);
    }
  };

  return (
    <main className="login-page">
      <section className="login-card">
        <p className="login-eyebrow">Administracion</p>
        <h1>Iniciar sesion</h1>
        <form className="login-form" onSubmit={enviar}>
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
              autoComplete="current-password"
              required
              disabled={cargando}
            />
          </label>
          {error ? <p className="login-error">{error}</p> : null}
          <button type="submit" disabled={cargando}>
            {cargando ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </section>
    </main>
  );
}
