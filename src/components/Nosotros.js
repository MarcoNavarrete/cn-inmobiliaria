import React from 'react';
import './Nosotros.css';

export default function Nosotros() {
  return (
    <section className="nosotros" data-aos="fade-up" data-aos-duration="1200">
      <div className="nosotros-contenido">
        <div className="texto">
          <p className="nosotros-eyebrow">Conoce CN Inmobiliaria</p>
          <h2>Un equipo enfocado en proteger tu decision inmobiliaria</h2>
          <p>
            En CN Inmobiliaria entendemos que comprar o vender una propiedad es una decision patrimonial importante.
          </p>
          <p>
            Por eso combinamos asesoria personalizada, procesos claros y herramientas digitales para ayudarte a evaluar cada oportunidad con confianza.
          </p>
        </div>
        <div className="imagen">
          <img src="./assets/equipo.png" alt="Equipo CN Inmobiliaria" />
        </div>
      </div>
    </section>
  );
}
