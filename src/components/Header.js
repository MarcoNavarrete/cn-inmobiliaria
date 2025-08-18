// src/components/Header.js
import React, { useState } from 'react';
import './Header.css';
import './Logo.css';
import { Link } from 'react-router-dom';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  
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
      </nav>

    </header>
  );
}