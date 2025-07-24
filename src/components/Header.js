// src/components/Header.js
import React from 'react';
import './Header.css';

export default function Header() {
  return (
    <header className="header">
      <div className="logo">CN</div>
      <nav className='nav'>
        <a href="/">Inicio</a>
        <a href="/propiedades">Propiedades</a>
        <a href="/nosotros">Nosotros</a>
        <a href="/contacto">Contacto</a>
      </nav>
    </header>
  );
}