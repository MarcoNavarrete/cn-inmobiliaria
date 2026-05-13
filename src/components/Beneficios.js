import React from 'react';
import './Beneficios.css';

export default function Beneficios() {
  return (
    <section className="beneficios" data-aos="fade-right" data-aos-delay="200">
      <div className="beneficios-head">
        <p>Por que CN</p>
        <h2>Asesoria inmobiliaria con criterio, tecnologia y acompanamiento real</h2>
      </div>
      <div className="beneficio-lista">
        <article className="beneficio">
          <span>01</span>
          <h3>Confianza patrimonial</h3>
          <p>Revisamos cada oportunidad con enfoque profesional para que tomes decisiones claras.</p>
        </article>
        <article className="beneficio">
          <span>02</span>
          <h3>Atencion personalizada</h3>
          <p>Te acompanamos desde la primera busqueda hasta la negociacion y cierre.</p>
        </article>
        <article className="beneficio">
          <span>03</span>
          <h3>Experiencia digital</h3>
          <p>Integramos recorridos, imagenes y herramientas para evaluar propiedades con mayor detalle.</p>
        </article>
      </div>
    </section>
  );
}
