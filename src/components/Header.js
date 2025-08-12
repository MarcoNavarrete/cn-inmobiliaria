// src/components/Header.js
import React from 'react';
import './Header.css';
import './Logo.css';
import { Link } from 'react-router-dom';

export default function Header() {
  return (
    <header className="header">
      <div className="logo">
        <Link to="/">
          <img src="./assets/logo.png" alt="CN Inmobiliaria" width="300px" />
        </Link>
      </div>

      <nav className='nav'>

        <Link to="/">Inicio</Link>
        <Link to="/propiedades">Propiedades</Link>
        <Link to="/nosotros">Nosotros</Link>
        <Link to="/contacto">Contacto</Link>
      </nav>
    </header>
  );
}