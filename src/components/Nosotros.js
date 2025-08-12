// src/components/Nosotros.js
import React from 'react';
import './Nosotros.css';

export default function Nosotros() {
  return (
    <section className="nosotros" data-aos="fade-up" data-aos-duration="1200">
      <h2>Conoce CN INMOBILIARIA</h2>
      <div className="nosotros-contenido">
        <div className="texto">
          <p>
            En CN INMOBILIARIA creemos que tu hogar es más que una propiedad — es el lugar donde comienzan tus mejores historias.
          </p>
          <p>
            Con más de una década de experiencia, ofrecemos asesoría personalizada, procesos transparentes y tecnología moderna para ayudarte a encontrar el lugar perfecto.
          </p>
          <p>
            Nuestro compromiso está en cada detalle. Sabemos que comprar o vender una propiedad es una gran decisión, por eso te acompañamos en cada paso con empatía, confianza y profesionalismo.
          </p>
        </div>
        <div className="imagen">
          <img src="./assets/equipo.jpg" alt="Equipo CN INMOBILIARIA" />
        </div>
      </div>
    </section>
  );
}
