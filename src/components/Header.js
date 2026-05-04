// src/components/Header.js
import React, { useEffect, useRef, useState } from 'react';
import './Header.css';
import './Logo.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cerrarSesion, getCurrentUser } from '../services/authService';

const ROLES_PANEL = ['ASESOR', 'SUPERVISOR', 'ADMIN', 'SUPERADMIN'];

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const cuentaRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const [usuario, setUsuario] = useState(() => getCurrentUser());
  const puedeVerPanel = ROLES_PANEL.includes(String(usuario?.rol || '').toUpperCase());
  const usuarioLabel = usuario?.nombre || usuario?.email || 'Usuario';

  useEffect(() => {
    setUsuario(getCurrentUser());
    setMenuOpen(false);
    setCuentaOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const actualizarSesion = () => setUsuario(getCurrentUser());
    window.addEventListener('auth-change', actualizarSesion);
    window.addEventListener('storage', actualizarSesion);

    return () => {
      window.removeEventListener('auth-change', actualizarSesion);
      window.removeEventListener('storage', actualizarSesion);
    };
  }, []);

  useEffect(() => {
    const cerrarAlClickFuera = (event) => {
      if (cuentaRef.current && !cuentaRef.current.contains(event.target)) {
        setCuentaOpen(false);
      }
    };

    document.addEventListener('mousedown', cerrarAlClickFuera);

    return () => {
      document.removeEventListener('mousedown', cerrarAlClickFuera);
    };
  }, []);

  const cerrarMenus = () => {
    setMenuOpen(false);
    setCuentaOpen(false);
  };

  const salir = () => {
    cerrarSesion();
    cerrarMenus();
    navigate('/');
  };

  const cuentaLinks = (
    <>
      <Link to="/mi-cuenta" onClick={cerrarMenus}>Mi cuenta</Link>
      <Link to="/favoritos" onClick={cerrarMenus}>Mis favoritos</Link>
      <Link to="/mis-solicitudes" onClick={cerrarMenus}>Mis solicitudes</Link>
      <Link to="/cliente/mis-busquedas" onClick={cerrarMenus}>Mis busquedas</Link>
      <Link to="/cliente/mis-alertas" onClick={cerrarMenus}>Mis alertas</Link>
      {puedeVerPanel ? <Link to="/admin" onClick={cerrarMenus}>Panel</Link> : null}
      <button type="button" className="nav-button" onClick={salir}>Cerrar sesion</button>
    </>
  );

  return (
    <header className="header">
      <div className="logo">
        <Link to="/" onClick={cerrarMenus}>
          <img src="./assets/logo.png" alt="CN Inmobiliaria" />
        </Link>
      </div>

      <button
        className="hamburger"
        onClick={() => {
          setMenuOpen((open) => !open);
          setCuentaOpen(false);
        }}
        aria-label="Menu"
        aria-expanded={menuOpen}
      >
        Menu
      </button>

      <nav className={`nav ${menuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={cerrarMenus}>Inicio</Link>
        <Link to="/propiedades" onClick={cerrarMenus}>Propiedades</Link>
        <Link to="/desarrollos" onClick={cerrarMenus}>Desarrollos</Link>
        <Link to="/nosotros" onClick={cerrarMenus}>Nosotros</Link>
        <Link to="/contacto" onClick={cerrarMenus}>Contacto</Link>

        {usuario ? (
          <>
            <div className="account-menu" ref={cuentaRef}>
              <span className="nav-user" title={usuarioLabel}>{usuarioLabel}</span>
              <button
                type="button"
                className="account-toggle"
                onClick={() => setCuentaOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={cuentaOpen}
              >
                Mi cuenta
              </button>
              <div className={`account-dropdown ${cuentaOpen ? 'open' : ''}`} role="menu">
                {cuentaLinks}
              </div>
            </div>
            <div className="mobile-account-links">
              <span className="nav-user" title={usuarioLabel}>{usuarioLabel}</span>
              {cuentaLinks}
            </div>
          </>
        ) : (
          <div className="auth-links">
            <Link to="/login" onClick={cerrarMenus}>Iniciar sesion</Link>
            <Link to="/register" onClick={cerrarMenus}>Registrarse</Link>
          </div>
        )}
      </nav>
    </header>
  );
}
