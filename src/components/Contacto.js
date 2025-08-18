// src/components/Contacto.js
import React from 'react';
import './Contacto.css';

export default function Contacto() {
  return (
    <section className="contacto" data-aos="fade-up" data-aos-duration="1200">
      <h2>Contáctanos</h2>
      <div className="contacto-contenido">
        <div className="info">
          <p><strong>📍 Dirección:</strong> Calle Mariano Abasolo #23, Col. Centro, Pachuca, Hidalgo</p>
          <p><strong>📞 Teléfono:</strong> (771) 7581695</p>
          <p><strong>📱 WhatsApp:</strong> 55 4085 9798</p>
          <p><strong>🕒 Horario:</strong> Lunes a viernes · 9:00am – 6:00pm</p>
        </div>
        <div className="mapa">
          <iframe src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d3746.18688934441!2d-98.74338322476767!3d20.12624928130677!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMjDCsDA3JzM0LjUiTiA5OMKwNDQnMjYuOSJX!5e0!3m2!1ses!2smx!4v1753320075276!5m2!1ses!2smx" 
          width="100%" 
          height="450"
          style={{ border: 0 }} 
          allowfullscreen="" 
          loading="lazy" 
          referrerpolicy="no-referrer-when-downgrade">
            <p>Mapa de ubicación de CN INMOBILIARIA</p>

          </iframe>
        </div>
      </div>
    </section>
  );
}
