// src/components/Header.js
import React, { useEffect, useState } from 'react';
import './Header.css';
import './Logo.css';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cerrarSesion, getCurrentUser } from '../services/authService';

const ROLES_PANEL = ['ASESOR', 'SUPERVISOR', 'ADMIN', 'SUPERADMIN'];

export default function Header() {
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [usuario, setUsuario] = useState(() => getCurrentUser());
  const puedeVerPanel = ROLES_PANEL.includes(String(usuario?.rol || '').toUpperCase());

  useEffect(() => {
    setUsuario(getCurrentUser());
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

  const salir = () => {
    cerrarSesion();
    setMenuOpen(false);
    navigate('/');
  };
  
  return (
    <header className="header">
      <div className="logo">
        <Link to="/">
          <img src="./assets/logo.png" alt="CN Inmobiliaria" />
        </Link>
      </div>

      <button
        className="hamburger"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menú"
      >
        ☰
      </button>

      <nav className={`nav ${menuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMenuOpen(false)}>Inicio</Link>
        <Link to="/propiedades" onClick={() => setMenuOpen(false)}>Propiedades</Link>
        <Link to="/nosotros" onClick={() => setMenuOpen(false)}>Nosotros</Link>
        <Link to="/contacto" onClick={() => setMenuOpen(false)}>Contacto</Link>
        {usuario ? (
          <>
            <span className="nav-user">{usuario.nombre || usuario.email}</span>
            <Link to="/mi-cuenta" onClick={() => setMenuOpen(false)}>Mi cuenta</Link>
            <Link to="/favoritos" onClick={() => setMenuOpen(false)}>Mis favoritos</Link>
            {puedeVerPanel ? <Link to="/admin" onClick={() => setMenuOpen(false)}>Panel</Link> : null}
            <button type="button" className="nav-button" onClick={salir}>Cerrar sesion</button>
          </>
        ) : (
          <Link to="/login" onClick={() => setMenuOpen(false)}>Iniciar sesion</Link>
        )}
      </nav>

    </header>
  );
}
