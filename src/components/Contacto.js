import React from 'react';
import './Contacto.css';

const whatsappNumber = '5215540859798';
const phoneNumber = '7717581695';
const mapsUrl = 'https://www.google.com/maps?q=Calle%20Mariano%20Abasolo%2023%20Centro%20Pachuca%20Hidalgo&output=embed';
const mapsLink = 'https://www.google.com/maps/search/?api=1&query=Calle%20Mariano%20Abasolo%2023%20Centro%20Pachuca%20Hidalgo';

export default function Contacto() {
  return (
    <section id="contacto" className="contacto" data-aos="fade-up" data-aos-duration="1200">
      <div className="contacto-shell">
        <div className="contacto-head">
          <p>Contactanos</p>
          <h2>Agenda una asesoria para encontrar tu siguiente propiedad</h2>
        </div>

        <div className="contacto-contenido">
          <div className="info">
            <div className="info-item">
              <span>Oficina</span>
              <strong>Calle Mariano Abasolo #23, Col. Centro, Pachuca, Hidalgo</strong>
            </div>
            <div className="info-item">
              <span>Telefono</span>
              <strong>(771) 758 1695</strong>
            </div>
            <div className="info-item">
              <span>WhatsApp</span>
              <strong>55 4085 9798</strong>
            </div>
            <div className="info-item">
              <span>Correo</span>
              <strong>Correo por confirmar</strong>
            </div>
            <div className="info-item">
              <span>Horario</span>
              <strong>Lunes a viernes - 9:00 a.m. a 6:00 p.m.</strong>
            </div>

            <div className="contacto-acciones">
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">Enviar WhatsApp</a>
              <a href={`tel:${phoneNumber}`}>Llamar</a>
              <a href={mapsLink} target="_blank" rel="noopener noreferrer">Ver ubicacion</a>
            </div>
          </div>

          <div className="mapa">
            <iframe
              title="Mapa de ubicacion de CN Inmobiliaria"
              src={mapsUrl}
              width="100%"
              height="420"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
