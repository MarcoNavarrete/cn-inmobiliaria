// src/components/Header.js
import React, { useEffect, useRef, useState } from 'react';
import './Header.css';
import './Logo.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cerrarSesion } from '../services/authService';
import useAuthSession from '../hooks/useAuthSession';

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const cuentaRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [cuentaOpen, setCuentaOpen] = useState(false);
  const { usuario, cargando, esAdminCn, tieneAccesoEmpresarial, rolGlobal } = useAuthSession();
  const puedeVerPanel = esAdminCn || tieneAccesoEmpresarial;
  const esPanelEmpresa = String(rolGlobal || '').toUpperCase() === 'USUARIO' && tieneAccesoEmpresarial;
  const usuarioLabel = usuario?.nombre || usuario?.email || 'Usuario';

  useEffect(() => {
    setMenuOpen(false);
    setCuentaOpen(false);
  }, [location.pathname]);

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
      {puedeVerPanel ? (
        <Link to={esPanelEmpresa ? '/admin/proyectos-inmobiliarios' : '/admin'} onClick={cerrarMenus}>
          {esPanelEmpresa ? 'Panel de empresa' : 'Panel'}
        </Link>
      ) : null}
      <button type="button" className="nav-button" onClick={salir}>Cerrar sesion</button>
    </>
  );

  return (
    <header className={`header ${location.pathname === '/' ? 'is-home' : 'is-solid'}`}>
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
        <Link to="/proyectos-inmobiliarios" onClick={cerrarMenus}>Proyectos inmobiliarios</Link>

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
        ) : cargando ? (
          <span className="nav-user" title="Cargando cuenta">Cargando...</span>
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
