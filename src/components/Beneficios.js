// src/components/Beneficios.js
import React from 'react';
import './Beneficios.css';

export default function Beneficios() {
  return (
    <section className="beneficios" data-aos="fade-right" data-aos-delay="200">
      <h2>¿Por qué elegir CN INMOBILIARIA?</h2>
      <div className="beneficio-lista">
        <div className="beneficio">
          <h3>🔒 Confianza</h3>
          <p>Nuestra experiencia te brindará seguridad en cada proceso.</p>
        </div>
        <div className="beneficio">
          <h3>🤝 Atención personalizada</h3>
          <p>Te acompañamos desde el primer clic hasta que recibes las llaves de tu nuevo hogar.</p>
        </div>
        <div className="beneficio">
          <h3>💡 Tecnología innovadora</h3>
          <p>Explora propiedades con visitas virtuales interactivas desde cualquier lugar.</p>
        </div>
      </div>
    </section>
  );
}