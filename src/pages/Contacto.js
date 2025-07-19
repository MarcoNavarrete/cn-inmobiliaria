// src/pages/Contacto.js
import React from 'react';

export default function Contacto() {
  return (
    <section className="contacto">
      <h2>Contáctanos</h2>
      <p>📍 Calle Tulipanes #23, Col. Centro, Pachuca, Hidalgo</p>
      <p>📞 (771) 123 4567 | 📱 WhatsApp: 7711234567</p>
      <iframe
        src="https://www.google.com/maps/embed?pb=..."
        width="100%"
        height="300"
        style={{ border: 0 }}
        allowFullScreen=""
        loading="lazy"
      ></iframe>
    </section>
  );
}