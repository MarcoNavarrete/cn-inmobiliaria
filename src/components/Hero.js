// src/components/Hero.js
import React from 'react';
import './Hero.css';

export default function Hero() {
  return (
    <section className="hero" data-aos="fade-up" data-aos-duration="1200">
      <div className="hero-overlay">
        <h1>Encuentra tu hogar ideal</h1>
        <p>Propiedades seleccionadas para ti con confianza y estilo</p>
        <a href="/propiedades" className="hero-btn">Explorar propiedades</a>
      </div>
    </section>
  );
}