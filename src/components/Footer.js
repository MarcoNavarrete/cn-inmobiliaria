import React from 'react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="footer-contenido">
        <div>
          <strong>CN Inmobiliaria</strong>
          <p>Asesoria inmobiliaria moderna para comprar, vender e invertir con confianza.</p>
        </div>
        <nav aria-label="Enlaces de pie de pagina">
          <a href="#/">Inicio</a>
          <a href="#/propiedades">Propiedades</a>
          <a href="#/desarrollos">Desarrollos</a>
          <a href="#/proyectos-inmobiliarios">Proyectos inmobiliarios</a>
          <a href="#/contacto">Contacto</a>
        </nav>
      </div>
      <p className="footer-copy">CN Inmobiliaria - Todos los derechos reservados - 2026</p>
    </footer>
  );
}
